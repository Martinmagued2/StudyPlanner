import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  ArrowLeft,
  BookOpen,
  FileCheck2,
  FileText,
  FolderArchive,
  HelpCircle,
  GitBranch,
  Bot,
  MapPin,
  Clock,
  User,
  Plus,
  ExternalLink,
  Sparkles,
  Send,
  GitCommit as GitCommitIcon,
  Play,
  CheckCircle2,
  CheckSquare,
  Trash2,
  Pencil,
  X,
  UploadCloud
} from 'lucide-react';
import { ClassType, MeetingSlot } from '../../../types';
import { extractTextFromFile } from '../../../services/fileAiService';

export const CourseDetailView: React.FC = () => {
  const {
    selectedCourseId,
    courses,
    setActiveView,
    activeCourseTab,
    setActiveCourseTab,
    assignments,
    notes,
    files,
    quizzes,
    githubRepos,
    addNote,
    addAssignment,
    addFile,
    startFocusTimer,
    breakdownAssignmentWithAi,
    createQuizFromCourse,
    updateCourse,
    deleteCourse
  } = useApp();

  const course = courses.find(c => c.id === selectedCourseId) || courses[0];

  const [isUploadingCourseFile, setIsUploadingCourseFile] = useState(false);

  const handleCourseFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !course) return;

    if (file.size > 30 * 1024 * 1024) {
      alert('Upload error: File exceeds 30 MB size limit.');
      return;
    }

    setIsUploadingCourseFile(true);
    try {
      const { text, pageCount, fileType } = await extractTextFromFile(file);
      addFile(
        {
          name: file.name,
          sizeBytes: file.size,
          fileType,
          status: 'fully_read',
          pageCount,
          courseId: course.id,
          isFavorite: false,
          rawText: text,
          summary: `Extracted ${text.split(/\s+/).length} words across ${pageCount} pages for ${course.code}: ${course.name}.`
        },
        text
      );
    } catch (err) {
      console.error('File extraction failed:', err);
      alert('Error extracting text from file.');
    } finally {
      setIsUploadingCourseFile(false);
      e.target.value = '';
    }
  };

  if (!course) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-slate-400 text-sm">No course selected or this course has been deleted.</p>
        <button
          onClick={() => setActiveView('courses')}
          className="px-4 py-2 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  // Study Agent local chat state
  const [agentMessages, setAgentMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; citations?: string[] }>>([
    {
      sender: 'agent',
      text: `Hello! I am your dedicated course Study Agent for ${course.code}: ${course.name}. I have indexed your syllabus, lecture slides, notes, and assignments. How would you like to prepare today?`
    }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit Course Form State
  const [editCode, setEditCode] = useState(course.code);
  const [editName, setEditName] = useState(course.name);
  const [editInstructor, setEditInstructor] = useState(course.instructor);
  const [editColor, setEditColor] = useState(course.color);
  const [editLocation, setEditLocation] = useState(course.location);
  const [editCredits, setEditCredits] = useState(course.creditHours);
  const [editTerm, setEditTerm] = useState(course.term);
  const [editSyllabusUrl, setEditSyllabusUrl] = useState(course.syllabusUrl || '');
  const [editSlots, setEditSlots] = useState<Array<{ id: string; day: number; type: ClassType; startTime: string; endTime: string; location: string }>>(
    course.meetingSlots.length > 0
      ? course.meetingSlots.map((s, idx) => ({
          id: s.id || `slot_${idx}`,
          day: s.day,
          type: s.type,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || course.location
        }))
      : [{ id: '1', day: 1, type: 'lecture', startTime: '10:00', endTime: '11:30', location: course.location || 'Lecture Hall A' }]
  );

  const openEditModal = () => {
    setEditCode(course.code);
    setEditName(course.name);
    setEditInstructor(course.instructor);
    setEditColor(course.color);
    setEditLocation(course.location);
    setEditCredits(course.creditHours);
    setEditTerm(course.term);
    setEditSyllabusUrl(course.syllabusUrl || '');
    setEditSlots(
      course.meetingSlots.length > 0
        ? course.meetingSlots.map((s, idx) => ({
            id: s.id || `slot_${idx}`,
            day: s.day,
            type: s.type,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || course.location
          }))
        : [{ id: '1', day: 1, type: 'lecture', startTime: '10:00', endTime: '11:30', location: course.location || 'Lecture Hall A' }]
    );
    setIsEditModalOpen(true);
  };

  const handleSaveCourseEdits = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedSlots: MeetingSlot[] = editSlots.map((s, idx) => ({
      id: `ms_${Date.now()}_${idx}`,
      day: Number(s.day),
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type,
      location: s.location.trim() || editLocation || 'Campus Classroom'
    }));

    updateCourse(course.id, {
      code: editCode,
      name: editName,
      instructor: editInstructor || 'Staff',
      color: editColor,
      location: editLocation || editSlots[0]?.location || 'Campus Hall',
      creditHours: Number(editCredits) || 3,
      term: editTerm || 'Fall 2026',
      syllabusUrl: editSyllabusUrl || undefined,
      meetingSlots: formattedSlots
    });
    setIsEditModalOpen(false);
  };

  // Course specific items
  const courseAssignments = assignments.filter(a => a.courseId === course.id);
  const courseNotes = notes.filter(n => n.courseId === course.id && !n.inTrash);
  const courseFiles = files.filter(f => f.courseId === course.id);
  const courseQuizzes = quizzes.filter(q => q.courseId === course.id);
  const courseRepos = githubRepos.filter(r => r.courseId === course.id);

  const tabs = [
    { id: 'overview', label: '1. Overview', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'assignments', label: `2. Assignments (${courseAssignments.length})`, icon: <FileCheck2 className="w-3.5 h-3.5" /> },
    { id: 'notes', label: `3. Notes (${courseNotes.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'files', label: `4. Files (${courseFiles.length})`, icon: <FolderArchive className="w-3.5 h-3.5" /> },
    { id: 'quizzes', label: `5. Quizzes (${courseQuizzes.length})`, icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'projects', label: `6. Projects (${courseRepos.length})`, icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'agent', label: '7. Study Agent', icon: <Bot className="w-3.5 h-3.5" /> },
  ];

  const handleAgentSend = (promptText?: string) => {
    const textToSend = promptText || agentInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setAgentMessages(prev => [...prev, userMsg]);
    if (!promptText) setAgentInput('');

    setTimeout(() => {
      let reply = '';
      let citations: string[] = [];

      if (textToSend.includes('lecture') || textToSend.includes('prepare')) {
        reply = `For the upcoming ${course.code} lecture on Self-Balancing Trees in Turing Hall 101, review the AVL invariant balance factor condition: |height(left) - height(right)| <= 1. Remember that zigzag Left-Right insertions demand a double rotation rather than a single pivot.`;
        citations = ['CS302_Lecture12_SelfBalancingTrees.pdf • Page 14'];
      } else if (textToSend.includes('quiz') || textToSend.includes('test')) {
        reply = `Quick check: Why does an AVL tree's worst-case height never exceed 1.44 log₂(n)? Answer: Because the minimum number of nodes follows a Fibonacci progression.`;
        citations = ['CS302_Lecture12_SelfBalancingTrees.pdf • Page 29'];
      } else {
        reply = `I have cross-referenced your course notes and indexed lecture slides for ${course.name}. The next deadline is "${courseAssignments[0]?.title || 'upcoming coursework'}".`;
      }

      setAgentMessages(prev => [...prev, { sender: 'agent', text: reply, citations }]);
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Back button & Course Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('courses')}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{ backgroundColor: course.color }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {course.code}
              </span>
              <span className="text-xs text-slate-500">{course.term}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {course.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {course.syllabusUrl && (
            <a
              href={course.syllabusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <span>Syllabus</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => setActiveCourseTab('agent')}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Course Agent</span>
          </button>
          <button
            onClick={openEditModal}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
            title="Edit course details & schedule"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Course</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1.5 transition-colors"
            title="Delete this course"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete Course</span>
          </button>
        </div>
      </div>

      {/* 7 Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1 text-xs font-medium">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCourseTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
              activeCourseTab === tab.id
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* TAB 1: OVERVIEW */}
        {activeCourseTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-5">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Course Information</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Instructor:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{course.instructor}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Classroom / Location:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{course.location}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Credit Hours:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{course.creditHours} Credits</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Academic Semester:</span>
                    <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{course.term}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Weekly Class Meetings & Locations</h4>
                  {(!course.meetingSlots || course.meetingSlots.length === 0) ? (
                    <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs italic">
                      No weekly class slots configured for this course.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {course.meetingSlots.map((slot, i) => (
                        <div key={i} className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.day]}
                            </span>
                            <span className="text-slate-500 font-mono">{slot.startTime} – {slot.endTime}</span>
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 ml-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{slot.location}</span>
                            </span>
                          </div>
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-semibold self-start sm:self-auto text-slate-700 dark:text-slate-300">
                            {slot.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Named Links */}
              {course.links.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Course External Resources</h4>
                  <div className="space-y-1.5">
                    {course.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 hover:underline"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions & Upcoming Deadline */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Deadline</h4>
                {courseAssignments[0] ? (
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-1 text-xs">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                      {courseAssignments[0].priority.toUpperCase()} PRIORITY
                    </span>
                    <h5 className="font-semibold text-slate-900 dark:text-slate-100 mt-1">{courseAssignments[0].title}</h5>
                    <p className="text-[11px] text-slate-500">Due {new Date(courseAssignments[0].dueDate).toLocaleDateString()}</p>
                    <button
                      onClick={() => startFocusTimer(25, undefined, course.id, courseAssignments[0].title)}
                      className="mt-2 w-full py-1 text-xs font-medium rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      <span>Start Focus Block</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No pending assignments.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASSIGNMENTS */}
        {activeCourseTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Coursework Assignments</h3>
              <button
                onClick={() => setActiveView('assignments')}
                className="text-xs text-blue-600 hover:underline"
              >
                View Full Assignment Kanban Board →
              </button>
            </div>
            <div className="space-y-3">
              {courseAssignments.map(asg => (
                <div
                  key={asg.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 capitalize">
                          {asg.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{asg.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{asg.description}</p>
                    </div>
                    {!asg.isBrokenDown && (
                      <button
                        onClick={() => breakdownAssignmentWithAi(asg.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 shrink-0 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>AI Breakdown</span>
                      </button>
                    )}
                  </div>

                  {/* Steps */}
                  {asg.steps.length > 0 && (
                    <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Actionable Steps ({asg.steps.filter(s => s.completed).length}/{asg.steps.length})
                      </span>
                      {asg.steps.map(step => (
                        <div key={step.id} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${step.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                          <span className={step.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: NOTES */}
        {activeCourseTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Course Lecture Notes</h3>
              <button
                onClick={() => addNote({ title: `Lecture Notes (${course.code})`, content: '<p>New notes...</p>', courseId: course.id, tags: [course.code], pinned: false, highlightedTerms: [] })}
                className="px-3 py-1.5 text-xs font-medium rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Lecture Note</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setActiveView('notes')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 cursor-pointer space-y-2"
                >
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                  <div
                    className="text-[11px] text-slate-500 line-clamp-3"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {n.highlightedTerms.map((term, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FILES */}
        {activeCourseTab === 'files' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Documents & Lecture Slides for {course.code} ({courseFiles.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  All materials linked to this course are vectorized for AI notes, quizzes, and tutoring.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isUploadingCourseFile ? 'Extracting...' : `Upload to ${course.code}`}</span>
                  <input
                    type="file"
                    disabled={isUploadingCourseFile}
                    accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.csv"
                    onChange={handleCourseFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setActiveView('files')}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  File Library →
                </button>
              </div>
            </div>

            {courseFiles.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <FolderArchive className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No documents uploaded for {course.code} yet.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload lecture slides (.pptx, .pdf) to generate AI notes, quizzes, and flashcards specifically for this course.
                  </p>
                </div>
                <label className="inline-flex px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs items-center gap-1.5 cursor-pointer shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Lecture File Now</span>
                  <input
                    type="file"
                    disabled={isUploadingCourseFile}
                    accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.csv"
                    onChange={handleCourseFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {courseFiles.map(file => (
                  <div key={file.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <FolderArchive className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{file.name}</span>
                        <div className="text-[11px] text-slate-500">{file.pageCount} pages • {file.status.replace('_', ' ')} • {(file.sizeBytes / 1024).toFixed(0)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveView('files')}
                      className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Ask Document
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: QUIZZES */}
        {activeCourseTab === 'quizzes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Diagnostic Practice Tests</h3>
              <button
                onClick={() => createQuizFromCourse(course.id, 'medium')}
                className="px-3 py-1.5 text-xs font-medium rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate New Quiz</span>
              </button>
            </div>
            <div className="space-y-3">
              {courseQuizzes.map(quiz => (
                <div key={quiz.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{quiz.title}</h4>
                    <span className="text-[11px] text-slate-500 capitalize">{quiz.difficulty} difficulty • {quiz.questions.length} questions</span>
                  </div>
                  <button
                    onClick={() => setActiveView('quizzes')}
                    className="px-3 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800"
                  >
                    Take Quiz
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PROJECTS */}
        {activeCourseTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Course GitHub Repositories</h3>
              <button
                onClick={() => setActiveView('integrations')}
                className="text-xs text-blue-600 hover:underline"
              >
                Manage GitHub Integrations →
              </button>
            </div>
            {courseRepos.map(repo => (
              <div key={repo.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{repo.owner}/{repo.repo}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{repo.branch}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recent Commits</span>
                  {repo.commits.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-blue-600 mr-2">{c.shortHash}</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{c.message}</span>
                        {c.aiSummary && (
                          <div className="text-[11px] text-slate-500 mt-1 italic">
                            AI Brief: {c.aiSummary}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{new Date(c.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 7: STUDY AGENT */}
        {activeCourseTab === 'agent' && (
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {course.code} Dedicated Study Agent
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Trained strictly on {course.name} syllabus, indexed lecture slides, and notes.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
              <button
                onClick={() => handleAgentSend('Prepare me for the next lecture')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 shrink-0 font-medium"
              >
                Prepare for next lecture
              </button>
              <button
                onClick={() => handleAgentSend('Quiz me on recent notes')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 shrink-0 font-medium"
              >
                Quiz me on notes
              </button>
              <button
                onClick={() => handleAgentSend('Plan exam revision for midterm')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 shrink-0 font-medium"
              >
                Plan exam revision
              </button>
              <button
                onClick={() => handleAgentSend('Summarize course files')}
                className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 shrink-0 font-medium"
              >
                Summarize course files
              </button>
            </div>

            {/* Chat Messages */}
            <div className="max-h-80 overflow-y-auto space-y-3 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-800">
              {agentMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-lg text-xs max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}>
                    <p>{msg.text}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        Source: {msg.citations.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={e => { e.preventDefault(); handleAgentSend(); }} className="flex gap-2">
              <input
                type="text"
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                placeholder={`Ask ${course.code} study agent anything...`}
                className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Delete Course Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Delete Course
                </h3>
                <p className="text-xs text-slate-500">
                  {course.code} — {course.name}
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this course? This will remove the course and its schedule meetings from your workspace.
            </p>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
              <span className="font-semibold">Note on linked coursework:</span>
              <p>Your notes and flashcards will be preserved, but unlinked from this course.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCourse(course.id);
                  setActiveView('courses');
                }}
                className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Course</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Edit Course Details & Schedule ({course.code})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveCourseEdits} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={e => setEditCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Instructor / Professor</label>
                  <input
                    type="text"
                    value={editInstructor}
                    onChange={e => setEditInstructor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Credits</label>
                  <input
                    type="number"
                    value={editCredits}
                    onChange={e => setEditCredits(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Term</label>
                  <input
                    type="text"
                    value={editTerm}
                    onChange={e => setEditTerm(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Default Campus Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    placeholder="e.g. Turing Hall 101"
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Syllabus URL (Optional)</label>
                  <input
                    type="url"
                    value={editSyllabusUrl}
                    onChange={e => setEditSyllabusUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Course Color Pill Picker */}
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">Course Visual Identity Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {['#0284c7', '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#db2777', '#0891b2'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        editColor === c ? 'border-slate-900 dark:border-white scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Class Schedule Slots Builder */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Class Schedule Timetable</h4>
                    <p className="text-[11px] text-slate-500">Configure lectures, labs, and tutorials for this course.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditSlots(prev => [
                        ...prev,
                        {
                          id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                          day: 2,
                          type: 'lab',
                          startTime: '14:00',
                          endTime: '16:00',
                          location: editLocation || 'Lab Room'
                        }
                      ]);
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Meeting Slot</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editSlots.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-xs"
                    >
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Day</label>
                        <select
                          value={slot.day}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditSlots(prev => prev.map(s => s.id === slot.id ? { ...s, day: val } : s));
                          }}
                          className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Class Type</label>
                        <select
                          value={slot.type}
                          onChange={e => {
                            const val = e.target.value as ClassType;
                            setEditSlots(prev => prev.map(s => s.id === slot.id ? { ...s, type: val } : s));
                          }}
                          className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 capitalize"
                        >
                          <option value="lecture">Lecture</option>
                          <option value="lab">Lab</option>
                          <option value="tutorial">Tutorial</option>
                          <option value="seminar">Seminar</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Start / End</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={e => {
                              const val = e.target.value;
                              setEditSlots(prev => prev.map(s => s.id === slot.id ? { ...s, startTime: val } : s));
                            }}
                            className="w-1/2 p-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={e => {
                              const val = e.target.value;
                              setEditSlots(prev => prev.map(s => s.id === slot.id ? { ...s, endTime: val } : s));
                            }}
                            className="w-1/2 p-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Location</label>
                        <input
                          type="text"
                          value={slot.location}
                          onChange={e => {
                            const val = e.target.value;
                            setEditSlots(prev => prev.map(s => s.id === slot.id ? { ...s, location: val } : s));
                          }}
                          placeholder="Room / Hall"
                          className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="flex justify-end pt-3 sm:pt-0">
                        {editSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditSlots(prev => prev.filter(s => s.id !== slot.id))}
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                            title="Remove slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-semibold"
                >
                  Save Course Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
