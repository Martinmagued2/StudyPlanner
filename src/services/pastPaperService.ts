import { getGeminiApiKey, queryGemini } from './fileAiService';

export interface UploadedImagePayload {
  name?: string;
  base64: string;
  mimeType: string;
  dataUrl?: string;
}

export interface PastPaperQuestionGrade {
  questionLabel: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  modelAnswerHint: string;
  missedTopic: string;
}

export interface PastPaperGradeResult {
  scoreOutOf100: number;
  letterGrade: string;
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  questionBreakdown: PastPaperQuestionGrade[];
  flashcardsToCreate: Array<{ question: string; answer: string }>;
  usedAi: boolean;
}

export interface GradePastPaperRequest {
  paperTitle: string;
  paperText: string;
  paperImages?: UploadedImagePayload[];
  markingScheme?: string;
  typedAnswers: string;
  answerPhotos: UploadedImagePayload[];
  elapsedMinutes: number;
  targetMinutes: number;
  courseName?: string;
}

function scoreToLetter(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function tryParseGradeJson(raw: string): PastPaperGradeResult | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const score = Math.max(0, Math.min(100, Number(parsed.scoreOutOf100) || 0));
    const breakdown = Array.isArray(parsed.questionBreakdown)
      ? parsed.questionBreakdown.map((q: any, idx: number) => ({
          questionLabel: String(q.questionLabel || `Question ${idx + 1}`),
          marksAwarded: Math.max(0, Number(q.marksAwarded) || 0),
          maxMarks: Math.max(1, Number(q.maxMarks) || 10),
          feedback: String(q.feedback || 'Evaluated against exam rubric.'),
          modelAnswerHint: String(q.modelAnswerHint || ''),
          missedTopic: String(q.missedTopic || '')
        }))
      : [];

    return {
      scoreOutOf100: Math.round(score),
      letterGrade: String(parsed.letterGrade || scoreToLetter(score)),
      overallFeedback: String(parsed.overallFeedback || 'Exam attempt marked.'),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
      questionBreakdown: breakdown,
      flashcardsToCreate: Array.isArray(parsed.flashcardsToCreate)
        ? parsed.flashcardsToCreate
            .filter((f: any) => f?.question && f?.answer)
            .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
        : [],
      usedAi: true
    };
  } catch {
    return null;
  }
}

function buildOfflineGradeFallback(req: GradePastPaperRequest): PastPaperGradeResult {
  const typedWords = req.typedAnswers.trim().split(/\s+/).filter(Boolean).length;
  const photoBonus = req.answerPhotos.length * 18;
  const rawScore = Math.min(88, Math.max(15, Math.round(typedWords * 0.45 + photoBonus)));

  const paperQuestions = req.paperText
    .split(/\n+/)
    .filter(line => /^\s*(?:Q(?:uestion)?\s*\d+|\d+[.)])/i.test(line))
    .slice(0, 6);

  const breakdown: PastPaperQuestionGrade[] = (
    paperQuestions.length > 0
      ? paperQuestions
      : ['Section A — Core Concept Response', 'Section B — Problem Solving & Analysis']
  ).map((qLine, i) => ({
    questionLabel: qLine.slice(0, 72),
    marksAwarded: Math.round((rawScore / 100) * 10),
    maxMarks: 10,
    feedback:
      req.answerPhotos.length > 0 && typedWords < 15
        ? 'Handwritten answer photo attached. Connect a Gemini API key in Ask AI settings to enable full multimodal handwriting grading.'
        : typedWords > 20
        ? 'Substantive written response recorded. Connect Gemini API key for line-by-line rubric verification.'
        : 'Answer appears brief—expand definitions, intermediate derivations, and edge cases for full marks.',
    modelAnswerHint: `Ensure explicit steps, formal definitions, and time/unit checks for Q${i + 1}.`,
    missedTopic: `${req.courseName || req.paperTitle} — Q${i + 1} Precision`
  }));

  return {
    scoreOutOf100: rawScore,
    letterGrade: scoreToLetter(rawScore),
    overallFeedback: `Completed "${req.paperTitle}" in ${req.elapsedMinutes}m (of ${req.targetMinutes}m limit). Offline heuristic review generated — configure Gemini API key in Ask AI settings for deep Vision & rubric marking.`,
    strengths: [
      `Time management: finished in ${req.elapsedMinutes} / ${req.targetMinutes} minutes`,
      req.answerPhotos.length > 0
        ? `Captured ${req.answerPhotos.length} handwritten answer photo(s)`
        : `Provided ${typedWords} words of written responses`
    ],
    weaknesses: [
      'Connect Gemini Vision key to inspect handwritten equations/diagrams directly against marking criteria'
    ],
    questionBreakdown: breakdown,
    flashcardsToCreate: breakdown.slice(0, 2).map(q => ({
      question: `Exam Review (${req.paperTitle}): What are the key marking points for "${q.questionLabel}"?`,
      answer: q.modelAnswerHint
    })),
    usedAi: false
  };
}

export async function gradePastPaperAttempt(
  req: GradePastPaperRequest
): Promise<PastPaperGradeResult> {
  const apiKey = getGeminiApiKey();
  const hasImages = (req.paperImages?.length || 0) > 0 || req.answerPhotos.length > 0;

  const prompt = `You are a strict yet constructive University Examiner grading a student's timed Past-Paper Mock Exam.

Course: ${req.courseName || 'General Academic Course'}
Exam Paper Title: ${req.paperTitle}
Time Taken: ${req.elapsedMinutes} minutes out of ${req.targetMinutes} minutes allowed.

=== PAST PAPER QUESTIONS / TEXT ===
${req.paperText.slice(0, 12000) || '(See attached past paper images if provided)'}

=== OFFICIAL RUBRIC / MARKING SCHEME (if provided) ===
${req.markingScheme?.trim() || 'No explicit rubric provided — infer standard university marking scheme weights from question marks and depth.'}

=== STUDENT TYPED ANSWERS ===
${req.typedAnswers.trim() || '(No typed answers — check attached handwritten answer photos!)'}

=== ATTACHED IMAGES ===
- Past paper images attached: ${req.paperImages?.length || 0}
- Student handwritten answer sheet photos attached: ${req.answerPhotos.length}

Grade EVERY question visible in the past paper against both typed answers AND handwritten answer photos.
Return ONLY valid JSON (no markdown wrappers outside JSON) with this exact schema:
{
  "scoreOutOf100": 78,
  "letterGrade": "B+",
  "overallFeedback": "Concise examiner summary covering accuracy, method marks, and time pacing.",
  "strengths": ["Strong grasp of ...", "..."],
  "weaknesses": ["Lost marks on ... due to ...", "..."],
  "questionBreakdown": [
    {
      "questionLabel": "Q1: ...",
      "marksAwarded": 8,
      "maxMarks": 10,
      "feedback": "Specific explanation of marks awarded and exact missing steps/errors.",
      "modelAnswerHint": "Exact formula/logic required for 10/10.",
      "missedTopic": "Topic name for spaced-repetition revision"
    }
  ],
  "flashcardsToCreate": [
    {
      "question": "Concise active-recall question targeting a mistake made",
      "answer": "Crisp model answer"
    }
  ]
}`;

  if (apiKey && apiKey.trim().length >= 10) {
    if (!hasImages) {
      const textRes = await queryGemini(
        prompt,
        'You are a strict university examiner returning clean JSON exam grading.'
      );
      if (textRes) {
        const parsed = tryParseGradeJson(textRes);
        if (parsed) return parsed;
      }
    } else {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: prompt }
      ];
      for (const img of req.paperImages || []) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
      for (const img of req.answerPhotos) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }

      const models = ['gemini-2.0-flash', 'gemini-2.5-flash'];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
            })
          });
          if (!res.ok) continue;
          const data: any = await res.json().catch(() => ({}));
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof rawText === 'string' && rawText.trim()) {
            const parsed = tryParseGradeJson(rawText);
            if (parsed) return parsed;
          }
        } catch {
          // Try next model
        }
      }
    }
  }

  return buildOfflineGradeFallback(req);
}
