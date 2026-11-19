import { getGeminiApiKey, getPreferredGeminiModels } from './fileAiService';

export type VisionScanMode = 'handwriting' | 'homework_hints' | 'diagram';

export interface VisionScanResult {
  title: string;
  markdown: string;
  usedVisionAi: boolean;
}

export function readImageFileAsBase64(file: File): Promise<{ base64: string; mimeType: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error('Could not read image data.'));
        return;
      }
      resolve({
        mimeType: match[1],
        base64: match[2],
        dataUrl
      });
    };
    reader.onerror = () => reject(new Error('Failed reading image file.'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeStudyImageWithVision(params: {
  base64: string;
  mimeType: string;
  mode: VisionScanMode;
  courseName?: string;
  extraNotes?: string;
}): Promise<VisionScanResult> {
  const { base64, mimeType, mode, courseName, extraNotes } = params;
  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Gemini API key is required for Vision handwriting & diagram scanning. Connect your free Gemini key in Ask AI settings.');
  }

  const promptByMode: Record<VisionScanMode, string> = {
    handwriting: `Transcribe ALL handwritten notes, whiteboard content, and equations from this image into clean, structured Notion-ready Markdown.
- Preserve hierarchy with ## and ### headings.
- Transcribe math formulas accurately using LaTeX ($...$ inline and $$...$$ display blocks).
- Convert checklists or action items into - [ ].
- Use > [!TIP] or > [!WARNING] callouts for highlighted/boxed notes.
- Fix minor messy handwriting words contextually while staying faithful to the author's meaning.${courseName ? `\nCourse context: ${courseName}` : ''}`,

    homework_hints: `Analyze this assignment/problem-sheet photo or screenshot carefully.
Output clean Markdown with:
## 1. Transcribed Problem Statement
(Transcribe any equations in LaTeX $...$ / $$...$$ clearly)
## 2. Core Concepts & Formula Needed
## 3. Step-by-Step Guided Solution Approach
(Walk through clear logical steps so the student understands WHY each step works)
## 4. Common Traps to Double Check${courseName ? `\nCourse context: ${courseName}` : ''}`,

    diagram: `Analyze this whiteboard diagram, architecture chart, circuit, or lecture visual.
Output clean Markdown with:
## Visual Overview
## Key Components & Relationships
(Use a Markdown table comparing components/nodes and their roles)
## Flow & Step-by-Step Mechanism
## Active-Recall Check Questions
- [ ] Self-test question 1
- [ ] Self-test question 2${courseName ? `\nCourse context: ${courseName}` : ''}`
  };

  const fullPrompt = extraNotes?.trim()
    ? `${promptByMode[mode]}\n\nAdditional user context: ${extraNotes.trim()}`
    : promptByMode[mode];

  const models = getPreferredGeminiModels(['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']);
  let lastError = 'Gemini Vision request failed.';

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
                { text: fullPrompt },
                { inlineData: { mimeType, data: base64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 2048
          }
        })
      });

      const data: any = await res.json().catch(() => ({}));
      if (res.ok) {
        const md = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (md.trim()) {
          const titleGuess =
            md.match(/^#+\s*(.+)$/m)?.[1]?.replace(/[*`]/g, '').trim() ||
            (mode === 'handwriting'
              ? 'Scanned Lecture Notes'
              : mode === 'homework_hints'
                ? 'Problem Breakdown'
                : 'Diagram Explanation');
          return {
            title: titleGuess.slice(0, 64),
            markdown: md.trim(),
            usedVisionAi: true
          };
        }
      } else {
        lastError = data?.error?.message || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err?.message || 'Network error calling Gemini Vision';
    }
  }

  throw new Error(lastError);
}
