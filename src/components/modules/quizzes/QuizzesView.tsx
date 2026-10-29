import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  HelpCircle,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronRight,
  BookOpen,
  Award,
  AlertTriangle
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizAttempt } from '../../../types';

export const QuizzesView: React.FC = () => {
  const { quizzes, courses, createQuizFromCourse, submitQuizAttempt, createFlashcardsFromQuizErrors } = useApp();

  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');
  const [activeQuizRunning, setActiveQuizRunning] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [activeAttemptResult, setActiveAttemptResult] = useState<QuizAttempt | null>(null);

  const selectedQuiz = quizzes.find(q => q.id === selectedQuizId) || quizzes[0];

  const startQuiz = (quiz: Quiz) => {
    setActiveQuizRunning(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setActiveAttemptResult(null);
  };

  const handleSelectOption = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (!activeQuizRunning) return;
    if (currentQuestionIndex < activeQuizRunning.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Submit quiz
      const attempt = submitQuizAttempt(activeQuizRunning.id, userAnswers);
      setActiveAttemptResult(attempt);
    }
  };

  const handleConvertMissedToCards = () => {
    if (!activeQuizRunning || !activeAttemptResult) return;

    const errors: { question: string; answer: string; courseId?: string }[] = [];
    activeQuizRunning.questions.forEach(q => {
      const uAns = (activeAttemptResult.userAnswers[q.id] || '').trim().toLowerCase();
      const cAns = q.correctAnswer.trim().toLowerCase();
      if (uAns !== cAns) {
        errors.push({
          question: q.prompt,
          answer: `${q.correctAnswer} — ${q.explanation}`,
          courseId: activeQuizRunning.courseId
        });
      }
    });

    createFlashcardsFromQuizErrors(activeQuizRunning.title, errors);
    alert(`Converted ${errors.length} missed questions into target flashcards in Study Hub!`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            AI Quizzes & Diagnostic Practice Tests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Objective and short-answer diagnostic tests with weak-topic extraction and one-click flashcard conversion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => createQuizFromCourse(courses[0]?.id || 'course_cs302', 'medium')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate New Quiz</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {!activeQuizRunning ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map(quiz => {
            const course = courses.find(c => c.id === quiz.courseId);
            const latestAttempt = quiz.attempts[0];

            return (
              <div
                key={quiz.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    {course ? (
                      <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded border" style={{ borderColor: course.color, color: course.color }}>
                        {course.code}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Diagnostic</span>
                    )}

                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono capitalize">
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {quiz.title}
                  </h3>

                  <div className="text-xs text-slate-500 font-mono">
                    {quiz.questions.length} Questions (MCQ, True/False & Short Answer)
                  </div>

                  {latestAttempt && (
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                      <span className="text-slate-500">Last Score:</span>
                      <span className={`font-mono font-bold ${latestAttempt.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {latestAttempt.score}%
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => startQuiz(quiz)}
                  className="w-full py-2 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{latestAttempt ? 'Retake Quiz' : 'Start Diagnostic Quiz'}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : activeAttemptResult ? (
        /* Quiz Completed & Results Screen */
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-4">
            <div className="text-xs font-mono font-semibold uppercase text-slate-400">
              Diagnostic Attempt Completed
            </div>
            <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {activeAttemptResult.score}%
            </div>
            <p className="text-xs text-slate-500">
              Answers evaluated instantly. Weak topics identified and ready to consolidate into spaced repetition flashcards.
            </p>

            {activeAttemptResult.weakTopics.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Identified Weak Topics: {activeAttemptResult.weakTopics.join(', ')}</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleConvertMissedToCards}
                className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert Errors to Flashcards</span>
              </button>
              <button
                onClick={() => setActiveQuizRunning(null)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
              >
                Back to Quizzes
              </button>
            </div>
          </div>

          {/* Breakdown of Every Question */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Question Breakdown & Explanations
            </h4>
            {activeQuizRunning.questions.map((q, idx) => {
              const uAns = (activeAttemptResult.userAnswers[q.id] || '').trim();
              const isCorrect = uAns.toLowerCase() === q.correctAnswer.toLowerCase() || (q.type === 'short' && uAns.toLowerCase().includes(q.correctAnswer.toLowerCase()));

              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span>Question {idx + 1} • {q.topic}</span>
                    <span className={`font-sans font-semibold flex items-center gap-1 ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{isCorrect ? 'Correct' : 'Missed'}</span>
                    </span>
                  </div>

                  <h5 className="font-semibold text-slate-900 dark:text-slate-100">{q.prompt}</h5>

                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-slate-600 dark:text-slate-400">
                      <strong>Your Answer:</strong> {uAns || 'None (Skipped)'}
                    </div>
                    <div className="text-emerald-600 dark:text-emerald-400">
                      <strong>Correct Answer:</strong> {q.correctAnswer}
                    </div>
                    <div className="text-slate-500 italic mt-1">
                      {q.explanation}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Quiz Running Screen (One question at a time) */
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Question {currentQuestionIndex + 1} of {activeQuizRunning.questions.length}</span>
            <button
              onClick={() => setActiveQuizRunning(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              Exit Quiz
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-slate-900 dark:bg-slate-100 h-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / activeQuizRunning.questions.length) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          {(() => {
            const currentQ = activeQuizRunning.questions[currentQuestionIndex];
            const currentSelected = userAnswers[currentQ.id] || '';

            return (
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
                <div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Topic: {currentQ.topic}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-2 leading-relaxed">
                    {currentQ.prompt}
                  </h3>
                </div>

                {/* Multiple Choice Options */}
                {currentQ.type === 'mcq' && currentQ.options && (
                  <div className="space-y-2">
                    {currentQ.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`w-full p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                          currentSelected === opt
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {currentQ.type === 'tf' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['True', 'False'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        className={`p-4 rounded-lg border text-center text-xs font-bold transition-colors ${
                          currentSelected === opt
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Short Answer */}
                {currentQ.type === 'short' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentSelected}
                      onChange={e => handleSelectOption(currentQ.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
                    />
                  </div>
                )}

                {/* Next / Submit button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleNextQuestion}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Skip Question
                  </button>

                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <span>{currentQuestionIndex === activeQuizRunning.questions.length - 1 ? 'Submit Answers' : 'Next Question'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
