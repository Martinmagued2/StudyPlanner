export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(200).json({
      ok: false,
      available: false,
      reason: 'OPENAI_API_KEY is not configured on the server; using standard browser speech + Gemini/local voice turn.'
    });
  }

  let body: any = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: body.voice || 'verse',
        instructions:
          body.instructions ||
          'You are Nook, an intelligent, concise, friendly university study assistant inside StudyPlanner. Keep spoken answers crisp, natural, and directly grounded in the student data provided.'
      })
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.client_secret?.value) {
      return res.status(200).json({
        ok: false,
        available: false,
        reason: data?.error?.message || `OpenAI Realtime session status ${response.status}`
      });
    }

    return res.status(200).json({
      ok: true,
      available: true,
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
      model: data.model || 'gpt-4o-realtime-preview-2024-12-17'
    });
  } catch (err: any) {
    return res.status(200).json({
      ok: false,
      available: false,
      reason: err?.message || 'Failed to mint OpenAI Realtime token'
    });
  }
}

