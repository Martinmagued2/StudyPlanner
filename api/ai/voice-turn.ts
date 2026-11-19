export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body: any = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }

  const transcript = String(body.transcript || '').trim();
  if (!transcript) {
    return res.status(400).json({ ok: false, error: 'Transcript is required.' });
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';

  if (!geminiKey && !openaiKey) {
    return res.status(200).json({
      ok: false,
      usedLlm: false,
      reason: 'No server AI key configured; fallback to local NLU.'
    });
  }

  const contextJson = JSON.stringify(body.academicContext || {}).slice(0, 14000);
  const historyJson = JSON.stringify((body.history || []).slice(-6)).slice(0, 3500);
  const focusMemory = JSON.stringify(body.focusMemory || {});

  const systemInstruction = `You are Nook Voice AI, a real-time speech-to-speech university academic assistant built into StudyPlanner.
Your responses are spoken aloud, so:
- Be concise (1-4 short, clear, natural sentences), warm, and specific using the real student data provided.
- Never use markdown formatting like **, ##, bullet symbols, or code fences in spokenReply.
- Resolve follow-up pronouns ("it", "that", "this note", "that class") using focusMemory and recent history.
- If the user wants to perform an in-app action, emit a structured "action" object.
  Valid action.type values:
  - "none"
  - "navigate" (payload: { "view": "today" | "courses" | "assignments" | "tasks" | "notes" | "schedule" | "calendar" | "exams" | "grades" | "reminders" | "studyhub" | "quizzes" | "files" })
  - "open_note" (payload: { "noteId": "...", "searchQuery": "..." })
  - "create_task" (requiresConfirmation: true, payload: { "title": "...", "courseId": "...", "dueDate": "YYYY-MM-DD", "priority": "high" | "medium" | "low" })
  - "create_note" (requiresConfirmation: true, payload: { "title": "...", "courseId": "...", "summary": "..." })
  - "create_reminder" (requiresConfirmation: true, payload: { "title": "...", "date": "YYYY-MM-DD", "startTime": "HH:MM" })
  - "complete_task" (requiresConfirmation: true, payload: { "taskId": "...", "title": "..." })

Return ONLY valid raw JSON with keys:
{
  "spokenReply": string,
  "topicFocus": string,
  "referencedNoteId": string | null,
  "referencedCourseId": string | null,
  "referencedTaskId": string | null,
  "action": {
    "type": string,
    "requiresConfirmation": boolean,
    "confirmationPrompt": string,
    "payload": object
  }
}`;

  const userPrompt = `Student live workspace snapshot:
${contextJson}

Recent voice memory: ${focusMemory}
Recent conversation turns: ${historyJson}

User just said: "${transcript}"`;

  try {
    let rawText = '';
    if (geminiKey) {
      for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const gRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 450,
              responseMimeType: 'application/json'
            }
          })
        });
        if (!gRes.ok) continue;
        const gJson: any = await gRes.json().catch(() => ({}));
        const candidate = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (candidate.trim()) {
          rawText = candidate;
          break;
        }
      }
    } else if (openaiKey) {
      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.35,
          max_tokens: 450
        })
      });
      const oJson: any = await oRes.json().catch(() => ({}));
      rawText = oJson?.choices?.[0]?.message?.content || '';
    }

    if (!rawText) {
      return res.status(200).json({ ok: false, usedLlm: false });
    }

    const cleaned = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json({ ok: true, usedLlm: true, result: parsed });
  } catch (err: any) {
    return res.status(200).json({ ok: false, usedLlm: false, reason: err?.message || 'Voice LLM error' });
  }
}

