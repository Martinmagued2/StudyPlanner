import { Assignment, CalendarEvent, Course, Exam, Task } from '../types';
import { parseDayIndex, toLocalDateKey } from './academicScheduleService';

export type EnergyProfile = 'morning' | 'afternoon' | 'night' | 'balanced';

export interface ProposedStudyBlock {
  id: string;
  title: string;
  courseId?: string;
  courseCode?: string;
  dateStr: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string;
  priority: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface BusyInterval {
  startMin: number;
  endMin: number;
}

function toMins(hhmm: string): number {
  const [h, m] = (hhmm || '09:00').split(':').map(Number);
  return (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
}

function minsToHhmm(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getPreferredWindows(profile: EnergyProfile): Array<{ start: number; end: number }> {
  if (profile === 'morning') {
    return [
      { start: 8 * 60, end: 13 * 60 },
      { start: 14 * 60, end: 20 * 60 }
    ];
  }
  if (profile === 'afternoon') {
    return [
      { start: 13 * 60, end: 18 * 60 },
      { start: 9 * 60, end: 12 * 60 },
      { start: 18 * 60, end: 21 * 60 }
    ];
  }
  if (profile === 'night') {
    return [
      { start: 18 * 60, end: 23 * 60 },
      { start: 14 * 60, end: 18 * 60 }
    ];
  }
  return [{ start: 9 * 60, end: 21 * 60 }];
}

function collectBusyIntervalsForDate(
  dateStr: string,
  dayOfWeek: number,
  courses: Course[],
  events: CalendarEvent[],
  exams: Exam[],
  isClassSuspendedOnDate: (d: string, courseId?: string) => { suspended: boolean }
): BusyInterval[] {
  const busy: BusyInterval[] = [];

  // 1. Course lectures/labs unless suspended
  courses
    .filter(c => !c.isArchived && !isClassSuspendedOnDate(dateStr, c.id).suspended)
    .forEach(c => {
      (c.meetingSlots || []).forEach(slot => {
        if (parseDayIndex(slot.day) === dayOfWeek) {
          busy.push({
            startMin: Math.max(0, toMins(slot.startTime) - 10),
            endMin: Math.min(24 * 60, toMins(slot.endTime) + 10)
          });
        }
      });
    });

  // 2. Existing timed calendar events
  events.forEach(evt => {
    const startKey = evt.start?.slice(0, 10);
    if (startKey === dateStr && !evt.allDay && evt.start?.includes('T')) {
      const s = evt.start.slice(11, 16);
      const e = evt.end?.includes('T') ? evt.end.slice(11, 16) : minsToHhmm(toMins(s) + 60);
      busy.push({ startMin: toMins(s), endMin: toMins(e) });
    }
  });

  // 3. Scheduled exams on this date
  exams.forEach(ex => {
    if (ex.date?.slice(0, 10) === dateStr) {
      const s = ex.startTime || '09:00';
      const e = ex.endTime || '11:30';
      busy.push({
        startMin: Math.max(0, toMins(s) - 30),
        endMin: Math.min(24 * 60, toMins(e) + 30)
      });
    }
  });

  return busy.sort((a, b) => a.startMin - b.startMin);
}

function findFreeSlot(
  busy: BusyInterval[],
  windows: Array<{ start: number; end: number }>,
  durationMin: number,
  minStartMin: number = 8 * 60
): { start: number; end: number } | null {
  for (const win of windows) {
    let cursor = Math.max(win.start, minStartMin);
    while (cursor + durationMin <= win.end) {
      const candidateEnd = cursor + durationMin;
      const conflict = busy.find(b => cursor < b.endMin && candidateEnd > b.startMin);
      if (!conflict) {
        return { start: cursor, end: candidateEnd };
      }
      cursor = conflict.endMin + 15; // 15-min break buffer
    }
  }
  return null;
}

export function generateAdaptiveWeeklyBlocks(params: {
  courses: Course[];
  assignments: Assignment[];
  tasks: Task[];
  exams: Exam[];
  events: CalendarEvent[];
  isClassSuspendedOnDate: (dateStr: string, courseId?: string) => { suspended: boolean; reason?: string };
  energyProfile: EnergyProfile;
  blockMinutes: number;
  maxHoursPerDay: number;
  daysAhead?: number;
}): ProposedStudyBlock[] {
  const {
    courses,
    assignments,
    tasks,
    exams,
    events,
    isClassSuspendedOnDate,
    energyProfile,
    blockMinutes,
    maxHoursPerDay,
    daysAhead = 7
  } = params;

  const courseMap = new Map(courses.map(c => [c.id, c]));
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const currentMinsToday = now.getHours() * 60 + now.getMinutes() + 20;

  // Build prioritized work queue from exams, assignments, and tasks
  interface WorkNeed {
    title: string;
    courseId?: string;
    courseCode?: string;
    dueKey: string;
    priority: 'high' | 'medium' | 'low';
    blocksNeeded: number;
    reason: string;
  }

  const queue: WorkNeed[] = [];

  exams
    .filter(e => e.date && e.date.slice(0, 10) >= todayKey)
    .forEach(ex => {
      const c = courseMap.get(ex.courseId);
      const dk = ex.date.slice(0, 10);
      const daysLeft = Math.max(0, Math.round((new Date(`${dk}T00:00:00`).getTime() - new Date(`${todayKey}T00:00:00`).getTime()) / 86400000));
      if (daysLeft <= 14) {
        queue.push({
          title: `Study: ${ex.name} Prep`,
          courseId: ex.courseId,
          courseCode: c?.code,
          dueKey: dk,
          priority: 'high',
          blocksNeeded: daysLeft <= 3 ? 3 : 2,
          reason: `Exam in ${daysLeft}d (${ex.weightPercentage}% weight)`
        });
      }
    });

  assignments
    .filter(a => a.status !== 'completed')
    .forEach(a => {
      const c = a.courseId ? courseMap.get(a.courseId) : undefined;
      const dk = (a.dueDate || todayKey).slice(0, 10);
      const blocks = Math.max(1, Math.min(4, Math.ceil((a.estimatedMinutes || 90) / blockMinutes)));
      queue.push({
        title: `Study: ${a.title}`,
        courseId: a.courseId,
        courseCode: c?.code,
        dueKey: dk,
        priority: a.priority || 'medium',
        blocksNeeded: blocks,
        reason: `Assignment due ${dk}`
      });
    });

  tasks
    .filter(t => !t.completed)
    .slice(0, 10)
    .forEach(t => {
      const c = t.courseId ? courseMap.get(t.courseId) : undefined;
      queue.push({
        title: `Study: ${t.title}`,
        courseId: t.courseId,
        courseCode: c?.code,
        dueKey: (t.dueDate || '2099-12-31').slice(0, 10),
        priority: t.priority || 'medium',
        blocksNeeded: 1,
        reason: `${t.priority.toUpperCase()} priority task`
      });
    });

  // Fallback general course review if queue is light
  if (queue.length === 0) {
    courses
      .filter(c => !c.isArchived)
      .slice(0, 4)
      .forEach(c => {
        queue.push({
          title: `Study: ${c.code} Concept Review`,
          courseId: c.id,
          courseCode: c.code,
          dueKey: '2099-12-31',
          priority: 'medium',
          blocksNeeded: 1,
          reason: 'Weekly active recall reinforcement'
        });
      });
  }

  queue.sort((a, b) => {
    const prioScore = (p: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);
    if (a.dueKey !== b.dueKey) return a.dueKey.localeCompare(b.dueKey);
    return prioScore(a.priority) - prioScore(b.priority);
  });

  const windows = getPreferredWindows(energyProfile);
  const maxBlocksPerDay = Math.max(1, Math.floor((maxHoursPerDay * 60) / blockMinutes));

  const dayStates = Array.from({ length: daysAhead }).map((_, offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const dateStr = toLocalDateKey(d);
    const busy = collectBusyIntervalsForDate(
      dateStr,
      d.getDay(),
      courses,
      events,
      exams,
      isClassSuspendedOnDate
    );
    return {
      dateStr,
      busy,
      scheduledCount: 0,
      minStart: offset === 0 ? Math.max(8 * 60, currentMinsToday) : 8 * 60
    };
  });

  const proposed: ProposedStudyBlock[] = [];
  let idxCounter = 0;

  for (const item of queue) {
    let remaining = item.blocksNeeded;
    for (const ds of dayStates) {
      if (remaining <= 0) break;
      if (ds.scheduledCount >= maxBlocksPerDay) continue;
      if (item.dueKey !== '2099-12-31' && ds.dateStr > item.dueKey) continue;

      const slot = findFreeSlot(ds.busy, windows, blockMinutes, ds.minStart);
      if (slot) {
        ds.busy.push({ startMin: slot.start, endMin: slot.end + 15 });
        ds.busy.sort((a, b) => a.startMin - b.startMin);
        ds.scheduledCount += 1;
        remaining -= 1;
        idxCounter += 1;

        proposed.push({
          id: `tb_${Date.now()}_${idxCounter}`,
          title: item.title,
          courseId: item.courseId,
          courseCode: item.courseCode,
          dateStr: ds.dateStr,
          startTime: minsToHhmm(slot.start),
          endTime: minsToHhmm(slot.end),
          reason: item.reason,
          priority: item.priority,
          selected: true
        });
      }
    }
  }

  return proposed.sort((a, b) => `${a.dateStr}T${a.startTime}`.localeCompare(`${b.dateStr}T${b.startTime}`));
}

export function findMissedStudyEvents(events: CalendarEvent[]): CalendarEvent[] {
  const nowIso = new Date().toISOString().slice(0, 16);
  const todayKey = toLocalDateKey(new Date());
  return events.filter(evt => {
    if (!evt.title.startsWith('Study:')) return false;
    const endKey = (evt.end || evt.start || '').slice(0, 16);
    return endKey && endKey < nowIso && evt.start.slice(0, 10) >= toLocalDateKey(new Date(Date.now() - 7 * 86400000)) && evt.start.slice(0, 10) <= todayKey;
  });
}
