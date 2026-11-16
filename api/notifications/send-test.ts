import { sbInsert } from '../_lib/supabaseAdmin';
import { isGmailSmtpConfigured, sendViaGmailSmtp } from '../_lib/gmailMailer';
import {
  renderDailyDigestEmail,
  renderDeadlineReminderEmail,
  renderProcrastinationEmail,
  DigestClassItem,
  DigestDeadlineItem
} from '../_lib/emailRenderer';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isGmailSmtpConfigured()) {
    return res.status(400).json({
      ok: false,
      configured: false,
      error:
        'Gmail SMTP is not configured on the server yet. Add GMAIL_USER and GMAIL_APP_PASSWORD (your 16-char Google App Password) in Vercel Environment Variables.'
    });
  }

  let body: any = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }

  const to = String(body.email || process.env.GMAIL_USER || '').trim();
  const userId = String(body.userId || '').trim();
  const type = (body.type || 'digest') as 'digest' | 'deadline' | 'nudge';
  const snapshot = body.snapshot || {};

  if (!to || !to.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid recipient email address.' });
  }

  const appUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://studyplanner.vercel.app');

  const studentName = snapshot.studentName || 'Student';
  const dateLabel =
    snapshot.dateLabel ||
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const classesToday: DigestClassItem[] = Array.isArray(snapshot.classesToday) ? snapshot.classesToday : [];
  const deadlinesSoon: DigestDeadlineItem[] = Array.isArray(snapshot.deadlinesSoon) ? snapshot.deadlinesSoon : [];

  let rendered: { subject: string; html: string };
  if (type === 'deadline') {
    const first = deadlinesSoon[0];
    rendered = renderDeadlineReminderEmail({
      studentName,
      itemTitle: first?.title || 'Upcoming Coursework Submission',
      courseName: first?.courseName || 'Academic Course',
      kind: first?.kind || 'assignment',
      dueDateLabel: first?.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      daysLeft: typeof first?.daysLeft === 'number' ? first.daysLeft : 2,
      location: first?.location,
      appUrl
    });
  } else if (type === 'nudge') {
    rendered = renderProcrastinationEmail({
      studentName,
      daysInactive: 2,
      pendingCount: Math.max(deadlinesSoon.length, 2),
      topTasks:
        deadlinesSoon.length > 0
          ? deadlinesSoon.map(d => d.title)
          : ['Review lecture notes (15 min)', 'Start highest priority task'],
      appUrl
    });
  } else {
    rendered = renderDailyDigestEmail({
      studentName,
      dateLabel,
      academicMode: snapshot.academicMode || 'Normal Semester Mode',
      suspensionReason: snapshot.suspensionReason,
      classesToday,
      deadlinesSoon,
      recommendations:
        Array.isArray(snapshot.recommendations) && snapshot.recommendations.length > 0
          ? snapshot.recommendations
          : ['Start with your highest-priority assignment block for 25 minutes.'],
      appUrl
    });
  }

  try {
    const result = await sendViaGmailSmtp(to, rendered.subject, rendered.html);
    const dateKey = new Date().toISOString().slice(0, 10);

    if (userId) {
      await sbInsert('email_notification_logs', {
        id: `elog_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        user_id: userId,
        recipient_email: to,
        notification_type: `test_${type}`,
        entity_id: `manual_${Date.now()}`,
        days_before: 0,
        scheduled_for_date: dateKey,
        subject: rendered.subject,
        status: result.ok ? 'sent' : 'failed',
        provider_message_id: result.id || null,
        error_message: result.ok ? null : result.error || 'Gmail SMTP send failed',
        retry_count: result.retries
      }).catch(() => false);
    }

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        configured: result.configured,
        error: result.error || 'Gmail SMTP failed to deliver message'
      });
    }

    return res.status(200).json({
      ok: true,
      configured: true,
      id: result.id,
      subject: rendered.subject
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      configured: true,
      error: err?.message || 'Unexpected Gmail SMTP server error'
    });
  }
}
