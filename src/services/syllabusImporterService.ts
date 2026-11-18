import {
  AssignmentType,
  ClassType,
  ExamPeriodType,
  PriorityLevel
} from '../types';
import { queryGemini } from './fileAiService';

export interface ExtractedSyllabusBundle {
  course: {
    code: string;
    name: string;
    instructor: string;
    location: string;
    creditHours: number;
    term: string;
    color: string;
    meetingSlots: Array<{
      day: number; // 0 Sun..6 Sat
      startTime: string;
      endTime: string;
      type: ClassType;
      location: string;
    }>;
  };
  assignments: Array<{
    title: string;
    dueDate: string; // YYYY-MM-DD
    type: AssignmentType;
    priority: PriorityLevel;
    estimatedMinutes: number;
    description: string;
  }>;
  exams: Array<{
    name: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    durationMinutes: number;
    examType: ExamPeriodType;
    weightPercentage: number;
    topics: string[];
    location: string;
  }>;
  gradeCategories: Array<{
    category: string;
    title: string;
    weight: number;
    maxScore: number;
  }>;
  usedAi: boolean;
}

const PALETTE = ['#0284c7', '#059669', '#7c3aed', '#d97706', '#e11d48', '#0891b2'];

function addDaysIso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function normalizeIsoDate(raw: string | undefined, fallbackOffsetDays: number): string {
  if (!raw) return addDaysIso(fallbackOffsetDays);
  const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return addDaysIso(fallbackOffsetDays);
}

function heuristicSyllabusParse(rawText: string, fileName?: string): ExtractedSyllabusBundle {
  const text = rawText.trim();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Extract course code like "CSE 336", "CS302", "ENG-204"
  const codeMatch = text.match(/\b([A-Z]{2,5}[-\s]?\d{3}[A-Z]?)\b/);
  const code = codeMatch ? codeMatch[1].replace(/\s+/g, ' ').toUpperCase() : 'NEW 101';

  // Extract instructor
  const profMatch = text.match(/(?:Instructor|Lecturer|Professor|Prof\.|Dr\.)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i);
  const instructor = profMatch ? profMatch[0].replace(/^(?:Instructor|Lecturer|Professor)\s*[:\-]?\s*/i, '').trim() : 'TBA';

  // Course name heuristic: first non-empty line or stripped code line
  let name = lines[0] || fileName?.replace(/\.[^/.]+$/, '') || 'Imported Course';
  if (name.length > 80) name = name.slice(0, 77) + '...';
  if (codeMatch && lines[0]?.includes(codeMatch[0]) && lines[0].length < 15 && lines[1]) {
    name = lines[1];
  }

  // Location
  const locMatch = text.match(/(?:Room|Hall|Building|Location|Lab)\s*[:\-]?\s*([A-Za-z0-9\-\s]{2,28})/i);
  const location = locMatch ? locMatch[1].trim() : 'Main Campus';

  // Term
  const termMatch = text.match(/\b(?:Fall|Spring|Summer|Winter)\s+20\d{2}\b/i);
  const term = termMatch ? termMatch[0] : 'Fall 2026';

  // Credits
  const creditMatch = text.match(/\b(\d)\s*(?:credit\s*hours?|credits?|ECTS)\b/i);
  const creditHours = creditMatch ? Math.min(8, Math.max(1, Number(creditMatch[1]))) : 3;

  // Schedule days heuristic
  const dayMap: Array<[RegExp, number]> = [
    [/\bMon(?:day)?\b/i, 1],
    [/\bTue(?:sday)?\b/i, 2],
    [/\bWed(?:nesday)?\b/i, 3],
    [/\bThu(?:rsday)?\b/i, 4],
    [/\bFri(?:day)?\b/i, 5],
    [/\bSat(?:urday)?\b/i, 6],
    [/\bSun(?:day)?\b/i, 0]
  ];
  const detectedDays = dayMap.filter(([re]) => re.test(text)).map(([, d]) => d).slice(0, 3);
  const timeMatch = text.match(/\b(\d{1,2}:\d{2})\s*(?:-|to|–)\s*(\d{1,2}:\d{2})\b/);
  const startTime = timeMatch ? timeMatch[1].padStart(5, '0') : '10:00';
  const endTime = timeMatch ? timeMatch[2].padStart(5, '0') : '11:30';

  const meetingSlots = (detectedDays.length > 0 ? detectedDays : [1, 3]).map((day, idx) => ({
    day,
    startTime,
    endTime,
    type: (idx === 1 && /\blab\b/i.test(text) ? 'lab' : 'lecture') as ClassType,
    location
  }));

  // Assignments & Exams lines
  const assignments: ExtractedSyllabusBundle['assignments'] = [];
  const exams: ExtractedSyllabusBundle['exams'] = [];
  const gradeCategories: ExtractedSyllabusBundle['gradeCategories'] = [];

  lines.forEach((line, idx) => {
    const pctMatch = line.match(/(\d{1,2})\s*%/);
    const weight = pctMatch ? Number(pctMatch[1]) : 15;
    const dateMatch = line.match(/\b(20\d{2}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s*20\d{2})?)\b/i);

    if (/\b(midterm|final exam|exam\s*\d?|quiz\s*\d?)\b/i.test(line) && exams.length < 5) {
      const isFinal = /\bfinal\b/i.test(line);
      const isQuiz = /\bquiz\b/i.test(line);
      exams.push({
        name: line.slice(0, 58),
        date: normalizeIsoDate(dateMatch?.[1], isFinal ? 45 : 21 + idx),
        startTime: '09:00',
        durationMinutes: isQuiz ? 45 : isFinal ? 150 : 90,
        examType: isFinal ? 'final' : isQuiz ? 'quiz' : 'midterm',
        weightPercentage: pctMatch ? weight : isFinal ? 40 : 20,
        topics: ['Core Syllabus Modules'],
        location
      });
    } else if (/\b(assignment|homework|project|lab\s*\d+|report|essay)\b/i.test(line) && assignments.length < 6) {
      assignments.push({
        title: line.slice(0, 64),
        dueDate: normalizeIsoDate(dateMatch?.[1], 10 + assignments.length * 7),
        type: /\bproject\b/i.test(line) ? 'project' : /\blab\b/i.test(line) ? 'lab' : 'homework',
        priority: weight >= 20 ? 'high' : 'medium',
        estimatedMinutes: 120,
        description: `Extracted from syllabus: ${line}`
      });
    }

    if (pctMatch && line.length < 80 && gradeCategories.length < 8) {
      gradeCategories.push({
        category: /\bexam|midterm|final\b/i.test(line) ? 'Exams' : /\bquiz\b/i.test(line) ? 'Quizzes' : 'Coursework',
        title: line.replace(/[-–:]\s*\d{1,2}\s*%.*/, '').trim().slice(0, 48) || `Component ${gradeCategories.length + 1}`,
        weight,
        maxScore: 100
      });
    }
  });

  if (assignments.length === 0) {
    assignments.push({
      title: `${code} Coursework / Assignment 1`,
      dueDate: addDaysIso(14),
      type: 'homework',
      priority: 'medium',
      estimatedMinutes: 90,
      description: 'Auto-created initial coursework milestone from imported syllabus.'
    });
  }

  return {
    course: {
      code,
      name,
      instructor,
      location,
      creditHours,
      term,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      meetingSlots
    },
    assignments,
    exams,
    gradeCategories,
    usedAi: false
  };
}

export async function parseSyllabusToCourseBundle(
  rawText: string,
  fileName?: string
): Promise<ExtractedSyllabusBundle> {
  const prompt = `Analyze this university course syllabus${fileName ? ` ("${fileName}")` : ''} and extract a complete structured academic bundle.
Today's reference date is ${new Date().toISOString().split('T')[0]}. Convert relative or month-day dates to YYYY-MM-DD in the upcoming semester year.

Syllabus Text:
"""
${rawText.slice(0, 14000)}
"""

Return ONLY valid JSON with this exact shape:
{
  "course": {
    "code": "CSE 336",
    "name": "Full Course Title",
    "instructor": "Dr. ...",
    "location": "Hall / Room",
    "creditHours": 3,
    "term": "Fall 2026",
    "meetingSlots": [
      { "day": 1, "startTime": "10:00", "endTime": "11:30", "type": "lecture", "location": "Hall 201" }
    ]
  },
  "assignments": [
    { "title": "Assignment 1: ...", "dueDate": "2026-12-01", "type": "homework", "priority": "medium", "estimatedMinutes": 120, "description": "..." }
  ],
  "exams": [
    { "name": "Midterm Exam", "date": "2026-12-10", "startTime": "09:00", "durationMinutes": 90, "examType": "midterm", "weightPercentage": 25, "topics": ["Topic A", "Topic B"], "location": "Exam Hall" }
  ],
  "gradeCategories": [
    { "category": "Exams", "title": "Final Exam", "weight": 40, "maxScore": 100 }
  ]
}
Day mapping: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.
Allowed assignment types: homework, reading, essay, quiz, exam, lab, project, midterm, final, other.
Allowed examType: midterm, final, quiz, practical, other.`;

  const aiRaw = await queryGemini(
    prompt,
    'You are an accurate academic syllabus parser outputting strictly valid JSON.'
  );

  if (aiRaw) {
    try {
      const cleaned = aiRaw.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned);

      const slots = Array.isArray(parsed.course?.meetingSlots)
        ? parsed.course.meetingSlots
            .filter((s: any) => typeof s.day === 'number')
            .map((s: any) => ({
              day: Math.max(0, Math.min(6, Number(s.day))),
              startTime: String(s.startTime || '10:00'),
              endTime: String(s.endTime || '11:30'),
              type: (['lecture', 'tutorial', 'lab', 'seminar'].includes(s.type) ? s.type : 'lecture') as ClassType,
              location: String(s.location || parsed.course?.location || 'Campus')
            }))
        : [];

      return {
        course: {
          code: String(parsed.course?.code || 'COURSE 101'),
          name: String(parsed.course?.name || fileName?.replace(/\.[^/.]+$/, '') || 'Imported Course'),
          instructor: String(parsed.course?.instructor || 'TBA'),
          location: String(parsed.course?.location || 'TBA'),
          creditHours: Math.max(1, Number(parsed.course?.creditHours) || 3),
          term: String(parsed.course?.term || 'Fall 2026'),
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          meetingSlots: slots
        },
        assignments: Array.isArray(parsed.assignments)
          ? parsed.assignments.map((a: any, idx: number) => ({
              title: String(a.title || `Assignment ${idx + 1}`),
              dueDate: normalizeIsoDate(a.dueDate, 10 + idx * 7),
              type: (['homework', 'reading', 'essay', 'quiz', 'exam', 'lab', 'project', 'midterm', 'final', 'other'].includes(a.type)
                ? a.type
                : 'homework') as AssignmentType,
              priority: (['low', 'medium', 'high'].includes(a.priority) ? a.priority : 'medium') as PriorityLevel,
              estimatedMinutes: Math.max(30, Number(a.estimatedMinutes) || 90),
              description: String(a.description || '')
            }))
          : [],
        exams: Array.isArray(parsed.exams)
          ? parsed.exams.map((ex: any, idx: number) => ({
              name: String(ex.name || `Exam ${idx + 1}`),
              date: normalizeIsoDate(ex.date, 28 + idx * 14),
              startTime: String(ex.startTime || '09:00'),
              durationMinutes: Math.max(30, Number(ex.durationMinutes) || 90),
              examType: (['midterm', 'final', 'quiz', 'practical', 'other'].includes(ex.examType)
                ? ex.examType
                : 'midterm') as ExamPeriodType,
              weightPercentage: Math.max(5, Math.min(100, Number(ex.weightPercentage) || 25)),
              topics: Array.isArray(ex.topics) ? ex.topics.map(String) : ['Course Material'],
              location: String(ex.location || parsed.course?.location || 'Exam Hall')
            }))
          : [],
        gradeCategories: Array.isArray(parsed.gradeCategories)
          ? parsed.gradeCategories.map((g: any, idx: number) => ({
              category: String(g.category || 'Coursework'),
              title: String(g.title || `Component ${idx + 1}`),
              weight: Math.max(1, Number(g.weight) || 10),
              maxScore: Math.max(1, Number(g.maxScore) || 100)
            }))
          : [],
        usedAi: true
      };
    } catch {
      // Fall through to heuristic parser
    }
  }

  return heuristicSyllabusParse(rawText, fileName);
}
