import { Course, DocumentFile, Exam, Note, Quiz } from '../types';
import { queryGemini } from './fileAiService';
import { stripHtmlTags } from './noteBlockService';

export interface PredictedExamPack {
  likelyQuestions: Array<{
    question: string;
    topic: string;
    probability: 'High' | 'Very High' | 'Medium';
    modelAnswer: string;
  }>;
  highYieldTraps: string[];
  cramSheetMarkdown: string;
  usedAi: boolean;
}

export async function generateExamCramPack(params: {
  exam: Exam;
  course?: Course;
  notes: Note[];
  files: DocumentFile[];
  quizzes: Quiz[];
}): Promise<PredictedExamPack> {
  const { exam, course, notes, files, quizzes } = params;

  const notesDigest = notes
    .slice(0, 6)
    .map(n => `### ${n.title}\n${stripHtmlTags(n.content).slice(0, 1200)}`)
    .join('\n\n');

  const filesDigest = files
    .slice(0, 4)
    .map(f => `### ${f.name}\n${(f.rawText || f.summary || '').slice(0, 1600)}`)
    .join('\n\n');

  const weakTopics = Array.from(
    new Set(quizzes.flatMap(q => q.attempts.flatMap(a => a.weakTopics || [])))
  );

  const prompt = `You are a senior university professor predicting high-yield exam topics and building a compact 1-page Cram Sheet for:
Exam: "${exam.name}" (${exam.examType || 'final'}, Weight: ${exam.weightPercentage}%)
Course: ${course ? `${course.code} — ${course.name}` : 'University Course'}
Student Weak Topics from Quizzes: ${weakTopics.join(', ') || 'None recorded yet'}

Course Notes:
${notesDigest || 'No notes provided.'}

Lecture Files:
${filesDigest || 'No files uploaded.'}

Output ONLY valid raw JSON (no markdown code fences) matching:
{
  "likelyQuestions": [
    {
      "question": "Realistic exam question grounded in the materials",
      "topic": "Topic tag",
      "probability": "Very High" | "High" | "Medium",
      "modelAnswer": "Crisp high-scoring model answer"
    }
  ],
  "highYieldTraps": ["Trap or common mistake 1", "Trap 2", "Trap 3"],
  "cramSheetMarkdown": "Clean 1-page Markdown cram sheet with ## headings, key definitions, LaTeX formulas ($...$ / $$...$$), > [!WARNING] exam traps, and - [ ] final 30-min checklist."
}`;

  const raw = await queryGemini(
    prompt,
    'Output strictly valid raw JSON matching the schema.'
  );

  if (raw) {
    try {
      const cleaned = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.likelyQuestions)) {
        return {
          likelyQuestions: parsed.likelyQuestions,
          highYieldTraps: Array.isArray(parsed.highYieldTraps) ? parsed.highYieldTraps : [],
          cramSheetMarkdown: String(parsed.cramSheetMarkdown || ''),
          usedAi: true
        };
      }
    } catch { }
  }

  // Deterministic fallback built from real course notes/files/weakTopics
  const firstSource = notes[0]?.title || files[0]?.name || course?.name || exam.name;
  const fallbackQuestions = [
    {
      question: `Explain the core principles covered in "${firstSource}" and compare their trade-offs.`,
      topic: course?.code || 'Core Concepts',
      probability: 'Very High' as const,
      modelAnswer: `State formal definitions from ${firstSource}, outline preconditions, and compare time/space or practical constraints.`
    },
    ...(weakTopics.slice(0, 2).map(t => ({
      question: `Solve/analyze a boundary-case scenario involving ${t}.`,
      topic: t,
      probability: 'High' as const,
      modelAnswer: `Address your previously missed quiz topic "${t}" by verifying edge inputs and step-by-step invariants.`
    }))),
    {
      question: `What are the primary failure modes or assumptions tested in ${exam.name}?`,
      topic: 'Edge Cases',
      probability: 'Medium' as const,
      modelAnswer: `Identify assumptions, units/limits, and justify your chosen method cleanly.`
    }
  ];

  const cramSheetMarkdown = `## 1. High-Yield Overview: ${exam.name} (${course?.code || 'Course'})
> [!WARNING] Focus extra time on: ${weakTopics.join(', ') || 'Core definitions, proofs, and edge cases'}.

## 2. Source Materials Covered
${notes.slice(0, 5).map(n => `- **Note:** ${n.title}`).join('\n') || '- Course lecture materials'}
${files.slice(0, 5).map(f => `- **Slides/File:** ${f.name}`).join('\n')}

## 3. Predicted Exam Prompts
${fallbackQuestions.map((q, i) => `${i + 1}. **(${q.probability}) ${q.question}**\n   - *Model Outline:* ${q.modelAnswer}`).join('\n')}

## 4. Final 30-Minute Cram Checklist
- [ ] Recite core definitions from memory without looking at notes
- [ ] Re-verify edge cases on weak quiz topics
- [ ] Review formulas and notation before entering ${exam.room || 'the exam room'}`;

  return {
    likelyQuestions: fallbackQuestions,
    highYieldTraps: [
      ...(weakTopics.length > 0 ? [`Weak quiz topic to reinforce: ${weakTopics.join(', ')}`] : []),
      'Verify boundary conditions and units before finalizing numerical or algorithmic answers.',
      'Explain *why* your approach works — partial credit often depends on stated assumptions.'
    ],
    cramSheetMarkdown,
    usedAi: false
  };
}
