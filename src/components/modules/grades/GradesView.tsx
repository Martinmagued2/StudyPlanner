import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Target,
  GraduationCap,
  Calendar,
  BookOpen,
  Edit2,
  X,
  Table,
  HelpCircle
} from 'lucide-react';
import { GradeItem, PreviousTermCourse } from '../../../types';

// The Exact Official GPA Scale from User's Syllabus / Grade Specification
export const OFFICIAL_GPA_SCALE = [
  { minPct: '> 97%', rangeText: 'More than 97%', letter: 'A+', points: 4.0 },
  { minPct: '93% - <97%', rangeText: '93% to less than 97%', letter: 'A', points: 4.0 },
  { minPct: '89% - <93%', rangeText: '89% to less than 93%', letter: 'A-', points: 3.7 },
  { minPct: '84% - <89%', rangeText: '84% to less than 89%', letter: 'B+', points: 3.3 },
  { minPct: '80% - <84%', rangeText: '80% to less than 84%', letter: 'B', points: 3.0 },
  { minPct: '76% - <80%', rangeText: '76% to less than 80%', letter: 'B-', points: 2.7 },
  { minPct: '73% - <76%', rangeText: '73% to less than 76%', letter: 'C+', points: 2.3 },
  { minPct: '70% - <73%', rangeText: '70% to less than 73%', letter: 'C', points: 2.0 },
  { minPct: '67% - <70%', rangeText: '67% to less than 70%', letter: 'C-', points: 1.7 },
  { minPct: '64% - <67%', rangeText: '64% to less than 67%', letter: 'D+', points: 1.3 },
  { minPct: '60% - <64%', rangeText: '60% to less than 64%', letter: 'D', points: 1.0 },
  { minPct: '< 60%', rangeText: 'Less than 60%', letter: 'F', points: 0.0 }
];

export const GradesView: React.FC = () => {
  const {
    gradeItems,
    courses,
    addGradeItem,
    deleteGradeItem,
    previousTermCourses,
    addPreviousTermCourse,
    deletePreviousTermCourse,
    calculateCumulativeGpa,
    calculateTargetExamScore
  } = useApp();

  const [activeTab, setActiveTab] = useState<'current' | 'previous' | 'scale'>('current');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [targetLetter, setTargetLetter] = useState<string>('A');

  // New Assessment Item Form State (for current courses)
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<GradeItem['category']>('homework');
  const [earnedScore, setEarnedScore] = useState<number>(90);
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weightPercent, setWeightPercent] = useState<number>(15);
  const [isUngraded, setIsUngraded] = useState(false);

  // New Previous Term Course Modal State
  const [isPrevModalOpen, setIsPrevModalOpen] = useState(false);
  const [prevTermName, setPrevTermName] = useState('Fall 2025');
  const [prevCourseCode, setPrevCourseCode] = useState('');
  const [prevCourseName, setPrevCourseName] = useState('');
  const [prevCreditHours, setPrevCreditHours] = useState(3);
  const [prevGradeType, setPrevGradeType] = useState<'percentage' | 'letter'>('percentage');
  const [prevPercentage, setPrevPercentage] = useState<number>(92);
  const [prevGradeLetter, setPrevGradeLetter] = useState<string>('A');

  const { gpa, totalCredits, courseGrades } = calculateCumulativeGpa();
  const currentCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const targetCalculation = calculateTargetExamScore(selectedCourseId, targetLetter);

  // Helper to map percentage to scale letter and points
  const getScaleMatch = (pct: number) => {
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
  };

  const handleAddAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !selectedCourseId) return;

    addGradeItem({
      courseId: selectedCourseId,
      name: itemName.trim(),
      category: itemCategory,
      earnedScore: Number(earnedScore),
      maxScore: Number(maxScore),
      weightPercent: Number(weightPercent),
      isUngraded
    });

    setItemName('');
  };

  const handleAddPreviousTermCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prevTermName.trim() || !prevCourseCode.trim()) return;

    if (prevGradeType === 'percentage') {
      const match = getScaleMatch(Number(prevPercentage));
      addPreviousTermCourse({
        termName: prevTermName.trim(),
        courseCode: prevCourseCode.trim().toUpperCase(),
        courseName: prevCourseName.trim() || prevCourseCode.trim().toUpperCase(),
        creditHours: Number(prevCreditHours) || 3,
        percentage: Number(prevPercentage),
        gradeLetter: match.letter,
        gradePoints: match.points
      });
    } else {
      const pts = OFFICIAL_GPA_SCALE.find(s => s.letter === prevGradeLetter)?.points || 0.0;
      addPreviousTermCourse({
        termName: prevTermName.trim(),
        courseCode: prevCourseCode.trim().toUpperCase(),
        courseName: prevCourseName.trim() || prevCourseCode.trim().toUpperCase(),
        creditHours: Number(prevCreditHours) || 3,
        gradeLetter: prevGradeLetter,
        gradePoints: pts
      });
    }

    setIsPrevModalOpen(false);
    setPrevCourseCode('');
    setPrevCourseName('');
  };

  // Group previous term courses by Term Name
  const previousTermsGrouped = previousTermCourses.reduce((acc, item) => {
    const term = item.termName || 'Historical Term';
    if (!acc[term]) acc[term] = [];
    acc[term].push(item);
    return acc;
  }, {} as Record<string, PreviousTermCourse[]>);

  const courseItems = gradeItems.filter(g => g.courseId === selectedCourseId);
  const totalCourseWeight = courseItems.reduce((acc, i) => acc + (i.weightPercent || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Academic Grades & GPA Calculator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Credit-weighted Cumulative GPA calculation, historical terms transcript, and current coursework assessment models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrevModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Previous Term Course</span>
          </button>
        </div>
      </div>

      {/* Top Cumulative GPA Dashboard Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Cumulative Weighted GPA</span>
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {gpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Scale: 4.0 Max</span>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">{totalCredits} total credits counted</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Academic Standing</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {gpa >= 3.7 ? 'First Class Distinction' : gpa >= 3.0 ? 'Upper Second Class (2:1)' : gpa >= 2.0 ? 'Good Standing' : totalCredits === 0 ? 'Fresh Workspace' : 'Academic Notice'}
          </div>
          <span className="text-[11px] text-slate-400">
            {totalCredits === 0 ? 'Add courses or past grades to begin calculation' : `${courses.length} active courses • ${previousTermCourses.length} past courses`}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Grading System Scale</span>
            <button
              onClick={() => setActiveTab('scale')}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
            >
              <span>View Scale Table</span>
            </button>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
            12-Tier Standard Scale
          </div>
          <span className="text-[11px] text-slate-500">
            A+ (4.0) &gt;97% down to F (0.0) &lt;60%
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 text-xs font-medium">
        <button
          onClick={() => setActiveTab('current')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'current'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Current Term Courses & Weights ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('previous')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'previous'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Previous Terms & Historical Grades ({previousTermCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scale')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'scale'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Official GPA Scale Table</span>
        </button>
      </div>

      {/* TAB 1: CURRENT TERM COURSES */}
      {activeTab === 'current' && (
        <div className="space-y-6">
          {courses.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Active Courses in Workspace</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your workspace is fresh. Add your courses in the Courses section to track assignments, weighting, and grade projections.
              </p>
            </div>
          ) : (
            <>
              {/* Course Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {courses.map(c => {
                  const gradeInfo = courseGrades[c.id];
                  const isSelected = (selectedCourseId || courses[0]?.id) === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.code}</span>
                      {gradeInfo ? (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/20 dark:bg-black/20 font-bold">
                          {gradeInfo.letter} ({gradeInfo.percentage}%) • {gradeInfo.points} pts
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-60">Pending</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Course Grade Overview & Target Exam Predictor */}
              {currentCourse && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selected Course Metric */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">{currentCourse.code} — {currentCourse.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {currentCourse.creditHours} Credits
                      </span>
                    </div>

                    {courseGrades[currentCourse.id] ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                            {courseGrades[currentCourse.id].letter}
                          </span>
                          <span className="text-lg font-bold text-slate-600 dark:text-slate-400 font-mono">
                            {courseGrades[currentCourse.id].percentage}%
                          </span>
                          <span className="text-xs text-blue-600 font-semibold font-mono">
                            ({courseGrades[currentCourse.id].points} GPA Points)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Total assessment weight configured: {totalCourseWeight}%
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">No graded items yet</div>
                        <div className="text-[11px] text-slate-400">Add assessment scores below to calculate your course grade.</div>
                      </div>
                    )}
                  </div>

                  {/* Target Grade Exam Predictor Card */}
                  <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span>Target Grade Exam Score Predictor ({currentCourse.code})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Target:</span>
                        <select
                          value={targetLetter}
                          onChange={e => setTargetLetter(e.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                        >
                          <option value="A+">A+ (&gt;97%)</option>
                          <option value="A">A (93% - 97%)</option>
                          <option value="A-">A- (89% - 93%)</option>
                          <option value="B+">B+ (84% - 89%)</option>
                          <option value="B">B (80% - 84%)</option>
                          <option value="B-">B- (76% - 80%)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-slate-500 text-[11px]">Required Score on remaining coursework/exams:</div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono mt-0.5">
                          {targetCalculation.neededScore}%
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold capitalize ${
                        targetCalculation.status === 'guaranteed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        targetCalculation.status === 'achievable' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        Target {targetCalculation.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment Breakdown Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 text-xs font-semibold text-slate-500">
                  <div className="col-span-5">Assessment Component</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Weight (%)</div>
                  <div className="col-span-1 text-right">Delete</div>
                </div>

                {courseItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No assessments recorded for {currentCourse?.code}. Use the quick form below to add homework, quizzes, exams, or projects.
                  </div>
                ) : (
                  courseItems.map(item => {
                    const pct = Math.round((item.earnedScore / item.maxScore) * 100);
                    const scaleInfo = getScaleMatch(pct);
                    return (
                      <div key={item.id} className="p-3.5 border-b border-slate-100 dark:border-slate-800 grid grid-cols-12 items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <div className="col-span-5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                        </div>
                        <div className="col-span-2 text-slate-500 capitalize">{item.category}</div>
                        <div className="col-span-2 text-center font-mono font-semibold">
                          <span>{item.earnedScore} / {item.maxScore}</span>
                          <span className="text-slate-400 text-[11px] ml-1">({pct}% • {scaleInfo.letter})</span>
                        </div>
                        <div className="col-span-2 text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.weightPercent}%
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => deleteGradeItem(item.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 ml-auto"
                            title="Delete assessment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Assessment Component Form */}
              <form onSubmit={handleAddAssessment} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs shadow-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">Add Assessment:</span>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g. Midterm Exam, Quiz 3"
                  className="flex-1 min-w-[150px] px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />

                <select
                  value={itemCategory}
                  onChange={e => setItemCategory(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="homework">Homework</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Exam</option>
                  <option value="project">Project</option>
                  <option value="lab">Lab</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={earnedScore}
                    onChange={e => setEarnedScore(Number(e.target.value))}
                    placeholder="Score"
                    className="w-16 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={e => setMaxScore(Number(e.target.value))}
                    placeholder="Max"
                    className="w-16 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={weightPercent}
                    onChange={e => setWeightPercent(Number(e.target.value))}
                    placeholder="Weight"
                    className="w-16 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono"
                  />
                  <span className="text-slate-400 font-semibold">%</span>
                </div>

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800 ml-auto"
                >
                  Add Assessment
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* TAB 2: PREVIOUS TERMS & TRANSCRIPT HISTORY */}
      {activeTab === 'previous' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Past Terms & Transcript History</h3>
              <p className="text-xs text-slate-500">Record prior terms to accurately compute your Cumulative GPA across your entire degree.</p>
            </div>
            <button
              onClick={() => setIsPrevModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Past Course</span>
            </button>
          </div>

          {previousTermCourses.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Previous Terms Recorded</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "+ Add Past Course" to enter prior terms (e.g. Fall 2024, Spring 2025), completed courses, credit hours, and grades.
              </p>
            </div>
          ) : (
            Object.entries(previousTermsGrouped).map(([termName, termCourses]) => {
              // Calculate Term GPA
              const termCredits = termCourses.reduce((acc, c) => acc + c.creditHours, 0);
              const termPoints = termCourses.reduce((acc, c) => acc + (c.gradePoints || 0) * c.creditHours, 0);
              const termGpa = termCredits > 0 ? (termPoints / termCredits).toFixed(2) : '0.00';

              return (
                <div key={termName} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  {/* Term Header */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{termName}</span>
                      <span className="text-xs text-slate-500">({termCourses.length} courses)</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-500">{termCredits} Credits</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Term GPA: {termGpa}
                      </span>
                    </div>
                  </div>

                  {/* Courses in Term */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {termCourses.map(c => (
                      <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{c.courseCode}</span>
                            <span className="text-slate-700 dark:text-slate-300">{c.courseName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {c.creditHours} Credit Hours
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right font-mono">
                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {c.gradeLetter} {c.percentage ? `(${c.percentage}%)` : ''}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.gradePoints?.toFixed(1)} Points
                            </div>
                          </div>

                          <button
                            onClick={() => deletePreviousTermCourse(c.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Delete past course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: OFFICIAL GPA SCALE TABLE (MATCHES IMAGE 1-TO-1) */}
      {activeTab === 'scale' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-4 p-5">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Official University Academic Grading & GPA Scale
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact formula and grade point translation applied to all coursework marks and cumulative transcript calculations.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">Marks % Collected</th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-center">Grade</th>
                  <th className="p-3 text-center">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {OFFICIAL_GPA_SCALE.map((tier, idx) => (
                  <tr key={tier.letter + idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-sans font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                      {tier.rangeText}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {tier.letter}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {tier.points.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Previous Term Course Modal */}
      {isPrevModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Add Past Term Course Grade
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrevModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPreviousTermCourse} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Term *</label>
                <input
                  type="text"
                  required
                  value={prevTermName}
                  onChange={e => setPrevTermName(e.target.value)}
                  placeholder="e.g. Fall 2024, Spring 2025"
                  className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={prevCourseCode}
                    onChange={e => setPrevCourseCode(e.target.value)}
                    placeholder="e.g. MATH 150"
                    className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Credit Hours *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={prevCreditHours}
                    onChange={e => setPrevCreditHours(Number(e.target.value))}
                    className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name (Optional)</label>
                <input
                  type="text"
                  value={prevCourseName}
                  onChange={e => setPrevCourseName(e.target.value)}
                  placeholder="e.g. Calculus I"
                  className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prevGradeType"
                      checked={prevGradeType === 'percentage'}
                      onChange={() => setPrevGradeType('percentage')}
                      className="accent-blue-600"
                    />
                    <span>Enter Marks % (Auto Scale)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prevGradeType"
                      checked={prevGradeType === 'letter'}
                      onChange={() => setPrevGradeType('letter')}
                      className="accent-blue-600"
                    />
                    <span>Select Letter Grade</span>
                  </label>
                </div>

                {prevGradeType === 'percentage' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={prevPercentage}
                        onChange={e => setPrevPercentage(Number(e.target.value))}
                        className="w-24 p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                      <span className="text-slate-500 font-semibold">%</span>
                      <span className="ml-auto font-mono text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                        Maps to: {getScaleMatch(prevPercentage).letter} ({getScaleMatch(prevPercentage).points} pts)
                      </span>
                    </div>
                  </div>
                ) : (
                  <select
                    value={prevGradeLetter}
                    onChange={e => setPrevGradeLetter(e.target.value)}
                    className="w-full p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    {OFFICIAL_GPA_SCALE.map(s => (
                      <option key={s.letter} value={s.letter}>
                        {s.letter} — {s.points.toFixed(1)} Points ({s.rangeText})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPrevModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800"
                >
                  Save Course Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
