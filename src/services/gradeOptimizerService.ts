import { Assignment, Course, Exam, GradeItem, PreviousTermCourse } from '../types';
import { queryGemini } from './fileAiService';

export interface CourseSimulationSummary {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  gradedWeightTotal: number;
  remainingWeight: number;
  currentWeightedPct: number;
  simulatedUpcomingPct: number;
  projectedFinalPct: number;
  projectedLetter: string;
  projectedPoints: number;
  currentLetter: string;
  currentPoints: number;
  upcomingDeadlineTitle?: string;
  upcomingDaysLeft?: number;
  studySharePct: number;
  leverageScore: number;
}

export interface WhatIfPlanResult {
  courseSummaries: CourseSimulationSummary[];
  currentTermGpa: number;
  projectedTermGpa: number;
  currentCumulativeGpa: number;
  projectedCumulativeGpa: number;
  headlineRecommendation: string;
}

export function matchGpaScale(pct: number): { letter: string; points: number } {
  if (pct > 97) return { letter: 'A+', points: 4.0 };
  if (pct >= 93) return { letter: 'A', points: 4.0 };
  if (pct >= 89) return { letter: 'A-', points: 3.7 };
  if (pct >= 84) return { letter: 'B+', points: 3.3 };
  if (pct >= 80) return { letter: 'B', points: 3.0 };
  if (pct >= 76) return { letter: 'B-', points: 2.7 };
  if (pct >= 73) return { letter: 'C+', points: 2.3 };
  if (pct >= 70) return { letter: 'C', points: 2.0 };
  if (pct >= 67) return { letter: 'C-', points: 1.7 };
  if (pct >= 64) return { letter: 'D+', points: 1.3 };
  if (pct >= 60) return { letter: 'D', points: 1.0 };
  return { letter: 'F', points: 0.0 };
}

export function simulateWhatIfGpa(params: {
  courses: Course[];
  gradeItems: GradeItem[];
  exams: Exam[];
  assignments: Assignment[];
  previousTermCourses: PreviousTermCourse[];
  simulatedScoresByCourse: Record<string, number>;
}): WhatIfPlanResult {
  const { courses, gradeItems, exams, assignments, previousTermCourses, simulatedScoresByCourse } = params;
  const activeCourses = courses.filter(c => !c.isArchived);
  const now = Date.now();

  const rawSummaries = activeCourses.map(course => {
    const items = gradeItems.filter(g => g.courseId === course.id);
    const gradedItems = items.filter(g => !g.isUngraded);
    const ungradedItems = items.filter(g => g.isUngraded);

    let gradedWeightTotal = 0;
    let gradedWeightedSum = 0;
    gradedItems.forEach(g => {
      const pct = g.maxScore > 0 ? (g.earnedScore / g.maxScore) * 100 : 0;
      const w = Math.max(0, Number(g.weightPercent) || 0);
      gradedWeightTotal += w;
      gradedWeightedSum += pct * w;
    });

    const ungradedWeight = ungradedItems.reduce((sum, g) => sum + Math.max(0, Number(g.weightPercent) || 0), 0);
    const courseExams = exams
      .filter(e => e.courseId === course.id && e.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const courseAssignments = assignments
      .filter(a => a.courseId === course.id && a.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const explicitRemaining = Math.max(0, 100 - gradedWeightTotal);
    const remainingWeight = ungradedWeight > 0 ? Math.min(100, ungradedWeight) : explicitRemaining;

    const currentWeightedPct = gradedWeightTotal > 0 ? gradedWeightedSum / gradedWeightTotal : 85;
    const simulatedUpcomingPct =
      typeof simulatedScoresByCourse[course.id] === 'number'
        ? Math.max(0, Math.min(100, simulatedScoresByCourse[course.id]))
        : Math.round(currentWeightedPct);

    const totalCombinedWeight = gradedWeightTotal + remainingWeight;
    const projectedFinalPct =
      totalCombinedWeight > 0
        ? (gradedWeightedSum + simulatedUpcomingPct * remainingWeight) / totalCombinedWeight
        : simulatedUpcomingPct;

    const currentScale = matchGpaScale(currentWeightedPct);
    const projectedScale = matchGpaScale(projectedFinalPct);

    const nextExam = courseExams[0];
    const nextAsg = courseAssignments[0];
    const upcomingDeadlineTitle = nextExam?.name || nextAsg?.title;
    const targetTime = nextExam
      ? new Date(nextExam.date).getTime()
      : nextAsg
        ? new Date(nextAsg.dueDate).getTime()
        : null;
    const upcomingDaysLeft = targetTime ? Math.max(0, Math.ceil((targetTime - now) / 86400000)) : undefined;

    // Leverage score combines remaining grade weight, credit hours, closeness to grade boundaries / room to grow, and deadline urgency
    const urgencyBoost = upcomingDaysLeft !== undefined ? Math.max(1, 14 - Math.min(13, upcomingDaysLeft)) * 0.12 : 1;
    const improvementNeed = currentWeightedPct < 88 ? 1.45 : currentWeightedPct < 93 ? 1.15 : 0.85;
    const credits = Math.max(1, Number(course.creditHours) || 3);
    const leverageScore = Math.max(1, Math.round((Math.max(15, remainingWeight) * credits * improvementNeed * urgencyBoost) / 10));

    return {
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      credits,
      gradedWeightTotal: Math.round(gradedWeightTotal),
      remainingWeight: Math.round(remainingWeight),
      currentWeightedPct: Number(currentWeightedPct.toFixed(1)),
      simulatedUpcomingPct: Math.round(simulatedUpcomingPct),
      projectedFinalPct: Number(projectedFinalPct.toFixed(1)),
      projectedLetter: projectedScale.letter,
      projectedPoints: projectedScale.points,
      currentLetter: currentScale.letter,
      currentPoints: currentScale.points,
      upcomingDeadlineTitle,
      upcomingDaysLeft,
      studySharePct: 0,
      leverageScore
    };
  });

  const totalLeverage = rawSummaries.reduce((acc, s) => acc + s.leverageScore, 0) || 1;
  const courseSummaries = rawSummaries
    .map(s => ({
      ...s,
      studySharePct: Math.round((s.leverageScore / totalLeverage) * 100)
    }))
    .sort((a, b) => b.studySharePct - a.studySharePct);

  // Term GPAs
  const totalTermCredits = courseSummaries.reduce((s, c) => s + c.credits, 0);
  const currentTermGpa =
    totalTermCredits > 0
      ? Number((courseSummaries.reduce((s, c) => s + c.currentPoints * c.credits, 0) / totalTermCredits).toFixed(2))
      : 0;
  const projectedTermGpa =
    totalTermCredits > 0
      ? Number((courseSummaries.reduce((s, c) => s + c.projectedPoints * c.credits, 0) / totalTermCredits).toFixed(2))
      : 0;

  // Cumulative GPAs
  const prevCredits = previousTermCourses.reduce((s, p) => s + (Number(p.creditHours) || 3), 0);
  const prevPointsSum = previousTermCourses.reduce((s, p) => {
    const pts = p.gradePoints ?? (typeof p.percentage === 'number' ? matchGpaScale(p.percentage).points : 3.0);
    return s + pts * (Number(p.creditHours) || 3);
  }, 0);

  const totalCumCredits = totalTermCredits + prevCredits;
  const currentCumulativeGpa =
    totalCumCredits > 0
      ? Number(((prevPointsSum + currentTermGpa * totalTermCredits) / totalCumCredits).toFixed(2))
      : 0;
  const projectedCumulativeGpa =
    totalCumCredits > 0
      ? Number(((prevPointsSum + projectedTermGpa * totalTermCredits) / totalCumCredits).toFixed(2))
      : 0;

  const top = courseSummaries[0];
  let headlineRecommendation = 'Add courses and grade weights to compute personalized GPA study leverage.';
  if (top) {
    const delta = (projectedTermGpa - currentTermGpa).toFixed(2);
    const dir = Number(delta) >= 0 ? `raises your Term GPA from ${currentTermGpa.toFixed(2)} to ${projectedTermGpa.toFixed(2)}` : `puts your Term GPA at ${projectedTermGpa.toFixed(2)}`;
    headlineRecommendation = `Focus ${top.studySharePct}% of this week on ${top.courseCode} (currently ${top.currentWeightedPct}%, ${top.remainingWeight}% weight remaining${
      top.upcomingDeadlineTitle ? ` • ${top.upcomingDeadlineTitle}` : ''
    }) — scoring ${top.simulatedUpcomingPct}% ${dir}.`;
  }

  return {
    courseSummaries,
    currentTermGpa,
    projectedTermGpa,
    currentCumulativeGpa,
    projectedCumulativeGpa,
    headlineRecommendation
  };
}

export async function generateAiGradeAdvice(
  plan: WhatIfPlanResult,
  targetTermGpa: number
): Promise<string> {
  const summaryRows = plan.courseSummaries
    .map(
      c =>
        `- ${c.courseCode} (${c.courseName}, ${c.credits} cr): current ${c.currentWeightedPct}% (${c.currentLetter}), remaining weight ${c.remainingWeight}%, simulated upcoming score ${c.simulatedUpcomingPct}% -> projected ${c.projectedFinalPct}% (${c.projectedLetter}), recommended weekly study share ${c.studySharePct}%${
          c.upcomingDeadlineTitle ? `, next: ${c.upcomingDeadlineTitle} in ${c.upcomingDaysLeft ?? '?'}d` : ''
        }`
    )
    .join('\n');

  const prompt = `You are an elite university academic strategist.
Analyze this student's real GPA simulation and give a crisp, motivating 4-point weekly study optimization plan to reach a Target Term GPA of ${targetTermGpa.toFixed(2)}.

Current Term GPA: ${plan.currentTermGpa.toFixed(2)}
Simulated Projected Term GPA: ${plan.projectedTermGpa.toFixed(2)}
Projected Cumulative GPA: ${plan.projectedCumulativeGpa.toFixed(2)}

Courses:
${summaryRows}

Explain:
1) Exact % time split across courses and WHY (highest GPA points gained per hour)
2) Specific minimum target scores on remaining exams/assessments to hit ${targetTermGpa.toFixed(2)}
3) Concrete 7-day execution advice.`;

  const aiResp = await queryGemini(
    prompt,
    'Be specific with the numbers provided, concise, encouraging, and output clean markdown.'
  );
  if (aiResp) return aiResp;

  return `### 🎯 Smart GPA Strategy (Target: ${targetTermGpa.toFixed(2)})\n\n- **Primary Focus**: ${plan.headlineRecommendation}\n${plan.courseSummaries
    .slice(0, 4)
    .map(
      c =>
        `- **${c.courseCode} (${c.studySharePct}% study share)**: Currently ${c.currentWeightedPct}% (${c.currentLetter}). Aiming for **${c.simulatedUpcomingPct}%** on remaining **${c.remainingWeight}%** brings your course grade to **${c.projectedFinalPct}% (${c.projectedLetter})**.`
    )
    .join('\n')}`;
}
