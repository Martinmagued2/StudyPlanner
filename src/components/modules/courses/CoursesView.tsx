import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  BookOpen,
  Plus,
  Archive,
  DownloadCloud,
  ExternalLink,
  MapPin,
  Clock,
  User,
  CheckCircle,
  FileCheck2,
  FileText,
  Search,
  Trash2,
  Calendar,
  Pencil,
  X
} from 'lucide-react';
import { Course, MeetingSlot, ClassType } from '../../../types';

export const CoursesView: React.FC = () => {
  const { courses, addCourse, updateCourse, archiveCourse, deleteCourse, navigateToCourse, assignments, notes } = useApp();
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isMoodleModalOpen, setIsMoodleModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // New Course Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [location, setLocation] = useState('');
  const [credits, setCredits] = useState(3);
  const [term, setTerm] = useState('Fall 2026');
  const [syllabusUrl, setSyllabusUrl] = useState('');

  // Dynamic Class Schedule Slots Builder
  interface FormMeetingSlot {
    id: string;
    day: number;
    type: ClassType;
    startTime: string;
    endTime: string;
    location: string;
  }

  const [formSlots, setFormSlots] = useState<FormMeetingSlot[]>([
    { id: '1', day: 1, type: 'lecture', startTime: '10:00', endTime: '11:30', location: 'Lecture Hall A' },
    { id: '2', day: 3, type: 'lab', startTime: '14:00', endTime: '16:00', location: 'Computer Lab 3B' }
  ]);

  const addFormSlot = () => {
    setFormSlots(prev => [
      ...prev,
      {
        id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        day: 2,
        type: 'tutorial',
        startTime: '12:00',
        endTime: '13:00',
        location: 'Room 204'
      }
    ]);
  };

  const removeFormSlot = (id: string) => {
    setFormSlots(prev => prev.filter(s => s.id !== id));
  };

  const updateFormSlot = (id: string, field: keyof FormMeetingSlot, value: any) => {
    setFormSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const filteredCourses = courses.filter(c => {
    if (!showArchived && c.isArchived) return false;
    if (showArchived && !c.isArchived) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q);
  });

  const openAddCourse = () => {
    setEditingCourseId(null);
    setCode('');
    setName('');
    setInstructor('');
    setColor('#0284c7');
    setLocation('');
    setCredits(3);
    setTerm('Fall 2026');
    setSyllabusUrl('');
    setFormSlots([
      { id: '1', day: 1, type: 'lecture', startTime: '10:00', endTime: '11:30', location: 'Lecture Hall A' },
      { id: '2', day: 3, type: 'lab', startTime: '14:00', endTime: '16:00', location: 'Computer Lab 3B' }
    ]);
    setIsAddModalOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCode(course.code);
    setName(course.name);
    setInstructor(course.instructor);
    setColor(course.color);
    setLocation(course.location);
    setCredits(course.creditHours);
    setTerm(course.term);
    setSyllabusUrl(course.syllabusUrl || '');
    setFormSlots(
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
    setIsAddModalOpen(true);
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    const formattedSlots: MeetingSlot[] = formSlots.map((s, idx) => ({
      id: `ms_${Date.now()}_${idx}`,
      day: Number(s.day),
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type,
      location: s.location.trim() || location || 'Campus Classroom'
    }));

    if (editingCourseId) {
      updateCourse(editingCourseId, {
        name,
        code,
        instructor: instructor || 'Staff',
        color,
        location: location || formSlots[0]?.location || 'Campus Hall',
        creditHours: Number(credits) || 3,
        term: term || 'Fall 2026',
        syllabusUrl: syllabusUrl || undefined,
        meetingSlots: formattedSlots
      });
    } else {
      addCourse({
        name,
        code,
        instructor: instructor || 'Staff',
        color,
        location: location || formSlots[0]?.location || 'Campus Hall',
        creditHours: Number(credits) || 3,
        term: term || 'Fall 2026',
        syllabusUrl: syllabusUrl || undefined,
        links: [],
        isArchived: false,
        meetingSlots: formattedSlots
      });
    }

    setIsAddModalOpen(false);
    setEditingCourseId(null);
    setCode('');
    setName('');
    setInstructor('');
    setLocation('');
    setFormSlots([
      { id: '1', day: 1, type: 'lecture', startTime: '10:00', endTime: '11:30', location: 'Lecture Hall A' }
    ]);
  };

  const handleSimulateMoodleImport = () => {
    addCourse({
      name: 'Cloud Infrastructure & DevOps Engineering',
      code: 'CS 480',
      instructor: 'Dr. Rachel Patel',
      color: '#0891b2', // Cyan
      location: 'Engineering Tower 402',
      creditHours: 4,
      term: 'Fall 2026',
      syllabusUrl: 'https://moodle.uel.ac.uk/course/view.php?id=4802',
      links: [{ label: 'Moodle Portal', url: 'https://moodle.uel.ac.uk' }],
      isArchived: false,
      meetingSlots: [
        { id: `ms_moodle_1`, day: 2, startTime: '15:00', endTime: '17:00', type: 'lab', location: 'DevOps Lab 2' }
      ]
    });
    setIsMoodleModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Academic Courses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Central containers for coursework, lecture notes, indexed files, quizzes, repositories, and AI tutors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMoodleModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Import Moodle</span>
          </button>

          <button
            onClick={openAddCourse}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by code, title or professor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              !showArchived
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Active Courses ({courses.filter(c => !c.isArchived).length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              showArchived
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Archived ({courses.filter(c => c.isArchived).length})
          </button>
        </div>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredCourses.map(course => {
          const courseAssignments = assignments.filter(a => a.courseId === course.id);
          const courseNotes = notes.filter(n => n.courseId === course.id && !n.inTrash);
          const nextSlot = course.meetingSlots[0];

          return (
            <div
              key={course.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Course Header with Visual Identity Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {course.code}
                      </span>
                      <h3
                        onClick={() => navigateToCourse(course.id)}
                        className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer mt-1"
                      >
                        {course.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCourse(course);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit course details & schedule"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveCourse(course.id, !course.isArchived)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={course.isArchived ? 'Unarchive course' : 'Archive course'}
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourseToDelete(course);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{course.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {nextSlot ? `${nextSlot.startTime} (${nextSlot.type})` : 'Flexible'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{course.creditHours} Credits</span>
                    <span>• {course.term}</span>
                  </div>
                </div>

                {/* Counts / Stats */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{courseAssignments.length} Assignments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{courseNotes.length} Notes</span>
                  </div>
                  {course.syllabusUrl && (
                    <a
                      href={course.syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Syllabus</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Enter Course Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => navigateToCourse(course.id)}
                  className="w-full py-1.5 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Open Course Hub (7 Tabs) →
                </button>
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-full p-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Your Course Hub is Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Start fresh by creating your courses with their weekly lecture, lab, and tutorial schedules and room locations.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Course</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingCourseId ? 'Edit Course Details & Schedule' : 'Add New Academic Course'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateCourse} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Course Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS 302"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Data Structures & Algorithms"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Instructor / Professor</label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. Evelyn Vance"
                    value={instructor}
                    onChange={e => setInstructor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Credits</label>
                  <input
                    type="number"
                    value={credits}
                    onChange={e => setCredits(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                    placeholder="e.g. Fall 2026"
                    className="w-full px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Course Color Tag</label>
                <div className="flex items-center gap-2">
                  {['#0284c7', '#059669', '#475569', '#d97706', '#e11d48', '#0891b2', '#7c3aed'].map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Weekly Class Schedule & Specific Locations Builder */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Weekly Class Schedule & Locations</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add each lecture, lab, and tutorial with its own specific classroom/room and time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addFormSlot}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Meeting Slot</span>
                  </button>
                </div>

                {formSlots.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                    No class meetings added yet. Click "+ Add Meeting Slot" to add a lecture, lab, or tutorial.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formSlots.map((slot, index) => (
                      <div
                        key={slot.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                            Class Slot #{index + 1}
                          </span>
                          {formSlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFormSlot(slot.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Remove slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-slate-500 font-medium mb-1 text-[11px]">Class Type</label>
                            <select
                              value={slot.type}
                              onChange={e => updateFormSlot(slot.id, 'type', e.target.value as ClassType)}
                              className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 capitalize focus:outline-none"
                            >
                              <option value="lecture">Lecture</option>
                              <option value="lab">Lab / Practical</option>
                              <option value="tutorial">Tutorial</option>
                              <option value="seminar">Seminar</option>
                              <option value="workshop">Workshop</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-500 font-medium mb-1 text-[11px]">Day of Week</label>
                            <select
                              value={slot.day}
                              onChange={e => updateFormSlot(slot.id, 'day', Number(e.target.value))}
                              className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
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
                            <label className="block text-slate-500 font-medium mb-1 text-[11px]">Start Time</label>
                            <input
                              type="time"
                              required
                              value={slot.startTime}
                              onChange={e => updateFormSlot(slot.id, 'startTime', e.target.value)}
                              className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-500 font-medium mb-1 text-[11px]">End Time</label>
                            <input
                              type="time"
                              required
                              value={slot.endTime}
                              onChange={e => updateFormSlot(slot.id, 'endTime', e.target.value)}
                              className="w-full p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-500 font-medium mb-1 text-[11px]">
                            Specific Location / Classroom Room (e.g. for Lecture or Lab)
                          </label>
                          <div className="relative">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              placeholder={
                                slot.type === 'lab'
                                  ? 'e.g. Computing Lab 3B or Hardware Suite'
                                  : slot.type === 'lecture'
                                  ? 'e.g. Turing Lecture Hall 101'
                                  : 'e.g. Tutorial Room 204'
                              }
                              value={slot.location}
                              onChange={e => updateFormSlot(slot.id, 'location', e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white font-semibold"
                >
                  {editingCourseId ? 'Save Course Changes' : 'Create Course with Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Moodle Import Modal */}
      {isMoodleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Moodle LMS Course Synchronization
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Synchronize enrolled courses, hidden course exclusions, and coursework deadlines directly from your university Moodle account.
            </p>
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Reconciliation Safety Guarantee:</div>
              <p className="text-[11px] text-slate-500">
                Previously imported courses that disappear from Moodle will NOT be deleted if they contain user-created notes, flashcards, or custom tasks.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsMoodleModalOpen(false)}
                className="px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulateMoodleImport}
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Import Enrolled Courses</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
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
                  {courseToDelete.code} — {courseToDelete.name}
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
                onClick={() => setCourseToDelete(null)}
                className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCourse(courseToDelete.id);
                  setCourseToDelete(null);
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
    </div>
  );
};
