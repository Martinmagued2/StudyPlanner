export interface DigestClassItem {
  courseCode: string;
  courseName: string;
  startTime: string;
  endTime: string;
  room?: string;
  lecturer?: string;
  type?: string;
}

export interface DigestDeadlineItem {
  title: string;
  courseName?: string;
  dueDate: string;
  daysLeft: number;
  kind: 'assignment' | 'exam' | 'quiz' | 'task';
  location?: string;
}

function esc(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime12(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hRaw, mRaw] = time24.split(':');
  const h = parseInt(hRaw, 10);
  const m = parseInt(mRaw, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function wrapEmailShell(title: string, badge: string, accent: string, bodyHtml: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:${accent};padding:26px 28px;color:#ffffff;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;margin-bottom:6px;">
                Nook StudyPlanner • ${esc(badge)}
              </div>
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#ffffff;">${esc(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;font-size:14px;line-height:1.6;color:#334155;">
              ${bodyHtml}
              <div style="margin-top:26px;text-align:center;">
                <a href="${esc(appUrl)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:#4f46e5;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;">
                  Open Nook StudyPlanner
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
              Sent automatically by Nook Intelligent Academic Reminders. Manage your schedule &amp; notification preferences anytime inside Reminders.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderDailyDigestEmail(params: {
  studentName?: string;
  dateLabel: string;
  academicMode: string;
  suspensionReason?: string;
  classesToday: DigestClassItem[];
  deadlinesSoon: DigestDeadlineItem[];
  recommendations: string[];
  appUrl: string;
}): { subject: string; html: string } {
  const {
    studentName = 'Student',
    dateLabel,
    academicMode,
    suspensionReason,
    classesToday,
    deadlinesSoon,
    recommendations,
    appUrl
  } = params;

  const classesHtml = suspensionReason
    ? `<div style="padding:14px 16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;margin-bottom:18px;">
         <strong>${esc(academicMode)}:</strong> ${esc(suspensionReason)}
       </div>`
    : classesToday.length === 0
      ? `<div style="padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;margin-bottom:18px;">
           No classes scheduled for today — great window for deep work and assignments.
         </div>`
      : `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;border-collapse:collapse;">
          ${classesToday
            .map(
              (c, idx) => `<tr>
                <td style="padding:10px 12px;border:1px solid #e2e8f0;background:${idx === 0 ? '#eef2ff' : '#ffffff'};border-radius:8px;">
                  <div style="font-weight:700;color:#0f172a;font-size:14px;">
                    ${idx === 0 ? '▶ ' : ''}${esc(c.courseCode)} — ${esc(c.courseName)}
                  </div>
                  <div style="font-size:12px;color:#475569;margin-top:2px;">
                    🕒 ${esc(formatTime12(c.startTime))} – ${esc(formatTime12(c.endTime))}
                    ${c.room ? ` • 📍 ${esc(c.room)}` : ''}
                    ${c.lecturer ? ` • 👤 ${esc(c.lecturer)}` : ''}
                  </div>
                </td>
              </tr>`
            )
            .join('')}
        </table>`;

  const deadlinesHtml =
    deadlinesSoon.length === 0
      ? `<p style="color:#64748b;margin:0 0 18px;">No urgent deadlines in the next 7 days. Stay ahead by reviewing lecture notes!</p>`
      : `<ul style="margin:0 0 20px;padding-left:18px;">
          ${deadlinesSoon
            .map(
              d => `<li style="margin-bottom:8px;">
                <strong>${esc(d.title)}</strong>${d.courseName ? ` (${esc(d.courseName)})` : ''} —
                <span style="color:${d.daysLeft <= 1 ? '#dc2626' : '#4f46e5'};font-weight:700;">
                  ${d.daysLeft === 0 ? 'Due Today' : d.daysLeft === 1 ? 'Due Tomorrow' : `Due in ${d.daysLeft} days`}
                </span>
                <span style="color:#64748b;font-size:12px;"> (${esc(d.dueDate)})</span>
              </li>`
            )
            .join('')}
        </ul>`;

  const recHtml =
    recommendations.length > 0
      ? `<div style="padding:14px 16px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;">
           <div style="font-weight:700;margin-bottom:6px;">🎯 Recommended Today</div>
           <ul style="margin:0;padding-left:18px;">
             ${recommendations.map(r => `<li style="margin-bottom:4px;">${esc(r)}</li>`).join('')}
           </ul>
         </div>`
      : '';

  const html = wrapEmailShell(
    `Good morning, ${studentName}!`,
    `Daily Digest • ${dateLabel}`,
    'linear-gradient(135deg,#312e81 0%,#4f46e5 100%)',
    `<p style="margin:0 0 16px;">Here is your personalized academic plan for <strong>${esc(dateLabel)}</strong> (${esc(academicMode)}).</p>
     <h2 style="font-size:15px;margin:0 0 10px;color:#0f172a;">📅 Today's Schedule (${classesToday.length})</h2>
     ${classesHtml}
     <h2 style="font-size:15px;margin:0 0 10px;color:#0f172a;">⏰ Upcoming Deadlines &amp; Exams</h2>
     ${deadlinesHtml}
     ${recHtml}`,
    appUrl
  );

  return {
    subject: `📚 Your Study Plan for ${dateLabel} (${classesToday.length} ${classesToday.length === 1 ? 'class' : 'classes'}, ${deadlinesSoon.length} upcoming)`,
    html
  };
}

export function renderDeadlineReminderEmail(params: {
  studentName?: string;
  itemTitle: string;
  courseName?: string;
  kind: 'assignment' | 'exam' | 'quiz' | 'task';
  dueDateLabel: string;
  daysLeft: number;
  location?: string;
  appUrl: string;
}): { subject: string; html: string } {
  const { studentName = 'Student', itemTitle, courseName, kind, dueDateLabel, daysLeft, location, appUrl } = params;
  const urgencyBadge =
    daysLeft <= 1 ? 'URGENT • Due Tomorrow' : `${daysLeft} Days Remaining`;
  const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
  const accent =
    daysLeft <= 1
      ? 'linear-gradient(135deg,#991b1b 0%,#dc2626 100%)'
      : 'linear-gradient(135deg,#9a3412 0%,#ea580c 100%)';

  const tip =
    kind === 'exam'
      ? 'Focus on active recall, past exam questions, and high-yield summary sheets rather than passive rereading.'
      : 'Finish a clean working draft today so you have breathing room for proofreading and submission checks.';

  const html = wrapEmailShell(
    `${kindLabel} Reminder: ${itemTitle}`,
    urgencyBadge,
    accent,
    `<p style="margin:0 0 14px;">Hi ${esc(studentName)}, your upcoming <strong>${esc(kindLabel)}</strong> needs attention:</p>
     <div style="padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:18px;">
       <div style="font-size:16px;font-weight:800;color:#0f172a;">${esc(itemTitle)}</div>
       ${courseName ? `<div style="font-size:13px;color:#4f46e5;font-weight:600;margin-top:4px;">Course: ${esc(courseName)}</div>` : ''}
       <div style="font-size:13px;color:#334155;margin-top:6px;">
         📅 Scheduled Due: <strong>${esc(dueDateLabel)}</strong> (${daysLeft === 1 ? '1 day left' : `${daysLeft} days left`})
       </div>
       ${location ? `<div style="font-size:13px;color:#334155;margin-top:4px;">📍 Location: ${esc(location)}</div>` : ''}
     </div>
     <div style="padding:12px 14px;border-radius:10px;background:#eef2ff;border:1px solid #c7d2fe;color:#312e81;font-size:13px;">
       <strong>💡 Smart Study Tip:</strong> ${esc(tip)}
     </div>`,
    appUrl
  );

  return {
    subject: `⏰ [${daysLeft === 1 ? '1 Day Left' : `${daysLeft} Days Left`}] ${itemTitle}${courseName ? ` (${courseName})` : ''}`,
    html
  };
}

export function renderProcrastinationEmail(params: {
  studentName?: string;
  daysInactive: number;
  pendingCount: number;
  topTasks: string[];
  appUrl: string;
}): { subject: string; html: string } {
  const { studentName = 'Student', daysInactive, pendingCount, topTasks, appUrl } = params;
  const html = wrapEmailShell(
    'Quick 15-Minute Momentum Check-In',
    'Smart Focus Nudge',
    'linear-gradient(135deg,#0f766e 0%,#0284c7 100%)',
    `<p style="margin:0 0 14px;">Hi ${esc(studentName)}, we noticed you haven't checked into Nook StudyPlanner for <strong>${daysInactive} day(s)</strong>, and you currently have <strong>${pendingCount} open study item(s)</strong>.</p>
     <p style="margin:0 0 12px;">Starting is the hardest part — knock out just <strong>one</strong> 15-minute focus sprint from your list:</p>
     <ul style="margin:0 0 18px;padding-left:18px;">
       ${topTasks.slice(0, 4).map(t => `<li style="margin-bottom:6px;font-weight:600;color:#0f172a;">${esc(t)}</li>`).join('')}
     </ul>
     <div style="padding:12px 14px;border-radius:10px;background:#f0fdfa;border:1px solid #99f6e4;color:#115e59;">
       One focused sprint today prevents last-minute cramming later this week. You've got this!
     </div>`,
    appUrl
  );

  return {
    subject: `⚡ Quick 15-min win: ${pendingCount} study items waiting in StudyPlanner`,
    html
  };
}

