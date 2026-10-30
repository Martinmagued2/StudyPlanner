import { Course, Assignment, Task, CalendarEvent, Exam, MeetingSlot } from '../types';

export interface AcademicScheduleContext {
  todayDateStr: string;
  todayTimeStr: string;
  todayDayName: string;
  todayDayIndex: number;
  tomorrowDateStr: string;
  tomorrowDayName: string;
  tomorrowDayIndex: number;
  todayClasses: ScheduledClassItem[];
  tomorrowClasses: ScheduledClassItem[];
  nextUpcomingClass: (ScheduledClassItem & { dayName: string }) | null;
  weeklySchedule: Record<string, ScheduledClassItem[]>;
  unconfiguredCourses: Course[];
  tomorrowAssignments: Assignment[];
  todayAssignments: Assignment[];
  next7DaysAssignments: { assignment: Assignment; courseCode: string; daysRemaining: number }[];
  upcomingExams: { exam: Exam; courseCode: string; dateStr: string; daysRemaining: number }[];
  activeTasks: Task[];
  weeklySummaryText: string;
}

export interface ScheduledClassItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  time: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  instructor: string;
  color: string;
  startMinutes?: number;
  endMinutes?: number;
  status?: 'completed' | 'in_progress' | 'upcoming';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseDayIndex(day: any): number {
  if (typeof day === 'number') return Math.abs(day) % 7;
  if (!day) return 1;
  const str = String(day).toLowerCase().trim();
  if (str === 'sun' || str.startsWith('sunday')) return 0;
  if (str === 'mon' || str.startsWith('monday')) return 1;
  if (str === 'tue' || str.startsWith('tuesday')) return 2;
  if (str === 'wed' || str.startsWith('wednesday')) return 3;
  if (str === 'thu' || str.startsWith('thursday')) return 4;
  if (str === 'fri' || str.startsWith('friday')) return 5;
  if (str === 'sat' || str.startsWith('saturday')) return 6;
  const num = parseInt(str, 10);
  return isNaN(num) ? 1 : Math.abs(num) % 7;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export interface LiveScheduleStatus {
  currentClass: (ScheduledClassItem & { remainingMinutes: number }) | null;
  nextTodayClass: (ScheduledClassItem & { startsInMinutes: number }) | null;
  nextUpcomingClass: (ScheduledClassItem & { dayName: string; isTomorrow: boolean; daysAway: number }) | null;
  activeOrNextClass: {
    status: 'happening_now' | 'upcoming_today' | 'upcoming_future' | 'none';
    classItem: (ScheduledClassItem & { dayName?: string; isTomorrow?: boolean }) | null;
    badgeLabel: string;
    subLabel: string;
    isToday: boolean;
  };
  todayClasses: (ScheduledClassItem & {
    startMinutes: number;
    endMinutes: number;
    status: 'completed' | 'in_progress' | 'upcoming';
  })[];
}

export function getLiveScheduleStatus(courses: Course[]): LiveScheduleStatus {
  const now = new Date();
  const currentDayNum = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Get and sort today's classes chronologically by start time
  const todayClasses = courses.flatMap(c => {
    const slots = c.meetingSlots || [];
    return slots
      .filter(s => parseDayIndex(s.day) === currentDayNum)
      .map(s => {
        const startMin = parseTimeToMinutes(s.startTime);
        const endMin = parseTimeToMinutes(s.endTime);
        let status: 'completed' | 'in_progress' | 'upcoming' = 'upcoming';
        if (currentMinutes >= endMin) {
          status = 'completed';
        } else if (currentMinutes >= startMin && currentMinutes < endMin) {
          status = 'in_progress';
        }

        return {
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          time: `${s.startTime} - ${s.endTime}`,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || c.location || 'Campus Hall',
          type: s.type || 'Lecture',
          instructor: c.instructor || 'Faculty Staff',
          color: c.color || '#3b82f6',
          startMinutes: startMin,
          endMinutes: endMin,
          status
        };
      });
  }).sort((a, b) => a.startMinutes - b.startMinutes);

  // 1. Is any class in progress right now?
  const currentClassItem = todayClasses.find(c => c.status === 'in_progress');
  const currentClass = currentClassItem ? {
    ...currentClassItem,
    remainingMinutes: Math.max(0, currentClassItem.endMinutes - currentMinutes)
  } : null;

  // 2. Is there an upcoming class today?
  const nextTodayItem = todayClasses.find(c => c.status === 'upcoming');
  const nextTodayClass = nextTodayItem ? {
    ...nextTodayItem,
    startsInMinutes: Math.max(0, nextTodayItem.startMinutes - currentMinutes)
  } : null;

  // 3. If no active/upcoming class today, search upcoming 7 days
  let nextUpcomingClass: (ScheduledClassItem & { dayName: string; isTomorrow: boolean; daysAway: number }) | null = null;
  if (!currentClass && !nextTodayClass) {
    for (let offset = 1; offset <= 7; offset++) {
      const targetDay = (currentDayNum + offset) % 7;
      const futureClasses = courses.flatMap(c => {
        const slots = c.meetingSlots || [];
        return slots
          .filter(s => parseDayIndex(s.day) === targetDay)
          .map(s => ({
            courseId: c.id,
            courseCode: c.code,
            courseName: c.name,
            time: `${s.startTime} - ${s.endTime}`,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || c.location || 'Campus Hall',
            type: s.type || 'Lecture',
            instructor: c.instructor || 'Faculty Staff',
            color: c.color || '#3b82f6',
            startMinutes: parseTimeToMinutes(s.startTime)
          }));
      }).sort((a, b) => a.startMinutes - b.startMinutes);

      if (futureClasses.length > 0) {
        nextUpcomingClass = {
          ...futureClasses[0],
          dayName: DAY_NAMES[targetDay],
          isTomorrow: offset === 1,
          daysAway: offset
        };
        break;
      }
    }
  }

  // Active or Next Class Summary for Banners & Sidebar
  let activeOrNextClass: LiveScheduleStatus['activeOrNextClass'];
  if (currentClass) {
    activeOrNextClass = {
      status: 'happening_now',
      classItem: currentClass,
      badgeLabel: 'Happening Now',
      subLabel: `Ends in ${currentClass.remainingMinutes}m (${currentClass.endTime})`,
      isToday: true
    };
  } else if (nextTodayClass) {
    const hours = Math.floor(nextTodayClass.startsInMinutes / 60);
    const mins = nextTodayClass.startsInMinutes % 60;
    const timeNotice = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
    activeOrNextClass = {
      status: 'upcoming_today',
      classItem: nextTodayClass,
      badgeLabel: 'Next Today',
      subLabel: `${nextTodayClass.startTime} (${timeNotice})`,
      isToday: true
    };
  } else if (nextUpcomingClass) {
    const dayLabel = nextUpcomingClass.isTomorrow ? 'Tomorrow' : nextUpcomingClass.dayName;
    activeOrNextClass = {
      status: 'upcoming_future',
      classItem: nextUpcomingClass,
      badgeLabel: dayLabel,
      subLabel: `${dayLabel} at ${nextUpcomingClass.startTime}`,
      isToday: false
    };
  } else {
    activeOrNextClass = {
      status: 'none',
      classItem: null,
      badgeLabel: 'No Classes',
      subLabel: 'Schedule flexible',
      isToday: false
    };
  }

  return {
    currentClass,
    nextTodayClass,
    nextUpcomingClass,
    activeOrNextClass,
    todayClasses
  };
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

export function getAcademicScheduleContext(
  courses: Course[],
  assignments: Assignment[],
  tasks: Task[],
  events: CalendarEvent[],
  exams: Exam[]
): AcademicScheduleContext {
  const now = new Date();
  const todayDayIndex = now.getDay();
  const todayDayName = DAY_NAMES[todayDayIndex];
  const todayDateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const todayTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDayIndex = tomorrow.getDay();
  const tomorrowDayName = DAY_NAMES[tomorrowDayIndex];
  const tomorrowDateStr = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getClassesForDay = (dayIdx: number): ScheduledClassItem[] => {
    return courses.flatMap(c => {
      const slots = c.meetingSlots || [];
      return slots
        .filter(s => parseDayIndex(s.day) === dayIdx)
        .map(s => ({
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          time: `${formatTime12h(s.startTime)} – ${formatTime12h(s.endTime)}`,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || c.location || 'Campus Hall',
          type: s.type || 'Lecture',
          instructor: c.instructor || 'Faculty Staff',
          color: c.color || '#3b82f6'
        }));
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const todayClasses = getClassesForDay(todayDayIndex);
  const tomorrowClasses = getClassesForDay(tomorrowDayIndex);

  // Build weekly schedule dictionary
  const weeklySchedule: Record<string, ScheduledClassItem[]> = {};
  DAY_NAMES.forEach((dayName, idx) => {
    weeklySchedule[dayName] = getClassesForDay(idx);
  });

  // Find next upcoming class in future days (offset 1 to 7)
  let nextUpcomingClass: (ScheduledClassItem & { dayName: string }) | null = null;
  for (let offset = 1; offset <= 7; offset++) {
    const targetDay = (todayDayIndex + offset) % 7;
    const classes = getClassesForDay(targetDay);
    if (classes.length > 0) {
      nextUpcomingClass = {
        ...classes[0],
        dayName: DAY_NAMES[targetDay]
      };
      break;
    }
  }

  // Courses that don't have meetingSlots assigned yet
  const unconfiguredCourses = courses.filter(c => !c.meetingSlots || c.meetingSlots.length === 0);

  // Tomorrow's assignments
  const tomorrowMidnight = new Date(tomorrow);
  tomorrowMidnight.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tomorrowAssignments = assignments.filter(a => {
    if (a.status === 'completed' || !a.dueDate) return false;
    const d = new Date(a.dueDate);
    return d >= tomorrowMidnight && d <= tomorrowEnd;
  });

  // Today's assignments
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todayAssignments = assignments.filter(a => {
    if (a.status === 'completed' || !a.dueDate) return false;
    const d = new Date(a.dueDate);
    return d >= todayMidnight && d <= todayEnd;
  });

  // Next 7 days assignments
  const next7DaysAssignments = assignments
    .filter(a => {
      if (a.status === 'completed' || !a.dueDate) return false;
      const d = new Date(a.dueDate);
      const diffDays = Math.round((d.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .map(a => {
      const d = new Date(a.dueDate);
      const diffDays = Math.round((d.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const c = courses.find(course => course.id === a.courseId);
      return {
        assignment: a,
        courseCode: c?.code || 'General',
        daysRemaining: diffDays
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Upcoming exams in next 14 days
  const upcomingExams = exams
    .filter(e => {
      const d = new Date(e.date);
      const diffDays = Math.round((d.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    })
    .map(e => {
      const d = new Date(e.date);
      const diffDays = Math.round((d.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const c = courses.find(course => course.id === e.courseId);
      return {
        exam: e,
        courseCode: c?.code || 'Exam',
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        daysRemaining: diffDays
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const activeTasks = tasks.filter(t => !t.completed);

  // Weekly timetable text summary
  const weeklySummaryText = courses.length === 0
    ? 'No courses enrolled yet.'
    : courses.map(c => {
        const slots = c.meetingSlots || [];
        if (slots.length === 0) {
          return `• ${c.code}: ${c.name} (${c.instructor || 'Faculty Staff'}) — Flexible / No specific class hours set in Timetable.`;
        }
        const slotText = slots
          .map(s => `${DAY_NAMES[parseDayIndex(s.day)]} ${formatTime12h(s.startTime)}–${formatTime12h(s.endTime)} (${s.type || 'Lecture'}, ${s.location || c.location || 'Hall'})`)
          .join('; ');
        return `• ${c.code}: ${c.name} (${c.instructor || 'Staff'}) — Schedule: ${slotText}`;
      }).join('\n');

  return {
    todayDateStr,
    todayTimeStr,
    todayDayName,
    todayDayIndex,
    tomorrowDateStr,
    tomorrowDayName,
    tomorrowDayIndex,
    todayClasses,
    tomorrowClasses,
    nextUpcomingClass,
    weeklySchedule,
    unconfiguredCourses,
    tomorrowAssignments,
    todayAssignments,
    next7DaysAssignments,
    upcomingExams,
    activeTasks,
    weeklySummaryText
  };
}

export function isScheduleOrDateQuery(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (
    lower.startsWith('add course') ||
    lower.startsWith('create course') ||
    lower.startsWith('new course') ||
    lower.startsWith('confirm')
  ) {
    return false;
  }

  const patterns = [
    /\btomorrow\b/i,
    /\btoday\b/i,
    /\bschedule\b/i,
    /\btimetable\b/i,
    /\bwhat.*classes?\b/i,
    /\bwhat.*have\b/i,
    /\bdo i have\b/i,
    /\bmy classes\b/i,
    /\bmy courses\b/i,
    /\bnext class\b/i,
    /\bupcoming class\b/i,
    /\bwhat day\b/i,
    /\bwhat date\b/i,
    /\bwhen is my\b/i,
    /\bcalendar\b/i
  ];

  return patterns.some(p => p.test(lower));
}

export function generateScheduleAnswer(
  text: string,
  ctx: AcademicScheduleContext,
  courses: Course[]
): string {
  const lower = text.toLowerCase();

  // 1. Tomorrow Query
  if (lower.includes('tomorrow')) {
    let classesSection = '';
    if (ctx.tomorrowClasses.length > 0) {
      classesSection = `### 🏛️ Scheduled Classes for Tomorrow (${ctx.tomorrowDayName}):\n` +
        ctx.tomorrowClasses.map((c, i) =>
          `${i + 1}. **${c.courseCode}: ${c.courseName}**\n` +
          `   • ⏰ **Time:** ${c.time}\n` +
          `   • 📍 **Location:** ${c.location}\n` +
          `   • 🏷️ **Type:** ${c.type} • 👨‍🏫 **Instructor:** ${c.instructor}`
        ).join('\n\n');
    } else {
      const isWeekend = ctx.tomorrowDayIndex === 0 || ctx.tomorrowDayIndex === 6;
      classesSection = `### 🏛️ Tomorrow's Classes\n` +
        `🎉 **No scheduled classes tomorrow!** Tomorrow is **${ctx.tomorrowDayName}**${isWeekend ? ' (Weekend)' : ' (Lecture-free day)'}.\n\n` +
        (ctx.nextUpcomingClass
          ? `👉 **Next Upcoming Class on Your Timetable:**\n• **${ctx.nextUpcomingClass.courseCode}: ${ctx.nextUpcomingClass.courseName}** on **${ctx.nextUpcomingClass.dayName}** at **${ctx.nextUpcomingClass.time}** (${ctx.nextUpcomingClass.location})\n`
          : '');
    }

    // Unconfigured courses note if applicable
    let unconfiguredNote = '';
    if (courses.length > 0 && ctx.unconfiguredCourses.length > 0) {
      if (ctx.unconfiguredCourses.length === courses.length) {
        unconfiguredNote = `\n> 💡 **Timetable Note:** You are enrolled in **${courses.length} courses** (${courses.map(c => c.code).join(', ')}), but specific meeting times have not been added to your Timetable yet. You can set them in the **Schedule** tab or tell me: *"CSE431 is on Mondays at 10 AM"*.\n`;
      }
    }

    // Tomorrow's deadlines
    let assignmentsSection = '';
    if (ctx.tomorrowAssignments.length > 0) {
      assignmentsSection = `### 📝 Coursework Due Tomorrow:\n` +
        ctx.tomorrowAssignments.map(a =>
          `• ⚠️ **${a.title}** (${courses.find(c => c.id === a.courseId)?.code || 'Coursework'}) — Due tomorrow!`
        ).join('\n');
    } else {
      assignmentsSection = `### 📝 Coursework Deadlines\n✅ **All clear!** You have no assignments due tomorrow.`;
    }

    // Recommended active tasks
    let tasksSection = '';
    if (ctx.activeTasks.length > 0) {
      tasksSection = `\n### 🎯 Recommended Study Focus for Tomorrow\n` +
        `Since your queue has active study items, here is what you can tackle:\n` +
        ctx.activeTasks.slice(0, 3).map((t, idx) =>
          `${idx + 1}. **${t.title}** (${courses.find(c => c.id === t.courseId)?.code || 'Study Task'})`
        ).join('\n');
    }

    // Upcoming exams alert
    let examsSection = '';
    if (ctx.upcomingExams.length > 0) {
      examsSection = `\n### ⚠️ Upcoming Exams in the Next 14 Days\n` +
        ctx.upcomingExams.map(e =>
          `• **${e.exam.name}** (${e.courseCode}) — ${e.dateStr} (${e.daysRemaining === 0 ? 'Today!' : e.daysRemaining === 1 ? 'Tomorrow!' : `in ${e.daysRemaining} days`})`
        ).join('\n');
    }

    return `📅 **Tomorrow is ${ctx.tomorrowDayName}, ${ctx.tomorrowDateStr}**  \n*(Current time: ${ctx.todayDayName}, ${ctx.todayTimeStr})*\n\n` +
      `${classesSection}\n\n` +
      `${unconfiguredNote}` +
      `${assignmentsSection}\n` +
      `${tasksSection}` +
      `${examsSection}`;
  }

  // 2. Today Query
  if (lower.includes('today')) {
    let classesSection = '';
    if (ctx.todayClasses.length > 0) {
      classesSection = `### 🏛️ Today's Classes (${ctx.todayDayName}):\n` +
        ctx.todayClasses.map((c, i) =>
          `${i + 1}. **${c.courseCode}: ${c.courseName}**\n` +
          `   • ⏰ **Time:** ${c.time}\n` +
          `   • 📍 **Location:** ${c.location}\n` +
          `   • 🏷️ **Type:** ${c.type} • 👨‍🏫 **Instructor:** ${c.instructor}`
        ).join('\n\n');
    } else {
      classesSection = `### 🏛️ Today's Classes\n` +
        `🎉 **No classes scheduled for today (${ctx.todayDayName})!**\n\n` +
        (ctx.nextUpcomingClass
          ? `👉 **Next Upcoming Class:** **${ctx.nextUpcomingClass.courseCode}: ${ctx.nextUpcomingClass.courseName}** on **${ctx.nextUpcomingClass.dayName}** at **${ctx.nextUpcomingClass.time}** (${ctx.nextUpcomingClass.location})\n`
          : '');
    }

    let assignmentsSection = '';
    if (ctx.todayAssignments.length > 0) {
      assignmentsSection = `\n### 📝 Due Today:\n` +
        ctx.todayAssignments.map(a =>
          `• ⚠️ **${a.title}** (${courses.find(c => c.id === a.courseId)?.code || 'General'}) — Due today!`
        ).join('\n');
    } else {
      assignmentsSection = `\n### 📝 Deadlines Today\n✅ No assignment deadlines due today.`;
    }

    let tasksSection = '';
    if (ctx.activeTasks.length > 0) {
      tasksSection = `\n### 🎯 Today's Active Tasks\n` +
        ctx.activeTasks.slice(0, 4).map((t, idx) =>
          `${idx + 1}. **${t.title}**`
        ).join('\n');
    }

    return `📅 **Today is ${ctx.todayDayName}, ${ctx.todayDateStr}** (${ctx.todayTimeStr})\n\n` +
      `${classesSection}` +
      `${assignmentsSection}` +
      `${tasksSection}`;
  }

  // 3. Next Class Query
  if (lower.includes('next class') || lower.includes("what's next")) {
    if (ctx.nextUpcomingClass) {
      return `👉 **Your Next Scheduled Class:**\n\n` +
        `🏛️ **${ctx.nextUpcomingClass.courseCode}: ${ctx.nextUpcomingClass.courseName}**\n` +
        `• 📅 **When:** ${ctx.nextUpcomingClass.dayName} at **${ctx.nextUpcomingClass.time}**\n` +
        `• 📍 **Location:** ${ctx.nextUpcomingClass.location}\n` +
        `• 🏷️ **Type:** ${ctx.nextUpcomingClass.type}\n` +
        `• 👨‍🏫 **Instructor:** ${ctx.nextUpcomingClass.instructor}`;
    } else {
      return `📅 **Today is ${ctx.todayDayName}, ${ctx.todayDateStr}**.\n\nYou have no scheduled classes configured in your timetable for the coming week. Visit the **Schedule** tab to add your weekly class times, or tell me: *"CSE431 is on Mondays at 10 AM"*!`;
    }
  }

  // 4. General Schedule / Timetable / Courses Query
  let timetableText = '';
  const daysWithClasses = DAY_NAMES.filter(d => ctx.weeklySchedule[d].length > 0);

  if (daysWithClasses.length > 0) {
    timetableText = `### 📅 Your Weekly Class Timetable\n` +
      daysWithClasses.map(day => {
        const slots = ctx.weeklySchedule[day];
        return `#### **${day}**\n` + slots.map(s =>
          `• **${s.time}** — **${s.courseCode}: ${s.courseName}** (${s.location}, ${s.instructor})`
        ).join('\n');
      }).join('\n\n');
  } else {
    timetableText = `### 📅 Your Weekly Schedule\nNo specific class meeting slots are currently set in your timetable.\n\n` +
      `**Your Registered Courses (${courses.length}):**\n` +
      courses.map(c => `• **${c.code}: ${c.name}** (Instructor: ${c.instructor || 'Staff'})`).join('\n');
  }

  return `📅 **Today is ${ctx.todayDayName}, ${ctx.todayDateStr}** (${ctx.todayTimeStr})\n\n` +
    `${timetableText}\n\n` +
    (ctx.next7DaysAssignments.length > 0
      ? `### 📝 Upcoming Deadlines (Next 7 Days)\n` +
        ctx.next7DaysAssignments.map(a =>
          `• **${a.assignment.title}** (${a.courseCode}) — ${a.daysRemaining === 0 ? 'Due Today!' : a.daysRemaining === 1 ? 'Due Tomorrow!' : `Due in ${a.daysRemaining} days`}`
        ).join('\n')
      : '### 📝 Deadlines\n✅ All caught up! No assignments due in the next 7 days.');
}

export function buildGeminiAcademicPrompt(
  ctx: AcademicScheduleContext,
  courses: Course[],
  userQuery: string
): string {
  const tomorrowClassSummary = ctx.tomorrowClasses.length > 0
    ? ctx.tomorrowClasses.map(c => `• ${c.courseCode}: ${c.courseName} (${c.time}, ${c.location}, ${c.type}, Instructor: ${c.instructor})`).join('\n')
    : `No classes scheduled for tomorrow (${ctx.tomorrowDayName} - Weekend/Lecture-free day).`;

  const todayClassSummary = ctx.todayClasses.length > 0
    ? ctx.todayClasses.map(c => `• ${c.courseCode}: ${c.courseName} (${c.time}, ${c.location}, ${c.type})`).join('\n')
    : `No classes scheduled for today (${ctx.todayDayName}).`;

  const nextClassText = ctx.nextUpcomingClass
    ? `Next class on timetable: ${ctx.nextUpcomingClass.courseCode}: ${ctx.nextUpcomingClass.courseName} on ${ctx.nextUpcomingClass.dayName} at ${ctx.nextUpcomingClass.time} (${ctx.nextUpcomingClass.location})`
    : 'No upcoming classes scheduled.';

  const assignmentsText = ctx.next7DaysAssignments.length > 0
    ? ctx.next7DaysAssignments.map(a => `• ${a.assignment.title} (${a.courseCode}) - Due in ${a.daysRemaining} day(s)`).join('\n')
    : 'No assignments due in next 7 days.';

  const examsText = ctx.upcomingExams.length > 0
    ? ctx.upcomingExams.map(e => `• ${e.exam.name} (${e.courseCode}) - Date: ${e.dateStr} (in ${e.daysRemaining} days)`).join('\n')
    : 'No exams in next 14 days.';

  return `You are an elite academic tutor and study planner in Nook Academic Workspace.

CRITICAL LIVE TEMPORAL GROUND TRUTH:
• EXACT CURRENT DATE & TIME: ${ctx.todayDateStr}, ${ctx.todayTimeStr} (Today is ${ctx.todayDayName})
• TOMORROW'S EXACT DATE & WEEKDAY: ${ctx.tomorrowDateStr} (Tomorrow is ${ctx.tomorrowDayName})

REGISTERED COURSES & TIMETABLE:
${ctx.weeklySummaryText}

TODAY'S CLASSES (${ctx.todayDayName}):
${todayClassSummary}

TOMORROW'S CLASSES (${ctx.tomorrowDayName}):
${tomorrowClassSummary}

${nextClassText}

UPCOMING ASSIGNMENTS (Next 7 days):
${assignmentsText}

UPCOMING EXAMS (Next 14 days):
${examsText}

OPEN STUDY TASKS:
${ctx.activeTasks.map(t => t.title).join(', ') || 'All caught up'}

STRICT INSTRUCTIONS:
1. You ALWAYS know the exact current date, time, and day of the week. NEVER ask the student what day of the week it is.
2. NEVER claim you do not have access to the university calendar or meeting times, because the student's timetable and course matrix are fully provided above.
3. When the student asks what they have tomorrow or today, answer directly, factually, and accurately based on the ground truth above.
4. If tomorrow has no classes (e.g. Saturday/weekend), state that immediately and clearly, mention when their next class is, and highlight any deadlines or pending tasks.
5. Provide a helpful, clean markdown response.

Student inquiry:
${userQuery}`;
}
