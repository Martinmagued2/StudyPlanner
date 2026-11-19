import { getGeminiApiKey, queryGemini } from './fileAiService';

export type SocraticMode =
  | 'derive'
  | 'intuition'
  | 'variations'
  | 'socratic_hint'
  | 'check_sketch';

export interface SocraticWhiteboardRequest {
  mode: SocraticMode;
  selectedText: string;
  fileName: string;
  fileExcerpt?: string;
  userAttempt?: string;
  sketchImageBase64?: string; // raw base64 PNG (without data URL prefix)
  courseName?: string;
}

export interface SocraticWhiteboardResponse {
  mode: SocraticMode;
  markdown: string;
  usedAi: boolean;
}

async function queryGeminiWithOptionalImage(
  prompt: string,
  sketchImageBase64?: string
): Promise<string | null> {
  if (!sketchImageBase64) {
    return queryGemini(
      prompt,
      'You are an elite university STEM & Computer Science Socratic tutor. Format equations cleanly in LaTeX ($...$ / $$...$$), code in fenced blocks, and keep reasoning crisp, logical, and interactive.'
    );
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey || apiKey.trim().length < 10) return null;

  const models = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/png', data: sketchImageBase64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 2048
          }
        })
      });

      if (!res.ok) continue;
      const data: any = await res.json().catch(() => ({}));
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    } catch {
      // Try next fallback model
    }
  }
  return null;
}

function buildOfflineFallback(req: SocraticWhiteboardRequest): string {
  const snippet = (req.selectedText || req.fileExcerpt || '').trim().slice(0, 260);
  const label = req.courseName ? ` (${req.courseName})` : '';

  switch (req.mode) {
    case 'derive':
      return [
        `### Step-by-Step Breakdown${label}`,
        `> Highlighted Focus: "${snippet || req.fileName}"`,
        '',
        '1. **Identify Given Definitions & Assumptions:** Isolate the variables, preconditions, or base cases stated in the excerpt.',
        '2. **State the Governing Principle / Invariant:** Write down the rule or recurrence connecting input state to next state.',
        '3. **Apply Algebraic / Algorithmic Transformation:** Work step-by-step from general rule to target result, checking edge cases (0, empty set, boundary limits).',
        '4. **Sanity Check Units / Complexity:** Verify dimensions, asymptotic order, or boundary outputs match expectations.',
        '',
        '*Tip: Add your Gemini API key in Ask AI settings to get live full symbolic derivations tailored to this exact formula or code block.*'
      ].join('\n');

    case 'intuition':
      return [
        `### Intuitive Mental Model${label}`,
        `> Selected Excerpt: "${snippet || req.fileName}"`,
        '',
        '- **Why this exists:** Every formula or algorithm solves a concrete trade-off (time vs. space, accuracy vs. variance, coupling vs. cohesion).',
        '- **Plain-English translation:** Read the highlighted block as an input-transform-output contract rather than raw syntax.',
        '- **Common misconception:** Avoid applying this rule outside its stated preconditions or constraints.'
      ].join('\n');

    case 'variations':
      return [
        `### 3 Custom Practice Variations${label}`,
        `Grounded in: "${snippet.slice(0, 140) || req.fileName}"`,
        '',
        '1. **Warm-Up Check:** Explain in two sentences what breaks if the primary assumption in this excerpt is violated.',
        '2. **Parameter / Edge-Case Twist:** Trace the behavior when input size is $n = 1$, null/zero, or duplicated.',
        '3. **Exam-Style Synthesis:** Modify or extend this concept to handle an additional constraint and justify its new complexity or proof.'
      ].join('\n');

    case 'socratic_hint':
      return [
        `### Socratic Check-In${label}`,
        `Before jumping to the final answer on "${snippet.slice(0, 120) || req.fileName}":`,
        '',
        '- **Question 1:** What is the exact quantity or invariant we are trying to preserve or solve for?',
        '- **Question 2:** Which single line, term, or condition in the excerpt controls the bottleneck?',
        req.userAttempt?.trim()
          ? `- **Looking at your attempt:** "${req.userAttempt.trim().slice(0, 120)}" — check whether every boundary condition holds at the final step.`
          : '- **Next Micro-Step:** Write your first line or draw the state transition on the whiteboard canvas, then click **Check My Attempt / Sketch**.'
      ].join('\n');

    case 'check_sketch':
    default:
      return [
        `### Attempt & Whiteboard Review${label}`,
        req.userAttempt?.trim()
          ? `**Typed Attempt Reviewed:** "${req.userAttempt.trim()}"`
          : '**Whiteboard Canvas Captured:** Sketch received for review.',
        '',
        '- Verify step-to-step logical equivalence (no dropped negative signs, off-by-one indices, or missing base cases).',
        '- Connect your Gemini API key to evaluate handwritten whiteboard equations and diagrams directly using Gemini Vision.'
      ].join('\n');
  }
}

export async function runSocraticWhiteboardAction(
  req: SocraticWhiteboardRequest
): Promise<SocraticWhiteboardResponse> {
  const selection = req.selectedText.trim() || req.fileExcerpt?.slice(0, 900) || '';
  const excerpt = (req.fileExcerpt || '').slice(0, 3000);
  const courseCtx = req.courseName ? `Course: ${req.courseName}\n` : '';

  const instructionsByMode: Record<SocraticMode, string> = {
    derive: `The student highlighted this section from "${req.fileName}".
Produce a crystal-clear, numbered **Step-by-Step Derivation / Trace**:
- Explain every transition explicitly (never skip algebra or loop invariants).
- If it's code, trace execution state step-by-step with concrete sample input and state time/space complexity.
- If it's math/theory, use clean LaTeX ($...$ and $$...$$).
- End with one quick verification question so the student tests their understanding.`,

    intuition: `The student highlighted this section from "${req.fileName}".
Explain the **deep intuition** behind it:
1. Plain-English meaning ("In human terms...")
2. Concrete analogy or small numerical/code example
3. Why lecturers test this concept & the #1 trap students fall into.`,

    variations: `Based on the student's highlighted selection from "${req.fileName}", generate **3 Custom Exam Practice Variations** ascending from Medium to Exam-Hard:
- Variation 1 (Conceptual / Edge Case)
- Variation 2 (Modified Parameters / Code Bug Hunt)
- Variation 3 (Proof / Design / Multi-step Problem)
Include expandable/clearly separated **Hints & Key Answer Checkpoints** at the bottom so the student can try them first on the whiteboard.`,

    socratic_hint: `Act strictly as a **Socratic Tutor**. Do NOT spoil the full final solution.
Look at the highlighted material${req.userAttempt?.trim() ? ` and the student's current attempt: "${req.userAttempt.trim()}"` : ''}.
1. Acknowledge what is right or highlight the key hinge idea.
2. Ask 2 targeted guiding questions that nudge the student toward the next step themselves.
3. Give just ONE tiny micro-hint.`,

    check_sketch: `Inspect BOTH the student's whiteboard sketch image (if attached) AND their typed attempt below.
1. Transcribe/summarize what the student wrote or drew on the whiteboard.
2. Point out exact steps that are correct vs. the exact line/sign/step where a mistake or gap occurs.
3. Guide them smoothly to fix it without losing their own reasoning flow.`
  };

  const prompt = `${courseCtx}File: ${req.fileName}
Highlighted / Selected Text:
"""
${selection || 'No specific snippet highlighted; analyze the surrounding excerpt.'}
"""

Surrounding Document Context:
"""
${excerpt}
"""

${req.userAttempt?.trim() ? `Student Typed Attempt / Question:\n"""\n${req.userAttempt.trim()}\n"""\n` : ''}
Task:
${instructionsByMode[req.mode]}`;

  const aiResult = await queryGeminiWithOptionalImage(
    prompt,
    req.mode === 'check_sketch' || req.sketchImageBase64 ? req.sketchImageBase64 : undefined
  );

  if (aiResult && aiResult.trim()) {
    return {
      mode: req.mode,
      markdown: aiResult.trim(),
      usedAi: true
    };
  }

  return {
    mode: req.mode,
    markdown: buildOfflineFallback(req),
    usedAi: false
  };
}
