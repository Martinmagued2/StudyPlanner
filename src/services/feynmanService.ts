import { queryGemini } from './fileAiService';

export interface FeynmanEvaluationResult {
  scorePercent: number;
  clarityScore: number;
  accuracyScore: number;
  strengths: string[];
  missingOrWrong: string[];
  simplifiedTakeaway: string;
  suggestedFlashcards: Array<{ question: string; answer: string }>;
  usedAi: boolean;
}

export async function evaluateFeynmanExplanation(params: {
  topic: string;
  studentExplanation: string;
  courseName?: string;
  referenceMaterials?: string;
}): Promise<FeynmanEvaluationResult> {
  const { topic, studentExplanation, courseName, referenceMaterials } = params;

  const prompt = `You are grading a student using the Feynman Technique.
Topic: "${topic}"${courseName ? ` (Course: ${courseName})` : ''}

Reference course notes/slides excerpt (if any):
${(referenceMaterials || 'General university-level standard').slice(0, 6000)}

Student's own explanation (in their words):
"${studentExplanation}"

Grade rigorously on:
1) Technical accuracy
2) Clarity / beginner-friendliness without jargon hiding gaps
3) Important edge cases or details they missed or explained incorrectly

Return ONLY valid JSON (no markdown fences) matching:
{
  "scorePercent": number (0-100),
  "clarityScore": number (0-100),
  "accuracyScore": number (0-100),
  "strengths": ["point 1", "point 2"],
  "missingOrWrong": ["exact gap or misconception 1", "gap 2"],
  "simplifiedTakeaway": "A crystal-clear 2-3 sentence model Feynman explanation of the topic.",
  "suggestedFlashcards": [
    { "question": "Targeted flashcard targeting a weak point", "answer": "Concise accurate answer" }
  ]
}`;

  const raw = await queryGemini(
    prompt,
    'Return strictly valid raw JSON matching the requested schema.'
  );

  if (raw) {
    try {
      const cleaned = raw.replace(/```json|```/gi, '').trim();
      const p = JSON.parse(cleaned);
      return {
        scorePercent: Math.max(0, Math.min(100, Number(p.scorePercent) || 75)),
        clarityScore: Math.max(0, Math.min(100, Number(p.clarityScore) || 75)),
        accuracyScore: Math.max(0, Math.min(100, Number(p.accuracyScore) || 75)),
        strengths: Array.isArray(p.strengths) ? p.strengths.map(String) : ['Clear attempt at core concept.'],
        missingOrWrong: Array.isArray(p.missingOrWrong) ? p.missingOrWrong.map(String) : [],
        simplifiedTakeaway: String(p.simplifiedTakeaway || ''),
        suggestedFlashcards: Array.isArray(p.suggestedFlashcards)
          ? p.suggestedFlashcards.filter((c: any) => c?.question && c?.answer)
          : [],
        usedAi: true
      };
    } catch { }
  }

  // Deterministic local fallback if offline / no Gemini key
  const words = studentExplanation.trim().split(/\s+/).filter(Boolean).length;
  const baseScore = Math.min(88, Math.max(35, 30 + Math.round(words * 1.1)));
  return {
    scorePercent: baseScore,
    clarityScore: Math.min(90, baseScore + 4),
    accuracyScore: baseScore,
    strengths: [
      `Used ${words} words to articulate "${topic}" in your own phrasing.`,
      words >= 30 ? 'Included supporting explanation rather than a one-line guess.' : 'Concise summary.'
    ],
    missingOrWrong: [
      words < 25
        ? 'Explanation is very brief — expand on concrete examples, preconditions, and edge cases.'
        : 'Connect your Gemini API key in Ask AI for deep semantic grading against your lecture slides.'
    ],
    simplifiedTakeaway: `Mastery tip for ${topic}: explain the problem it solves, the core rule/invariant, and one concrete failure or boundary case.`,
    suggestedFlashcards: [
      {
        question: `Feynman Check (${topic}): What precondition or boundary case must hold?`,
        answer: studentExplanation.slice(0, 220)
      }
    ],
    usedAi: false
  };
}
