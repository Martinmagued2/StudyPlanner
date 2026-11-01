import { Course, Assignment, Note, DocumentFile, Quiz, GitHubRepo } from '../types';
import { queryGemini, getGeminiApiKey } from './fileAiService';

export interface CourseAgentMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  citations?: string[];
  timestamp: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format course schedule into a human-readable string
 */
export function formatCourseSchedule(course: Course): string {
  if (!course.meetingSlots || course.meetingSlots.length === 0) {
    return 'No fixed schedule slots configured.';
  }
  return course.meetingSlots
    .map(s => `${DAY_NAMES[s.day] || 'Day ' + s.day} at ${s.startTime}–${s.endTime} (${s.type}, ${s.location || course.location || 'Campus'})`)
    .join('; ');
}

/**
 * Build rich system instruction for Gemini tailored specifically to this course
 */
export function buildCourseAgentSystemInstruction(
  course: Course,
  assignments: Assignment[],
  notes: Note[],
  files: DocumentFile[]
): string {
  const scheduleStr = formatCourseSchedule(course);

  // Summarize assignments
  const assignmentSummaries = assignments.length > 0
    ? assignments
        .map(a => `- "${a.title}" (Due: ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'TBD'}, Status: ${a.status}, Priority: ${a.priority || 'medium'}, Est: ${a.estimatedMinutes || 60}m)`)
        .join('\n')
    : 'No assignments registered yet.';

  // Summarize notes
  const noteSummaries = notes.length > 0
    ? notes
        .map(n => `- "${n.title}": ${n.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 250)}...`)
        .join('\n')
    : 'No notes written yet.';

  // Extract key excerpts from uploaded files (up to ~8000 characters total)
  let fileExcerpts = '';
  if (files.length > 0) {
    fileExcerpts = files
      .map(f => {
        const excerpt = f.rawText ? f.rawText.slice(0, 1500) : (f.summary || 'Uploaded file');
        return `### Document: ${f.name} (${f.pageCount || 1} pages/slides)\n${excerpt}\n`;
      })
      .join('\n');
  } else {
    fileExcerpts = 'No lecture slides or documents uploaded yet.';
  }

  return `You are the dedicated AI Course Study Agent and specialized university tutor for "${course.name}" (${course.code}).
Your primary goal is to help the student excel in this specific course.

=== COURSE PROFILE ===
- Name: ${course.name}
- Code: ${course.code}
- Instructor / Professor: ${course.instructor}
- Campus Location: ${course.location || 'Classroom'}
- Credit Hours: ${course.creditHours || 3}
- Term: ${course.term}
- Meeting Schedule: ${scheduleStr}
- Syllabus: ${course.syllabusUrl || 'Not provided'}

=== UPCOMING COURSEWORK & ASSIGNMENTS ===
${assignmentSummaries}

=== STUDENT'S RECENT COURSE NOTES ===
${noteSummaries}

=== INDEXED COURSE FILES & LECTURE SLIDES ===
${fileExcerpts}

=== CORE INSTRUCTIONS ===
1. Answer strictly as an authoritative, helpful, and academically rigorous tutor specialized in this course.
2. Ground your explanations directly in the student's actual lecture slides, uploaded files, and course notes whenever possible.
3. When referencing specific materials, cite the source clearly (e.g., "[Source: CS302_Lecture1.pptx • Slide 12]" or "[Source: Dynamic Programming Note]").
4. Format your output with clean, readable GitHub-flavored Markdown:
   - Use bolding for key terms and definitions.
   - Use headings (###) to organize long explanations.
   - Use numbered lists for step-by-step problem solving or study roadmaps.
   - Use code blocks with appropriate language syntax highlighting for programming/math.
   - Use LaTeX math formatting ($...$ for inline or $$...$$ for block formulas) when explaining mathematical or algorithmic concepts.
5. If the student asks for practice questions or quizzes, generate active-recall challenge questions with hidden or clear answers.
6. If the student asks about deadlines or preparation, reference their exact assignments and next scheduled class sessions.
7. Be concise, intellectually sharp, encouraging, and direct. Avoid unnecessary conversational fluff.`;
}

/**
 * Main query function for the Course Study Agent
 */
export async function askCourseAgent(
  userQuery: string,
  course: Course,
  assignments: Assignment[],
  notes: Note[],
  files: DocumentFile[],
  quizzes: Quiz[]
): Promise<{ text: string; citations: string[]; isRealAi: boolean }> {
  const apiKey = getGeminiApiKey();

  // If Gemini API Key is available, use real Gemini LLM
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const systemInstruction = buildCourseAgentSystemInstruction(course, assignments, notes, files);
      const geminiPrompt = `Student Question / Prompt: "${userQuery}"\n\nPlease provide a clear, comprehensive, and well-structured response for the course ${course.name} (${course.code}).`;
      
      const response = await queryGemini(geminiPrompt, systemInstruction);
      if (response && response.trim().length > 15) {
        // Extract citations from the files or notes
        const citations: string[] = [];
        
        // Check if any uploaded files were referenced or match keywords
        for (const file of files) {
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          if (response.toLowerCase().includes(baseName.toLowerCase()) || userQuery.toLowerCase().includes(baseName.toLowerCase())) {
            citations.push(`${file.name}${file.pageCount ? ` • ${file.pageCount} pages` : ''}`);
          }
        }

        // If no explicit file citations matched but course has files, check if query matched note titles
        for (const note of notes) {
          if (response.toLowerCase().includes(note.title.toLowerCase()) || userQuery.toLowerCase().includes(note.title.toLowerCase())) {
            citations.push(`Note: "${note.title}"`);
          }
        }

        // If files exist and query was about lectures/slides/summary, cite the first file
        if (citations.length === 0 && files.length > 0 && (userQuery.toLowerCase().includes('lecture') || userQuery.toLowerCase().includes('slide') || userQuery.toLowerCase().includes('summarize'))) {
          citations.push(`${files[0].name}${files[0].pageCount ? ` • Slide 1-${files[0].pageCount}` : ''}`);
        }

        return {
          text: response,
          citations: Array.from(new Set(citations)),
          isRealAi: true
        };
      }
    } catch (err) {
      console.warn('Gemini query error for course agent, falling back to local academic engine:', err);
    }
  }

  // Fallback to Intelligent Local Academic Engine (No API key or network down)
  const localResult = generateLocalCourseAgentAnswer(userQuery, course, assignments, notes, files, quizzes);
  return {
    ...localResult,
    isRealAi: false
  };
}

/**
 * Intelligent Local Academic Knowledge Engine for this specific course
 */
function generateLocalCourseAgentAnswer(
  query: string,
  course: Course,
  assignments: Assignment[],
  notes: Note[],
  files: DocumentFile[],
  quizzes: Quiz[]
): { text: string; citations: string[] } {
  const lower = query.toLowerCase();
  const scheduleStr = formatCourseSchedule(course);

  // 1. Next Lecture / Class Preparation Query
  if (lower.includes('lecture') || lower.includes('class') || lower.includes('prepare') || lower.includes('schedule') || lower.includes('next')) {
    const nextSlot = course.meetingSlots?.[0];
    const slotInfo = nextSlot
      ? `${DAY_NAMES[nextSlot.day]} at ${nextSlot.startTime}–${nextSlot.endTime} in ${nextSlot.location || course.location || 'Classroom'}`
      : scheduleStr;

    let prepAdvice = '';
    if (files.length > 0) {
      prepAdvice = `\n\n### Recommended Pre-Lecture Checklist:\n1. 📖 Review the latest slide deck: **${files[0].name}**.\n2. 📝 Skim your notes on recent topics (${notes.length > 0 ? `"${notes[0].title}"` : 'foundational concepts'}).\n3. 💡 Note down 2 questions to ask ${course.instructor} during the session.`;
    } else {
      prepAdvice = `\n\n### Recommended Pre-Lecture Checklist:\n1. Review textbook readings for **${course.name}**.\n2. Bring your assignment drafts or questions for ${course.instructor}.\n3. Upload your lecture slides or syllabus PDF to this course's **Files** tab so I can index them for deeper prep!`;
    }

    const text = `### 📅 Next Session Preparation for ${course.name} (${course.code})

- **Instructor**: ${course.instructor}
- **Meeting Time & Room**: ${slotInfo}
- **Course Term**: ${course.term} (${course.creditHours} Credits)
${prepAdvice}`;

    const citations = files.length > 0 ? [`${files[0].name} • Lecture Materials`] : [];
    return { text, citations };
  }

  // 2. Coursework / Assignment / Revision Planning Query
  if (lower.includes('assignment') || lower.includes('due') || lower.includes('coursework') || lower.includes('deadline') || lower.includes('plan') || lower.includes('exam') || lower.includes('revision')) {
    if (assignments.length > 0) {
      const topAss = assignments[0];
      const dueDateStr = topAss.dueDate ? new Date(topAss.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Upcoming';
      const daysLeft = topAss.dueDate ? Math.ceil((new Date(topAss.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const daysText = daysLeft !== null ? (daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Due Today!' : `${daysLeft} days remaining`) : '';

      const text = `### 🎯 Coursework & Revision Roadmap: ${course.name}

You have **${assignments.length}** tracked assignment${assignments.length > 1 ? 's' : ''} for this course:

#### Top Priority: **${topAss.title}**
- **Due Date**: ${dueDateStr} ${daysText ? `(${daysText})` : ''}
- **Priority**: \`${topAss.priority.toUpperCase()}\` (Est: ${topAss.estimatedMinutes || 60}m)
- **Status**: \`${topAss.status}\`

#### 4-Step Execution Strategy:
1. **Scope & Research (Day 1)**: Deconstruct rubric requirements and gather reference citations from your course files.
2. **Drafting Key Sections (Days 2–3)**: Outline major headings and draft primary methodology or arguments.
3. **Synthesis & Review (Day 4)**: Verify calculations/code, cross-reference course notes, and check citations.
4. **Final Proofing & Submission**: Format bibliography and submit well ahead of the deadline.

*Tip: Click **Add Study Task** below to break this down into actionable items on your To-Do list!*`;

      return { text, citations: [`Course Syllabus & Deadlines • ${topAss.title}`] };
    } else {
      return {
        text: `### 🎯 Revision Plan for ${course.name} (${course.code})\n\nYou currently have **0 active assignments** logged for ${course.code}.\n\nTo plan your coursework efficiently:\n1. Add upcoming assignments or project milestones under the **Assignments** tab.\n2. Upload the syllabus or problem sets under **Files**.\n3. I will automatically generate step-by-step revision schedules with Pomodoro focus blocks!`,
        citations: []
      };
    }
  }

  // 3. Summarize Course Files / Slide Decks
  if (lower.includes('summarize') || lower.includes('files') || lower.includes('slides') || lower.includes('document')) {
    if (files.length > 0) {
      const fileList = files
        .map((f, i) => `**${i + 1}. ${f.name}** (${f.pageCount || 1} pages/slides)\n> ${f.summary || (f.rawText ? f.rawText.slice(0, 180) + '...' : 'Indexed lecture material ready for queries.')}`)
        .join('\n\n');

      const text = `### 📁 Indexed Course Files Summary for ${course.name}\n\nI have indexed **${files.length}** document${files.length > 1 ? 's' : ''} for ${course.code}:\n\n${fileList}\n\nYou can ask me specific questions about any slide or topic from these documents!`;
      const citations = files.map(f => `${f.name} • ${f.pageCount || 1} slides`);
      return { text, citations };
    } else {
      return {
        text: `### 📁 File Library for ${course.name}\n\nNo lecture slides or readings have been uploaded to **${course.code}** yet.\n\n👉 **Upload your first PDF, PPTX, or Word document** using the upload button above or in the **Files** tab. I will immediately parse and index every slide so you can ask me to summarize lectures, generate practice questions, and cite exact page numbers!`,
        citations: []
      };
    }
  }

  // 4. Quiz / Self-Test / Flashcard Questions
  if (lower.includes('quiz') || lower.includes('test') || lower.includes('flashcard') || lower.includes('question')) {
    if (notes.length > 0 || files.length > 0) {
      const sourceName = files[0]?.name || notes[0]?.title || course.name;
      const text = `### 🧠 Active-Recall Challenge: ${course.name} (${course.code})

Here are 3 concept verification questions grounded in your course materials:

1. **Foundational Concept**:
   Explain the primary theoretical model or definition introduced in *${sourceName}*. How does it differ from alternative approaches?

2. **Mechanism & Application**:
   What are the necessary preconditions or constraints required when applying the core theorems of ${course.name}?

3. **Exam Edge-Case / Problem Solving**:
   Under what boundary conditions would this approach fail or experience degraded performance, and what mitigation is taught?

---
*💡 Try writing your answers down, or ask me: **"Check my answer to question 1"** to get immediate feedback!*`;

      return { text, citations: [sourceName] };
    } else {
      return {
        text: `### 🧠 Active-Recall Quiz for ${course.name} (${course.code})\n\n1. State the fundamental objective and major learning outcome of **${course.name}**.\n2. Name two critical methodologies or algorithms taught by ${course.instructor}.\n3. Describe how this course connects with your other academic subjects.\n\n*Upload lecture slides or write course notes to generate questions tailored to your exact syllabus!*`,
        citations: []
      };
    }
  }

  // 5. General Academic / Concept Query Fallback
  // Try to search files and notes for keywords
  let matchingSnippet = '';
  let matchingSource = '';

  for (const f of files) {
    if (f.rawText) {
      const words = lower.split(/\s+/).filter(w => w.length > 3);
      for (const w of words) {
        const idx = f.rawText.toLowerCase().indexOf(w);
        if (idx !== -1) {
          const start = Math.max(0, idx - 100);
          const end = Math.min(f.rawText.length, idx + 300);
          matchingSnippet = f.rawText.slice(start, end).replace(/\s+/g, ' ');
          matchingSource = `${f.name} • Lecture Content`;
          break;
        }
      }
    }
    if (matchingSnippet) break;
  }

  if (matchingSnippet) {
    const text = `### 📚 Course Index Search: ${course.name}

Based on your indexed course materials for **${course.code}**:

> "...${matchingSnippet}..."

This topic is central to your coursework. 

---
> [!TIP]
> **Enable Real AI Reasoning**: Connect your free Google Gemini API key by clicking **Manage Gemini API Key** at the top of the chat to unlock deep, unconstrained mathematical derivations, code generation, and multi-turn conceptual tutoring!`;

    return { text, citations: [matchingSource] };
  }

  // Default friendly academic response
  const text = `### 🎓 ${course.name} (${course.code}) Study Agent

I am ready to assist you with:
- 📖 **Lecture Preparation**: Meeting schedule on ${scheduleStr}.
- 📝 **Coursework & Deadlines**: Tracking ${assignments.length} assignment${assignments.length === 1 ? '' : 's'}.
- 📁 **Document Analysis**: ${files.length} indexed slide deck${files.length === 1 ? '' : 's'} and ${notes.length} note${notes.length === 1 ? '' : 's'}.

Try one of the quick actions below, or connect your free Gemini API key for unrestricted deep academic tutoring!`;

  return { text, citations: [] };
}
