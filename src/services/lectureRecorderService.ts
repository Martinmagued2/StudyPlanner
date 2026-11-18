import { PriorityLevel } from '../types';
import { queryGemini } from './fileAiService';

export interface DetectedLectureDeadline {
  title: string;
  dueDate: string; // YYYY-MM-DD
  kind: 'task' | 'assignment' | 'exam';
  priority: PriorityLevel;
}

export interface ProcessedLectureResult {
  title: string;
  notesMarkdown: string;
  extractedDeadlines: DetectedLectureDeadline[];
  usedAi: boolean;
}

function defaultDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function extractDeadlinesHeuristic(transcript: string): DetectedLectureDeadline[] {
  const sentences = transcript.split(/(?<=[.!?])\s+|\n+/);
  const found: DetectedLectureDeadline[] = [];

  for (const s of sentences) {
    if (
      /\b(due|deadline|submit|submission|midterm|quiz|exam|test|homework|assignment|lab)\b/i.test(s) &&
      s.trim().length > 10
    ) {
      const isExam = /\b(midterm|quiz|exam|test)\b/i.test(s);
      const isAsg = /\b(assignment|homework|project|lab|submit)\b/i.test(s);
      found.push({
        title: s.trim().slice(0, 72),
        dueDate: defaultDateInDays(isExam ? 10 : 5),
        kind: isExam ? 'exam' : isAsg ? 'assignment' : 'task',
        priority: isExam ? 'high' : 'medium'
      });
    }
    if (found.length >= 5) break;
  }

  return found;
}

export async function processLectureTranscript(params: {
  transcript: string;
  courseCode?: string;
  courseName?: string;
  durationLabel?: string;
  recordedDate?: string;
}): Promise<ProcessedLectureResult> {
  const { transcript, courseCode, courseName, durationLabel, recordedDate } = params;
  const cleanTranscript = transcript.trim();
  const dateLabel = recordedDate || new Date().toISOString().split('T')[0];
  const courseTag = courseCode || courseName || 'Lecture';

  const prompt = `Convert this raw live university lecture speech transcript into **clean, well-organized Notion Lecture Notes** AND extract every deadline/exam/quiz/reading announced by the professor.

Course: ${courseCode || ''} ${courseName || ''}
Date: ${dateLabel}
Recording Duration: ${durationLabel || 'Live Session'}

Raw Transcript:
"""
${cleanTranscript.slice(0, 14000)}
"""

Return ONLY valid JSON with this shape:
{
  "title": "Concise Lecture Title (${dateLabel})",
  "notesMarkdown": "## Lecture Summary\\n...\\n\\n## Key Concepts & Definitions\\n...\\n\\n## Examples & Formulas\\n...\\n\\n## Exam Focus & Action Items\\n- [ ] ...",
  "extractedDeadlines": [
    {
      "title": "Exact announced deadline or study action",
      "dueDate": "YYYY-MM-DD",
      "kind": "assignment",
      "priority": "high"
    }
  ]
}
Allowed kind: task, assignment, exam. Allowed priority: low, medium, high.`;

  const aiRaw = await queryGemini(
    prompt,
    'You convert spoken university lectures into crisp Notion study notes and action items. Output valid JSON only.'
  );

  if (aiRaw) {
    try {
      const cleaned = aiRaw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);

      if (parsed?.notesMarkdown) {
        return {
          title: String(parsed.title || `${courseTag} Lecture Notes (${dateLabel})`),
          notesMarkdown: String(parsed.notesMarkdown),
          extractedDeadlines: Array.isArray(parsed.extractedDeadlines)
            ? parsed.extractedDeadlines.map((d: any) => ({
                title: String(d.title || 'Follow up on lecture item'),
                dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(d.dueDate || ''))
                  ? String(d.dueDate)
                  : defaultDateInDays(7),
                kind: (['task', 'assignment', 'exam'].includes(d.kind) ? d.kind : 'task') as
                  | 'task'
                  | 'assignment'
                  | 'exam',
                priority: (['low', 'medium', 'high'].includes(d.priority) ? d.priority : 'medium') as PriorityLevel
              }))
            : [],
          usedAi: true
        };
      }
    } catch {
      // Fallback below
    }
  }

  const lines = cleanTranscript
    .split(/(?<=[.!?])\s+|\n+/)
    .map(l => l.trim())
    .filter(Boolean);
  const bullets = lines.slice(0, 12).map(l => `- ${l}`).join('\n');
  const deadlines = extractDeadlinesHeuristic(cleanTranscript);

  return {
    title: `${courseTag} Lecture Notes (${dateLabel})`,
    notesMarkdown: [
      `## Lecture Summary (${courseTag})`,
      `Recorded ${dateLabel}${durationLabel ? ` • ${durationLabel}` : ''}.`,
      '',
      '## Key Points Captured',
      bullets || '- (No speech captured — add summary notes here.)',
      '',
      '## Detected Deadlines & Action Items',
      deadlines.length > 0
        ? deadlines.map(d => `- [ ] ${d.title} *(target: ${d.dueDate})*`).join('\n')
        : '- [ ] Review recorded lecture concepts within 24 hours',
      '',
      '## Raw Transcript',
      `> ${cleanTranscript.slice(0, 1800)}`
    ].join('\n'),
    extractedDeadlines: deadlines,
    usedAi: false
  };
}
