import {
  AcademicCalendarConfig,
  AcademicMode,
  Assignment,
  Course,
  Exam,
  Note,
  Quiz,
  Task
} from '../types';
import { ActiveView } from '../context/AppContext';
import {
  formatTime12h,
  getLiveScheduleStatus,
  getAcademicScheduleContext,
  isScheduleOrDateQuery,
  generateScheduleAnswer,
  toLocalDateKey
} from './academicScheduleService';
import { stripHtmlTags } from './noteBlockService';

export interface VoiceAction {
  type:
    | 'none'
    | 'navigate'
    | 'open_note'
    | 'create_task'
    | 'create_note'
    | 'create_reminder'
    | 'complete_task';
  requiresConfirmation?: boolean;
  confirmationPrompt?: string;
  payload?: Record<string, any>;
}

export interface VoiceConversationMemory {
  lastTopic?: string;
  lastCourseId?: string;
  lastNoteId?: string;
  lastTaskId?: string;
}

export interface VoiceTurnResponse {
  spokenReply: string;
  action: VoiceAction;
  usedLlm: boolean;
  updatedMemory: VoiceConversationMemory;
}

export interface VoiceWorkspaceInput {
  studentName: string;
  courses: Course[];
  assignments: Assignment[];
  exams: Exam[];
  tasks: Task[];
  notes: Note[];
  quizzes: Quiz[];
  academicConfig: AcademicCalendarConfig;
  activeAcademicMode: AcademicMode;
  isClassSuspendedOnDate: (dateStr: string, courseId?: string) => { suspended: boolean; reason?: string };
}

export function cleanSpeechText(input: string): string {
  return (input || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/#+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildVoiceAcademicSnapshot(data: VoiceWorkspaceInput) {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const live = getLiveScheduleStatus(data.courses, now, data.isClassSuspendedOnDate);

  const courseMap = new Map(data.courses.map(c => [c.id, c]));

  return {
    studentName: data.studentName,
    localDate: todayKey,
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    academicMode: data.activeAcademicMode,
    holidaySuspension: data.isClassSuspendedOnDate(todayKey),
    liveScheduleStatus: live.activeOrNextClass.status,
    todaysClasses: live.todayClasses.map(c => ({
      courseId: c.courseId,
      code: c.courseCode,
      name: c.courseName,
      startTime: formatTime12h(c.startTime),
      endTime: formatTime12h(c.endTime),
      room: c.location,
      lecturer: c.instructor
    })),
    nextClass: live.activeOrNextClass.classItem
      ? {
          code: live.activeOrNextClass.classItem.courseCode,
          name: live.activeOrNextClass.classItem.courseName,
          startTime: formatTime12h(live.activeOrNextClass.classItem.startTime),
          countdown: live.activeOrNextClass.countdownText,
          room: live.activeOrNextClass.classItem.location
        }
      : null,
    courses: data.courses
      .filter(c => !c.isArchived)
      .map(c => ({ id: c.id, code: c.code, name: c.name, instructor: c.instructor, room: c.location })),
    openAssignments: data.assignments
      .filter(a => a.status !== 'completed')
      .slice(0, 12)
      .map(a => ({
        id: a.id,
        title: a.title,
        course: a.courseId ? courseMap.get(a.courseId)?.name || '' : '',
        dueDate: a.dueDate.slice(0, 10),
        status: a.status
      })),
    upcomingExams: data.exams.slice(0, 10).map(e => ({
      id: e.id,
      name: e.name,
      course: courseMap.get(e.courseId)?.name || '',
      date: e.date.slice(0, 10),
      startTime: e.startTime,
      room: e.room
    })),
    openTasks: data.tasks
      .filter(t => !t.completed)
      .slice(0, 15)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.slice(0, 10) || '',
        priority: t.priority
      })),
    notes: data.notes
      .filter(n => !n.inTrash && !n.isArchived)
      .slice(0, 20)
      .map(n => ({
        id: n.id,
        title: n.title,
        course: n.courseId ? courseMap.get(n.courseId)?.name || '' : '',
        tags: n.tags,
        excerpt: stripHtmlTags(n.blocks?.map(b => b.content).join(' ') || n.content).slice(0, 220)
      }))
  };
}

function evaluateLocalVoiceTurn(
  transcript: string,
  data: VoiceWorkspaceInput,
  memory: VoiceConversationMemory
): VoiceTurnResponse {
  const lower = transcript.toLowerCase().trim();
  const nextMemory: VoiceConversationMemory = { ...memory };
  const todayKey = toLocalDateKey(new Date());
  const now = new Date();
  const courseMap = new Map(data.courses.map(c => [c.id, c]));

  // 1. Follow-up resolution ("explain it", "open it", "summarize that")
  const hasPronoun = /\b(it|that|this|those)\b/.test(lower);
  if (hasPronoun && memory.lastNoteId && (lower.includes('open') || lower.includes('show') || lower.includes('read') || lower.includes('summarize') || lower.includes('explain'))) {
    const note = data.notes.find(n => n.id === memory.lastNoteId);
    if (note) {
      const preview = stripHtmlTags(note.blocks?.map(b => b.content).join(' ') || note.content).slice(0, 240);
      if (lower.includes('open')) {
        return {
          spokenReply: `Opening your note "${note.title}" now.`,
          action: { type: 'open_note', requiresConfirmation: false, payload: { noteId: note.id } },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      return {
        spokenReply: preview
          ? `Here is a quick summary of ${note.title}: ${preview}`
          : `Your note "${note.title}" is currently empty. Would you like me to open it?`,
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
  }

  // 2. Navigation commands
  const navMap: Array<{ words: string[]; view: ActiveView; label: string }> = [
    { words: ['dashboard', 'today', 'home'], view: 'today', label: 'Today Dashboard' },
    { words: ['calendar'], view: 'calendar', label: 'Calendar' },
    { words: ['schedule', 'timetable'], view: 'schedule', label: 'Class Schedule' },
    { words: ['assignment', 'homework', 'deadline'], view: 'assignments', label: 'Assignments' },
    { words: ['exam', 'midterm', 'final'], view: 'exams', label: 'Exams & Revision' },
    { words: ['grade', 'gpa'], view: 'grades', label: 'Grades & GPA' },
    { words: ['reminder', 'email', 'notification'], view: 'reminders', label: 'Reminders & Digest' },
    { words: ['flashcard', 'study hub'], view: 'studyhub', label: 'Study Hub' },
    { words: ['quiz', 'quizzes'], view: 'quizzes', label: 'Practice Quizzes' },
    { words: ['course', 'subject'], view: 'courses', label: 'Courses' },
    { words: ['file', 'upload', 'library'], view: 'files', label: 'File Library' },
    { words: ['task', 'to-do', 'todo'], view: 'tasks', label: 'Tasks' }
  ];

  if (/^(open|go to|show|take me to|switch to)\b/.test(lower)) {
    if (lower.includes('note')) {
      const cleanQuery = lower.replace(/^(open|go to|show|take me to|switch to)\s+(my\s+)?(notes?|about|on)?/i, '').trim();
      const matchedNote = cleanQuery
        ? data.notes.find(
            n =>
              !n.inTrash &&
              (n.title.toLowerCase().includes(cleanQuery) ||
                n.tags.some(t => t.toLowerCase().includes(cleanQuery)))
          )
        : undefined;

      if (matchedNote) {
        nextMemory.lastNoteId = matchedNote.id;
        nextMemory.lastTopic = matchedNote.title;
        return {
          spokenReply: `Opening your note titled "${matchedNote.title}".`,
          action: { type: 'open_note', requiresConfirmation: false, payload: { noteId: matchedNote.id } },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      return {
        spokenReply: cleanQuery
          ? `Opening Notes and filtering for "${cleanQuery}".`
          : 'Opening your Notes workspace.',
        action: {
          type: 'open_note',
          requiresConfirmation: false,
          payload: { searchQuery: cleanQuery || undefined }
        },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }

    for (const entry of navMap) {
      if (entry.words.some(w => lower.includes(w))) {
        return {
          spokenReply: `Opening ${entry.label}.`,
          action: { type: 'navigate', requiresConfirmation: false, payload: { view: entry.view } },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
    }
  }

  // 3. Create Task ("add task ...", "remind me to ...")
  if (/^(add|create|make|remind me to)\b/.test(lower) && (lower.includes('task') || lower.includes('todo') || lower.includes('remind me'))) {
    const cleanTitle = transcript
      .replace(/^(add|create|make)\s+(a\s+)?(new\s+)?task\s*(to|called|named)?\s*/i, '')
      .replace(/^remind\s+me\s+to\s+/i, '')
      .trim() || 'New Study Task';
    const dueTomorrow = lower.includes('tomorrow');
    const dueDate = toLocalDateKey(new Date(Date.now() + (dueTomorrow ? 86400000 : 0)));
    nextMemory.lastTopic = cleanTitle;

    return {
      spokenReply: `I prepared a new task: "${cleanTitle}" due ${dueTomorrow ? 'tomorrow' : 'today'}. Should I save it?`,
      action: {
        type: 'create_task',
        requiresConfirmation: true,
        confirmationPrompt: `Create task "${cleanTitle}" (${dueDate})?`,
        payload: { title: cleanTitle, dueDate, priority: 'medium', courseId: data.courses[0]?.id || '' }
      },
      usedLlm: false,
      updatedMemory: nextMemory
    };
  }

  // 4. Create Note ("create a note about ...", "new note on ...")
  if (/^(add|create|make|start)\b/.test(lower) && lower.includes('note')) {
    const title = transcript
      .replace(/^(add|create|make|start)\s+(a\s+)?(new\s+)?note\s*(on|about|titled|called)?\s*/i, '')
      .trim() || 'Voice Study Note';
    nextMemory.lastTopic = title;
    return {
      spokenReply: `Would you like me to create a new Notion note titled "${title}"?`,
      action: {
        type: 'create_note',
        requiresConfirmation: true,
        confirmationPrompt: `Create note "${title}"?`,
        payload: { title, courseId: data.courses[0]?.id || '' }
      },
      usedLlm: false,
      updatedMemory: nextMemory
    };
  }

  // 5. Schedule / Class queries
  if (
    isScheduleOrDateQuery(transcript) ||
    lower.includes('class') ||
    lower.includes('lecture') ||
    lower.includes('timetable') ||
    lower.includes('next') ||
    lower.includes('today')
  ) {
    const live = getLiveScheduleStatus(data.courses, now, data.isClassSuspendedOnDate);

    if (lower.includes('next class') || lower.includes('next lecture') || lower.includes('when is my next')) {
      const susp = data.isClassSuspendedOnDate(todayKey);
      if (susp.suspended) {
        return {
          spokenReply: `Regular classes are suspended today because of ${susp.reason || 'your academic calendar setting'}.`,
          action: { type: 'none' },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      if (live.activeOrNextClass.status === 'happening_now' && live.currentClass) {
        return {
          spokenReply: `Your class ${live.currentClass.courseName} is happening right now until ${formatTime12h(live.currentClass.endTime)}${live.currentClass.location ? ` in ${live.currentClass.location}` : ''}. ${
            live.nextTodayClass ? `After that, you have ${live.nextTodayClass.courseName} at ${formatTime12h(live.nextTodayClass.startTime)}.` : 'It is your last class today.'
          }`,
          action: { type: 'none' },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      if (live.activeOrNextClass.classItem) {
        const cls = live.activeOrNextClass.classItem;
        return {
          spokenReply: `Your next class is ${cls.courseName} (${cls.courseCode}) at ${formatTime12h(cls.startTime)}, ${live.activeOrNextClass.countdownText}${
            cls.location ? `, in ${cls.location}` : ''
          }.`,
          action: { type: 'none' },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      if (live.activeOrNextClass.status === 'all_completed' || live.allClassesCompleted) {
        return {
          spokenReply: `You've finished all ${live.todayClasses.length} of your classes for today! Great time to review assignments or notes.`,
          action: { type: 'none' },
          usedLlm: false,
          updatedMemory: nextMemory
        };
      }
      return {
        spokenReply: "You don't have any classes scheduled for today.",
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }

    const ans = generateScheduleAnswer(
      transcript,
      getAcademicScheduleContext(data.courses, data.assignments, data.tasks, [], data.exams),
      data.courses
    );
    return {
      spokenReply: cleanSpeechText(ans).slice(0, 420),
      action: { type: 'none' },
      usedLlm: false,
      updatedMemory: nextMemory
    };
  }

  // 6. Assignments & Deadlines query
  if (lower.includes('assignment') || lower.includes('due') || lower.includes('deadline')) {
    const open = data.assignments
      .filter(a => a.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (open.length === 0) {
      return {
        spokenReply: 'Great news, you have no pending assignments right now.',
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
    const top = open.slice(0, 3).map(a => {
      const c = a.courseId ? courseMap.get(a.courseId)?.code || '' : '';
      return `${a.title}${c ? ` for ${c}` : ''} due ${a.dueDate.slice(0, 10)}`;
    });
    nextMemory.lastTopic = open[0].title;
    return {
      spokenReply: `You have ${open.length} pending assignment${open.length === 1 ? '' : 's'}. Coming up next: ${top.join('; ')}.`,
      action: { type: 'none' },
      usedLlm: false,
      updatedMemory: nextMemory
    };
  }

  // 7. Exams query
  if (lower.includes('exam') || lower.includes('test') || lower.includes('midterm') || lower.includes('final')) {
    const upcoming = data.exams
      .filter(e => e.date.slice(0, 10) >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) {
      return {
        spokenReply: 'You have no upcoming exams scheduled right now.',
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
    const nextEx = upcoming[0];
    const courseName = courseMap.get(nextEx.courseId)?.name || '';
    nextMemory.lastTopic = nextEx.name;
    return {
      spokenReply: `Your next exam is ${nextEx.name}${courseName ? ` in ${courseName}` : ''} on ${nextEx.date.slice(0, 10)}${
        nextEx.startTime ? ` at ${formatTime12h(nextEx.startTime)}` : ''
      }. You have ${upcoming.length} upcoming exam${upcoming.length === 1 ? '' : 's'} total.`,
      action: { type: 'none' },
      usedLlm: false,
      updatedMemory: nextMemory
    };
  }

  // 8. Search notes / Explain a concept from notes
  if (lower.includes('note') || lower.includes('explain') || lower.includes('find') || lower.includes('what did i write')) {
    const keywords = lower
      .replace(/\b(explain|summarize|find|search|what|did|i|write|about|in|my|notes|the|for|please|me)\b/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);

    const match = data.notes.find(n => {
      if (n.inTrash) return false;
      const hay = `${n.title} ${n.tags.join(' ')} ${stripHtmlTags(n.content)}`.toLowerCase();
      return keywords.some(k => hay.includes(k));
    });

    if (match) {
      nextMemory.lastNoteId = match.id;
      nextMemory.lastTopic = match.title;
      const snippet = stripHtmlTags(match.blocks?.map(b => b.content).join(' ') || match.content).slice(0, 220);
      return {
        spokenReply: `I found your note "${match.title}". ${snippet ? `Here is the key excerpt: ${snippet}.` : ''} Say "open it" if you want me to display it.`,
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
  }

  // 9. Study prioritization ("what should i do", "help me study")
  if (lower.includes('what should i do') || lower.includes('study plan') || lower.includes('focus') || lower.includes('priority')) {
    const openTasks = data.tasks.filter(t => !t.completed);
    const openAsg = data.assignments.filter(a => a.status !== 'completed');
    const topTask = openTasks.find(t => t.priority === 'high') || openTasks[0];
    if (openAsg[0]) {
      return {
        spokenReply: `I recommend starting a 25-minute focus sprint on your assignment "${openAsg[0].title}" due ${openAsg[0].dueDate.slice(0, 10)}. You also have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}.`,
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
    if (topTask) {
      nextMemory.lastTaskId = topTask.id;
      return {
        spokenReply: `Your top priority task right now is "${topTask.title}". Knock that out first and then check your upcoming exam revision blocks.`,
        action: { type: 'none' },
        usedLlm: false,
        updatedMemory: nextMemory
      };
    }
  }

  return {
    spokenReply: `You're in ${
      data.activeAcademicMode === 'normal'
        ? 'Normal Semester Mode'
        : data.activeAcademicMode === 'midterm'
          ? 'Midterm Mode'
          : 'Final Exam Mode'
    } with ${data.courses.filter(c => !c.isArchived).length} active courses and ${
      data.tasks.filter(t => !t.completed).length
    } open tasks. Ask me about your next class, upcoming deadlines, notes, or say "add a task".`,
    action: { type: 'none' },
    usedLlm: false,
    updatedMemory: nextMemory
  };
}

export async function processVoiceTurn(
  transcript: string,
  data: VoiceWorkspaceInput,
  history: Array<{ role: 'user' | 'assistant'; text: string }>,
  memory: VoiceConversationMemory
): Promise<VoiceTurnResponse> {
  try {
    const academicContext = buildVoiceAcademicSnapshot(data);
    const res = await fetch('/api/ai/voice-turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript,
        history,
        focusMemory: memory,
        academicContext
      })
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      if (json.ok && json.usedLlm && json.result?.spokenReply) {
        const r = json.result;
        return {
          spokenReply: cleanSpeechText(r.spokenReply),
          action: r.action || { type: 'none' },
          usedLlm: true,
          updatedMemory: {
            lastTopic: r.topicFocus || memory.lastTopic,
            lastCourseId: r.referencedCourseId || memory.lastCourseId,
            lastNoteId: r.referencedNoteId || memory.lastNoteId,
            lastTaskId: r.referencedTaskId || memory.lastTaskId
          }
        };
      }
    }
  } catch {
    // Graceful local academic NLU fallback
  }

  return evaluateLocalVoiceTurn(transcript, data, memory);
}

