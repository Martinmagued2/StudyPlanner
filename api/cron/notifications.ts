import { sbInsert, sbSelect } from '../_lib/supabaseAdmin';
import { sendViaGmailSmtp } from '../_lib/gmailMailer';
import {
  renderDailyDigestEmail,
  renderDeadlineReminderEmail,
  renderProcrastinationEmail,
  DigestClassItem,
  DigestDeadlineItem
} from '../_lib/emailRenderer';

interface PrefRow {
  user_id: string;
  email: string;
  timezone?: string;
  daily_digest_enabled?: boolean;
  daily_digest_time?: string;
  deadline_reminders_enabled?: boolean;
  reminder_days_before?: number[];
  anti_procrastination_enabled?: boolean;
  anti_procrastination_frequency?: 'smart' | 'gentle' | 'weekly_only';
  weekly_summary_enabled?: boolean;
  enable_classes?: boolean;
  enable_exams?: boolean;
  enable_assignments?: boolean;
  last_app_open_at?: string;
}

function getUserLocalParts(now: Date, timeZone: string): { dateKey: string; hour: number; dayOfWeek: number; label: string } {
  let tz = timeZone || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(now);
  } catch {
    tz = 'UTC';
  }
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false
  }).format(now);
  const weekdayShort = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short'
  }).format(now);
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(now);

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dateKey,
    hour: parseInt(hourStr, 10) % 24,
    dayOfWeek: dayMap[weekdayShort] ?? now.getDay(),
    label
  };
}

function diffCalendarDays(targetKey: string, baseKey: string): number {
  const t = new Date(`${targetKey.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${baseKey.slice(0, 10)}T00:00:00Z`).getTime();
  if (isNaN(t) || isNaN(b)) return 999;
  return Math.round((t - b) / 86400000);
}

function parseSlotDayIndex(dayRaw: string): number {
  const s = (dayRaw || '').trim().toLowerCase().slice(0, 3);
  const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return map[s] ?? -1;
}

function resolveAcademicStateForDate(academicConfig: any, dateKey: string): { modeLabel: string; suspensionReason?: string } {
  if (!academicConfig) return { modeLabel: 'Normal Semester Mode' };

  const pref = academicConfig.modePreference || 'auto';
  const holidays: any[] = Array.isArray(academicConfig.holidays) ? academicConfig.holidays : [];

  for (const h of holidays) {
    const start = (h.startDate || h.date || '').slice(0, 10);
    const end = (h.endDate || start).slice(0, 10);
    if (start && dateKey >= start && dateKey <= end) {
      return {
        modeLabel: h.title || h.name || 'University Holiday',
        suspensionReason: h.suspendClasses !== false ? `Classes suspended for ${h.title || h.name || 'University Holiday'}.` : undefined
      };
    }
  }

  const inMidterm =
    academicConfig.midtermStartDate &&
    academicConfig.midtermEndDate &&
    dateKey >= academicConfig.midtermStartDate.slice(0, 10) &&
    dateKey <= academicConfig.midtermEndDate.slice(0, 10);
  const inFinal =
    academicConfig.finalStartDate &&
    academicConfig.finalEndDate &&
    dateKey >= academicConfig.finalStartDate.slice(0, 10) &&
    dateKey <= academicConfig.finalEndDate.slice(0, 10);

  if (pref === 'normal') {
    return { modeLabel: 'Normal Semester Mode' };
  }
  if (pref === 'final' || (pref === 'auto' && inFinal)) {
    return {
      modeLabel: 'Final Exam Mode',
      suspensionReason: academicConfig.suspendClassesDuringFinals !== false ? 'Regular lectures suspended during Final Exam Period.' : undefined
    };
  }
  if (pref === 'midterm' || (pref === 'auto' && inMidterm)) {
    return {
      modeLabel: 'Midterm Mode',
      suspensionReason: academicConfig.suspendClassesDuringMidterm ? 'Regular lectures suspended during Midterm Period.' : undefined
    };
  }
  return { modeLabel: 'Normal Semester Mode' };
}

export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
    const querySecret = req.query?.secret || '';
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized notification runner invocation' });
    }
  }

  const appUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://studyplanner.vercel.app');

  try {
    const prefsList = await sbSelect<PrefRow>('notification_preferences', 'select=*');
    const now = new Date();
    const summary: any[] = [];

    for (const pref of prefsList) {
      if (!pref.email || !pref.user_id) continue;
      const uidEnc = encodeURIComponent(pref.user_id);
      const local = getUserLocalParts(now, pref.timezone || 'UTC');
      const digestHour = parseInt((pref.daily_digest_time || '08:00').split(':')[0] || '8', 10);

      const [courses, assignments, exams, tasks, existingLogs, profiles, workspaces] = await Promise.all([
        sbSelect<any>('courses', `user_id=eq.${uidEnc}&select=*`).catch(() => []),
        sbSelect<any>('assignments', `user_id=eq.${uidEnc}&select=*`).catch(() => []),
        sbSelect<any>('exams', `user_id=eq.${uidEnc}&select=*`).catch(() => []),
        sbSelect<any>('tasks', `user_id=eq.${uidEnc}&select=*`).catch(() => []),
        sbSelect<any>(
          'email_notification_logs',
          `user_id=eq.${uidEnc}&select=notification_type,entity_id,days_before,scheduled_for_date,status&order=sent_at.desc&limit=250`
        ).catch(() => []),
        sbSelect<any>('profiles', `id=eq.${uidEnc}&select=name`).catch(() => []),
        sbSelect<any>('workspaces', `user_id=eq.${uidEnc}&select=data`).catch(() => [])
      ]);

      const studentName = profiles[0]?.name || 'Student';
      const academicConfig = workspaces[0]?.data?.academicConfig;
      const academicState = resolveAcademicStateForDate(academicConfig, local.dateKey);

      const sentSignatures = new Set<string>(
        existingLogs
          .filter(l => l.status === 'sent')
          .map(l => `${l.notification_type}|${l.entity_id || ''}|${l.days_before ?? 0}|${l.scheduled_for_date}`)
      );

      const courseMap = new Map<string, any>();
      courses.forEach(c => courseMap.set(c.id, c));

      const classesToday: DigestClassItem[] = [];
      if (pref.enable_classes !== false && !academicState.suspensionReason) {
        courses
          .filter(c => !c.is_archived && !c.archived)
          .forEach(c => {
            const slots = Array.isArray(c.meeting_slots) ? c.meeting_slots : [];
            slots.forEach((slot: any) => {
              if (parseSlotDayIndex(slot.day) === local.dayOfWeek) {
                classesToday.push({
                  courseCode: c.code || 'COURSE',
                  courseName: c.name || 'Lecture',
                  startTime: slot.startTime || '09:00',
                  endTime: slot.endTime || '10:00',
                  room: slot.room || c.location,
                  lecturer: c.instructor,
                  type: slot.type || 'lecture'
                });
              }
            });
          });
        classesToday.sort((a, b) => a.startTime.localeCompare(b.startTime));
      }

      const upcomingDeadlines: Array<DigestDeadlineItem & { entityId: string }> = [];
      if (pref.enable_assignments !== false) {
        assignments
          .filter(a => a.status !== 'submitted' && a.due_date)
          .forEach(a => {
            const dk = String(a.due_date).slice(0, 10);
            const diff = diffCalendarDays(dk, local.dateKey);
            if (diff >= 0 && diff <= 7) {
              const c = courseMap.get(a.course_id);
              upcomingDeadlines.push({
                entityId: `asg_${a.id}_${dk}`,
                title: a.title,
                courseName: c ? `${c.code} ${c.name}` : undefined,
                dueDate: dk,
                daysLeft: diff,
                kind: 'assignment'
              });
            }
          });
      }

      if (pref.enable_exams !== false) {
        exams
          .filter(ex => ex.date)
          .forEach(ex => {
            const dk = String(ex.date).slice(0, 10);
            const diff = diffCalendarDays(dk, local.dateKey);
            if (diff >= 0 && diff <= 7) {
              const c = courseMap.get(ex.course_id);
              upcomingDeadlines.push({
                entityId: `exam_${ex.id}_${dk}`,
                title: ex.name || 'Exam',
                courseName: c ? `${c.code} ${c.name}` : undefined,
                dueDate: dk,
                daysLeft: diff,
                kind: 'exam',
                location: ex.room
              });
            }
          });
      }

      tasks
        .filter(t => !t.completed && t.due_date)
        .forEach(t => {
          const dk = String(t.due_date).slice(0, 10);
          const diff = diffCalendarDays(dk, local.dateKey);
          if (diff >= 0 && diff <= 3) {
            const c = courseMap.get(t.course_id);
            upcomingDeadlines.push({
              entityId: `task_${t.id}_${dk}`,
              title: t.title,
              courseName: c ? `${c.code} ${c.name}` : undefined,
              dueDate: dk,
              daysLeft: diff,
              kind: 'task'
            });
          }
        });

      upcomingDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);

      const recordAndSend = async (
        notificationType: string,
        entityId: string,
        daysBefore: number,
        scheduledForDate: string,
        subject: string,
        html: string
      ) => {
        const sig = `${notificationType}|${entityId}|${daysBefore}|${scheduledForDate}`;
        if (sentSignatures.has(sig)) return;

        const result = await sendViaGmailSmtp(pref.email, subject, html);
        await sbInsert('email_notification_logs', {
          id: `elog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          user_id: pref.user_id,
          recipient_email: pref.email,
          notification_type: notificationType,
          entity_id: entityId,
          days_before: daysBefore,
          scheduled_for_date: scheduledForDate,
          subject,
          status: result.ok ? 'sent' : 'failed',
          provider_message_id: result.id || null,
          error_message: result.error || null,
          retry_count: result.retries
        }).catch(() => false);

        if (result.ok) sentSignatures.add(sig);
        summary.push({ userId: pref.user_id, notificationType, ok: result.ok, error: result.error });
      };

      // A. Daily Academic Digest
      if (pref.daily_digest_enabled !== false && local.hour === digestHour) {
        const recs: string[] = [];
        if (upcomingDeadlines[0]) {
          recs.push(
            `Prioritize "${upcomingDeadlines[0].title}" (${upcomingDeadlines[0].daysLeft <= 1 ? 'due soon' : `${upcomingDeadlines[0].daysLeft} days left`}).`
          );
        }
        if (classesToday.length > 0) {
          recs.push(`Review quick notes 15 minutes before ${classesToday[0].courseCode}.`);
        }
        const openTasksCount = tasks.filter(t => !t.completed).length;
        if (openTasksCount > 0) {
          recs.push(`You have ${openTasksCount} open task(s) — tackle 1 high-priority item early.`);
        }
        const rendered = renderDailyDigestEmail({
          studentName,
          dateLabel: local.label,
          academicMode: academicState.modeLabel,
          suspensionReason: academicState.suspensionReason,
          classesToday,
          deadlinesSoon: upcomingDeadlines,
          recommendations: recs,
          appUrl
        });
        await recordAndSend('daily_digest', 'digest', 0, local.dateKey, rendered.subject, rendered.html);
      }

      // B. 3-Day, 2-Day, 1-Day Deadline Reminders
      if (pref.deadline_reminders_enabled !== false) {
        const targetDays =
          Array.isArray(pref.reminder_days_before) && pref.reminder_days_before.length > 0
            ? pref.reminder_days_before
            : [3, 2, 1];
        for (const item of upcomingDeadlines) {
          if (targetDays.includes(item.daysLeft)) {
            const rendered = renderDeadlineReminderEmail({
              studentName,
              itemTitle: item.title,
              courseName: item.courseName,
              kind: item.kind,
              dueDateLabel: item.dueDate,
              daysLeft: item.daysLeft,
              location: item.location,
              appUrl
            });
            await recordAndSend(
              'deadline_reminder',
              item.entityId,
              item.daysLeft,
              item.dueDate,
              rendered.subject,
              rendered.html
            );
          }
        }
      }

      // C. Anti-Procrastination Nudge & Weekly Summary
      const nudgeFreq = pref.anti_procrastination_frequency || 'smart';
      if (pref.anti_procrastination_enabled !== false && nudgeFreq !== 'weekly_only' && local.hour === 12 && pref.last_app_open_at) {
        const lastOpenKey = getUserLocalParts(new Date(pref.last_app_open_at), pref.timezone || 'UTC').dateKey;
        const inactiveDays = diffCalendarDays(local.dateKey, lastOpenKey);
        const minDays = nudgeFreq === 'gentle' ? 3 : 2;
        const openTasks = tasks.filter(t => !t.completed).map(t => t.title);
        if (inactiveDays >= minDays && openTasks.length > 0) {
          const nudgeBucket = `${local.dateKey.slice(0, 7)}-b${Math.ceil(parseInt(local.dateKey.slice(8, 10), 10) / 3)}`;
          const rendered = renderProcrastinationEmail({
            studentName,
            daysInactive: inactiveDays,
            pendingCount: openTasks.length,
            topTasks: openTasks,
            appUrl
          });
          await recordAndSend('anti_procrastination', nudgeBucket, 0, local.dateKey, rendered.subject, rendered.html);
        }
      }

      // Weekly Summary (Sundays at 18:00 local time or digestHour)
      if (pref.weekly_summary_enabled !== false && local.dayOfWeek === 0 && local.hour === 18) {
        const openTasks = tasks.filter(t => !t.completed);
        const weekKey = `wk_${local.dateKey}`;
        const rendered = renderDailyDigestEmail({
          studentName,
          dateLabel: `Weekly Lookahead (${local.label})`,
          academicMode: academicState.modeLabel,
          classesToday,
          deadlinesSoon: upcomingDeadlines,
          recommendations: [
            `You have ${upcomingDeadlines.length} upcoming deadline(s) or exam(s) in the next 7 days.`,
            `${openTasks.length} open task(s) remain in your queue — pick 3 priorities for tomorrow.`
          ],
          appUrl
        });
        await recordAndSend('weekly_summary', weekKey, 0, local.dateKey, `🗓️ ${rendered.subject}`, rendered.html);
      }
    }

    return res.status(200).json({ ok: true, processedUsers: prefsList.length, sent: summary.length, details: summary });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Cron execution error' });
  }
}
