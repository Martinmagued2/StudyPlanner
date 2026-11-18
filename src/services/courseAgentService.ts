import { Course, Assignment, Note, DocumentFile, Quiz, GitHubRepo } from '../types';
import { queryGemini, getGeminiApiKey } from './fileAiService';
import { fetchRepoSnapshotForAi, fetchCommitDetail, RepoReadFile } from './githubService';

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
  files: DocumentFile[],
  repos: GitHubRepo[] = [],
  repoContextText: string = ''
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

=== LINKED COURSE PROJECT & GITHUB REPOSITORY CODEBASE ===
${
  repos.length === 0
    ? 'No GitHub project repository is linked to this course yet.'
    : repoContextText ||
      repos
        .map(r => `- ${r.owner}/${r.repo} (branch: ${r.branch}) — ${r.notes || 'Linked project repo'}`)
        .join('\n')
}

=== CORE INSTRUCTIONS ===
1. Answer strictly as an authoritative, helpful, and academically rigorous tutor specialized in this course.
2. Ground your explanations directly in the student's actual lecture slides, uploaded files, course notes, AND linked GitHub project repository files whenever possible.
3. When explaining the course project or codebase, trace architecture, component/module responsibilities, data flow, and cite exact file paths (e.g., "[Repo: owner/repo • src/App.tsx]") alongside lecture sources ("[Source: CS302_Lecture1.pptx • Slide 12]").
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
  quizzes: Quiz[],
  repos: GitHubRepo[] = [],
  pinnedRepoPaths: string[] = []
): Promise<{
  text: string;
  citations: string[];
  isRealAi: boolean;
  repoFilesRead?: RepoReadFile[];
  repoErrors?: string[];
}> {
  const apiKey = getGeminiApiKey();

  // Fetch linked GitHub repo tree + relevant/pinned source files in real time
  let repoSnapshot: Awaited<ReturnType<typeof fetchRepoSnapshotForAi>> = {
    contextText: '',
    filesRead: [],
    treeByRepo: {},
    errors: []
  };

  if (repos && repos.length > 0) {
    try {
      repoSnapshot = await fetchRepoSnapshotForAi(repos, userQuery, pinnedRepoPaths);
    } catch (err) {
      console.warn('Failed fetching GitHub repo snapshot for Study Agent:', err);
    }
  }

  // If Gemini API Key is available, use real Gemini LLM
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const systemInstruction = buildCourseAgentSystemInstruction(
        course,
        assignments,
        notes,
        files,
        repos,
        repoSnapshot.contextText
      );
      const geminiPrompt = `Student Question / Prompt: "${userQuery}"\n\nPlease provide a clear, comprehensive, and well-structured response for the course ${course.name} (${course.code}). If the question involves the linked GitHub project or code files, reference the exact file paths and explain clearly how they work.`;

      const response = await queryGemini(geminiPrompt, systemInstruction);
      if (response && response.trim().length > 15) {
        const citations: string[] = [];

        for (const file of files) {
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          if (
            response.toLowerCase().includes(baseName.toLowerCase()) ||
            userQuery.toLowerCase().includes(baseName.toLowerCase())
          ) {
            citations.push(`${file.name}${file.pageCount ? ` • ${file.pageCount} pages` : ''}`);
          }
        }

        for (const note of notes) {
          if (
            response.toLowerCase().includes(note.title.toLowerCase()) ||
            userQuery.toLowerCase().includes(note.title.toLowerCase())
          ) {
            citations.push(`Note: "${note.title}"`);
          }
        }

        for (const rf of repoSnapshot.filesRead) {
          const base = rf.path.split('/').pop()?.toLowerCase() || '';
          if (
            response.toLowerCase().includes(rf.path.toLowerCase()) ||
            (base && response.toLowerCase().includes(base)) ||
            pinnedRepoPaths.includes(rf.path) ||
            /project|repo|github|code|architecture|file|how does/i.test(userQuery)
          ) {
            citations.push(`Repo: ${rf.repoLabel} • ${rf.path}`);
          }
        }

        if (
          citations.length === 0 &&
          files.length > 0 &&
          (userQuery.toLowerCase().includes('lecture') ||
            userQuery.toLowerCase().includes('slide') ||
            userQuery.toLowerCase().includes('summarize'))
        ) {
          citations.push(`${files[0].name}${files[0].pageCount ? ` • Slide 1-${files[0].pageCount}` : ''}`);
        }

        return {
          text: response,
          citations: Array.from(new Set(citations)).slice(0, 8),
          isRealAi: true,
          repoFilesRead: repoSnapshot.filesRead,
          repoErrors: repoSnapshot.errors
        };
      }
    } catch (err) {
      console.warn('Gemini query error for course agent, falling back to local academic engine:', err);
    }
  }

  // Fallback to Intelligent Local Academic Engine (No API key or network down)
  const localResult = generateLocalCourseAgentAnswer(
    userQuery,
    course,
    assignments,
    notes,
    files,
    quizzes,
    repos,
    repoSnapshot
  );
  return {
    ...localResult,
    isRealAi: false,
    repoFilesRead: repoSnapshot.filesRead,
    repoErrors: repoSnapshot.errors
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
  quizzes: Quiz[],
  repos: GitHubRepo[] = [],
  repoSnapshot?: {
    contextText: string;
    filesRead: RepoReadFile[];
    treeByRepo: Record<string, { branch: string; files: Array<{ path: string; size: number }> }>;
    errors: string[];
  }
): { text: string; citations: string[] } {
  const lower = query.toLowerCase();
  const scheduleStr = formatCourseSchedule(course);

  // 0. Project / GitHub Repository / Codebase Query
  if (
    repos.length > 0 &&
    (/project|repo|repository|github|code|codebase|architecture|structure|commit|file|component|function|explain/i.test(lower) ||
      (repoSnapshot?.filesRead || []).some(rf => lower.includes(rf.path.split('/').pop()?.toLowerCase() || '___')))
  ) {
    const firstRepo = repos[0];
    const treeInfo = repoSnapshot?.treeByRepo?.[firstRepo.id];
    const readFiles = repoSnapshot?.filesRead || [];
    const errorsNote =
      repoSnapshot?.errors && repoSnapshot.errors.length > 0
        ? `\n\n> [!WARNING]\n> ${repoSnapshot.errors.join(' | ')}`
        : '';

    const filesSection =
      readFiles.length > 0
        ? readFiles
            .slice(0, 4)
            .map(
              rf =>
                `#### 📄 \`${rf.path}\`\n\`\`\`\n${rf.content.slice(0, 1200)}${rf.content.length > 1200 ? '\n...' : ''}\n\`\`\``
            )
            .join('\n\n')
        : '_Could not read file contents yet — check if the repository is private (add a GitHub Personal Access Token in Integrations) or pin files in the Repo Files drawer._';

    const treeSummary = treeInfo
      ? `\n- **Indexed Repository Files**: ${treeInfo.files.length} files on branch \`${treeInfo.branch}\` (\`${treeInfo.files.slice(0, 10).map(f => f.path).join('`, `')}\`${treeInfo.files.length > 10 ? ', ...' : ''})`
      : '';

    const commitsSummary =
      firstRepo.commits && firstRepo.commits.length > 0
        ? `\n- **Recent Commits**: ${firstRepo.commits
            .slice(0, 3)
            .map(c => `\`${c.shortHash}\` ${c.message}`)
            .join(' • ')}`
        : '';

    return {
      text: `### 💻 Linked Course Project: \`${firstRepo.owner}/${firstRepo.repo}\`${treeSummary}${commitsSummary}\n\n${filesSection}${errorsNote}\n\n---\n💡 **Tip**: Connect your Gemini API key (` +
        `"Connect Free Gemini Key"` +
        `) for deep natural-language architecture walkthroughs and line-by-line code explanations across these repo files!`,
      citations: readFiles.map(rf => `Repo: ${rf.repoLabel} • ${rf.path}`)
    };
  }

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

export type ProjectTutorMode = 'rubric_check' | 'bug_trace' | 'commit_diff' | 'viva_start' | 'viva_grade';

export async function runCourseProjectTutor(params: {
  mode: ProjectTutorMode;
  course: Course;
  repos: GitHubRepo[];
  inputText: string;
  pinnedPaths?: string[];
  commitSha?: string;
  vivaQuestion?: string;
}): Promise<{ text: string; citations: string[] }> {
  const { mode, course, repos, inputText, pinnedPaths = [], commitSha, vivaQuestion } = params;
  if (!repos || repos.length === 0) {
    return {
      text: `No GitHub repository is linked to **${course.code}** yet. Link a repo in tab **6. Projects** first so I can inspect your files!`,
      citations: []
    };
  }

  const snapshot = await fetchRepoSnapshotForAi(repos, `${inputText} ${vivaQuestion || ''}`, pinnedPaths);
  const citations = snapshot.filesRead.map(rf => `Repo: ${rf.repoLabel} • ${rf.path}`);

  let commitSection = '';
  if (mode === 'commit_diff') {
    const r = repos[0];
    const targetSha = commitSha || r.commits?.[0]?.hash;
    if (targetSha) {
      try {
        const diff = await fetchCommitDetail(r.owner, r.repo, targetSha);
        commitSection = `\n=== TARGET COMMIT DIFF (${targetSha.slice(0, 7)}) ===\nAuthor: ${diff.author}\nMessage: ${diff.message}\n` +
          diff.filesChanged
            .map(f => `File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n\`\`\`diff\n${f.patch || '(binary or omitted diff)'}\n\`\`\``)
            .join('\n\n');
      } catch (err: any) {
        commitSection = `\nCommit fetch warning: ${err?.message || 'unable to read commit patch'}`;
      }
    }
  }

  let prompt = '';
  if (mode === 'rubric_check') {
    prompt = `Act as a strict but helpful university project grader for ${course.code}: ${course.name}.
Compare the assignment rubric / requirements below against the linked GitHub repository files and tree:

=== ASSIGNMENT RUBRIC / INSTRUCTIONS ===
${inputText}

${snapshot.contextText}

Output a structured Markdown audit with:
1. **Requirements Matrix** (use ✅ Implemented, ⚠️ Partial, ❌ Missing — citing exact file paths & symbol names you observed)
2. **Critical Gaps or Bugs Before Submission**
3. **Actionable Next Fixes** with concise code guidance.`;
  } else if (mode === 'bug_trace') {
    prompt = `Act as a senior software engineer helping debug and trace execution in ${course.code}.
User issue / feature to trace:
"${inputText}"

${snapshot.contextText}

Trace the flow step-by-step across the exact repository files, pinpoint potential bugs, race conditions, or edge cases, and provide clear corrected code snippets.`;
  } else if (mode === 'commit_diff') {
    prompt = `Explain the commit / pull request changes below clearly for a student in ${course.code}:
${inputText ? `Focus question: ${inputText}\n` : ''}
${commitSection}

${snapshot.contextText}

Summarize: 1) What changed, 2) Why it matters architecturally, 3) Any side effects or bugs introduced.`;
  } else if (mode === 'viva_start') {
    prompt = `You are a university Viva / Oral Exam Assessor testing a student's true understanding of their own project repository in ${course.code}:
${snapshot.contextText}

Generate **1 challenging, specific technical viva question** grounded directly in an exact file/function from their repo (state which file you are asking about). Wait for their answer — do NOT reveal the full answer yet! Also list 2 brief focus hints.`;
  } else {
    prompt = `You are grading a student's Viva / Oral Defense answer for ${course.code}.
Question asked: "${vivaQuestion || 'Explain your project architecture'}"
Student's spoken/written answer: "${inputText}"

${snapshot.contextText}

Output:
- **Defense Score: X/10**
- **What You Nailed**
- **Missing Technical Details / Weak Spots** (citing exact files/code in their repo)
- **Model High-Distinction Answer** + **1 Follow-Up Viva Question**.`;
  }

  const aiResp = await queryGemini(
    prompt,
    `You are an expert code mentor and university assessor grounded strictly in the repository files provided for ${course.name}.`
  );

  if (aiResp && aiResp.trim()) {
    return { text: aiResp, citations };
  }

  const fileList = snapshot.filesRead.map(f => `- \`${f.path}\``).join('\n') || '_None loaded_';
  return {
    text: `### 💻 Repo Inspection Ready (${repos[0].owner}/${repos[0].repo})\n\nRead **${snapshot.filesRead.length} file(s)** from GitHub:\n${fileList}\n${commitSection ? '\n' + commitSection.slice(0, 1200) : ''}\n\n> Connect your Gemini API key in **Ask AI** to run deep AI Rubric Grading, Bug Tracing, and Oral Viva Grading across these files.`,
    citations
  };
}
