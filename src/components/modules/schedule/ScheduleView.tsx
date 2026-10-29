import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Clock,
  Printer,
  ChevronRight,
  BookOpen,
  MapPin,
  Calendar,
  AlertCircle,
  Plus,
  Filter,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { ClassType, MeetingSlot } from '../../../types';

export const ScheduleView: React.FC = () => {
  const { courses, updateCourse, navigateToCourse, setIsAiDrawerOpen } = useApp();

  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [addClassModalOpen, setAddClassModalOpen] = useState(false);

  // Form State for Quick Add Class Slot
  const [targetCourseId, setTargetCourseId] = useState<string>(courses[0]?.id || '');
  const [slotDay, setSlotDay] = useState<number>(1); // Monday
  const [slotStart, setSlotStart] = useState<string>('10:00');
  const [slotEnd, setSlotEnd] = useState<string>('11:30');
  const [slotLocation, setSlotLocation] = useState<string>('Hall A');
  const [slotType, setSlotType] = useState<ClassType>('lecture');

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Days: rows (Monday to Sunday)
  const days = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 0, name: 'Sunday', short: 'Sun' }
  ];

  const currentDayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...

  // Hours: columns (08:00 to 21:00 / 9:00 PM)
  const startHour = 8;
  const endHour = 21;
  const totalMinutes = (endHour - startHour) * 60; // 780 minutes (13 hours)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  // Flatten all course meeting slots
  const filteredCourses = selectedCourseFilter === 'all'
    ? courses
    : courses.filter(c => c.id === selectedCourseFilter);

  const allMeetingSlots = filteredCourses.flatMap(c =>
    (c.meetingSlots || []).map(slot => ({
      ...slot,
      courseCode: c.code,
      courseName: c.name,
      courseColor: c.color,
      courseId: c.id,
      instructor: c.instructor
    }))
  );

  // Today's upcoming class calculation
  const todayClasses = allMeetingSlots
    .filter(s => s.day === currentDayIndex)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const upcomingClass = todayClasses.find(s => parseTimeToMinutes(s.endTime) > currentTimeMinutes) || todayClasses[0];

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=1150,height=850');
    if (!printWin) {
      window.print();
      return;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const activeDays = [1, 2, 3, 4, 5, 6, 0]; // Mon - Sun

    // Unique hourly column headers (08:00 to 21:00: 13 hourly intervals)
    const printHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const formatHourLabel = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:00 ${ampm}`;
    };

    // Calculate all slots sorted by day and time for the detailed timetable index
    const sortedMeetingSlots = [...allMeetingSlots].sort((a, b) => {
      if (a.day !== b.day) return ((a.day === 0 ? 7 : a.day) - (b.day === 0 ? 7 : b.day));
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    const printableHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Academic Timetable — Weekly Schedule</title>
  <style>
    @page { size: landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .title { font-size: 22px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 3px; }
    .meta { font-size: 11px; color: #64748b; text-align: right; }
    .meta strong { color: #0f172a; }

    /* Visual Timetable Grid with Proportional Timeline */
    .timetable-container {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .timetable-header {
      display: flex;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }
    .day-corner-cell {
      width: 110px;
      padding: 8px 10px;
      border-right: 1px solid #cbd5e1;
      shrink: 0;
    }
    .time-headers-row {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(13, minmax(0, 1fr));
      text-align: center;
    }
    .time-header-cell {
      padding: 8px 4px;
      border-right: 1px solid #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
    }
    .time-header-cell:last-child {
      border-right: none;
    }

    .day-row {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
      min-height: 64px;
    }
    .day-row:last-child {
      border-bottom: none;
    }
    .day-label-cell {
      width: 110px;
      padding: 8px 10px;
      border-right: 1px solid #cbd5e1;
      background: #f8fafc;
      font-weight: 700;
      font-size: 11.5px;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .day-count {
      font-size: 9.5px;
      color: #64748b;
      font-weight: normal;
      margin-top: 2px;
    }
    .day-canvas {
      flex: 1;
      position: relative;
      min-height: 64px;
      background: #ffffff;
    }
    .grid-lines-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(13, minmax(0, 1fr));
      pointer-events: none;
    }
    .grid-col-line {
      border-right: 1px dashed #f1f5f9;
      height: 100%;
    }
    .grid-col-line:last-child {
      border-right: none;
    }

    .slot-block {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 10px;
      line-height: 1.25;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      border: 1px solid rgba(0,0,0,0.08);
      z-index: 10;
    }
    .slot-time-badge {
      font-weight: 700;
      font-size: 9.5px;
      white-space: nowrap;
    }
    .slot-title-text {
      font-weight: 700;
      font-size: 10.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .slot-location-text {
      font-size: 9px;
      color: #475569;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .type-tag {
      display: inline-block;
      text-transform: uppercase;
      font-size: 8px;
      font-weight: 800;
      padding: 1px 3px;
      border-radius: 2px;
      background: rgba(0,0,0,0.08);
      margin-left: 4px;
    }

    /* Detailed Table */
    .section-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; color: #0f172a; }
    table.schedule-details {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 14px;
    }
    table.schedule-details th, table.schedule-details td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }
    table.schedule-details th { background: #f1f5f9; font-weight: 700; color: #334155; }

    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Academic Weekly Class Schedule</h1>
      <div class="subtitle">Official Timetable with Proportional Hour & Half-Hour Alignments</div>
    </div>
    <div class="meta">
      <div>Term: <strong>Current Academic Term</strong></div>
      <div>Printed: <strong>${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
    </div>
  </div>

  <!-- Visual Timetable Matrix -->
  <div class="timetable-container">
    <div class="timetable-header">
      <div class="day-corner-cell">Day / Time</div>
      <div class="time-headers-row">
        ${printHours.map(h => `<div class="time-header-cell">${formatHourLabel(h)}</div>`).join('')}
      </div>
    </div>

    ${activeDays.map(dayIdx => {
      const daySlots = allMeetingSlots.filter(s => s.day === dayIdx);
      return `
        <div class="day-row">
          <div class="day-label-cell">
            <span>${dayNames[dayIdx]}</span>
            <span class="day-count">${daySlots.length} ${daySlots.length === 1 ? 'class' : 'classes'}</span>
          </div>
          <div class="day-canvas">
            <div class="grid-lines-overlay">
              ${Array.from({ length: 13 }).map(() => '<div class="grid-col-line"></div>').join('')}
            </div>

            ${daySlots.map(slot => {
              const startMins = parseTimeToMinutes(slot.startTime);
              const endMins = parseTimeToMinutes(slot.endTime);
              const durationMins = Math.max(endMins - startMins, 30);

              // 08:00 is 480 mins. 21:00 is 1260 mins. Total window = 780 mins.
              const leftPct = Math.max(0, ((startMins - 480) / 780) * 100);
              const widthPct = Math.min(100 - leftPct, Math.max(3.5, (durationMins / 780) * 100));

              return `
                <div
                  class="slot-block"
                  style="
                    left: ${leftPct}%;
                    width: ${widthPct}%;
                    background-color: ${slot.courseColor || '#2563eb'}18;
                    border-left: 4px solid ${slot.courseColor || '#2563eb'};
                  "
                >
                  <div class="slot-time-badge" style="color: ${slot.courseColor || '#1e40af'};">
                    ${slot.startTime} – ${slot.endTime}
                    <span class="type-tag">${slot.type}</span>
                  </div>
                  <div class="slot-title-text">${slot.courseCode}: ${slot.courseName}</div>
                  <div class="slot-location-text">📍 ${slot.location || 'Lecture Hall'}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <!-- Detailed Class Meetings Index (Handles Halves, Locations, Instructors Explicitly) -->
  <div>
    <div class="section-title">Complete Class Meetings & Locations Breakdown</div>
    <table class="schedule-details">
      <thead>
        <tr>
          <th>Day</th>
          <th>Class Time Window</th>
          <th>Course Code</th>
          <th>Course Name</th>
          <th>Class Type</th>
          <th>Room / Location</th>
          <th>Faculty Instructor</th>
        </tr>
      </thead>
      <tbody>
        ${sortedMeetingSlots.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#94a3b8;font-style:italic;padding:10px;">No scheduled class meetings found.</td></tr>' : sortedMeetingSlots.map(slot => `
          <tr>
            <td><strong>${dayNames[slot.day]}</strong></td>
            <td style="font-family: monospace; font-weight: 700;">${slot.startTime} – ${slot.endTime}</td>
            <td><strong style="color: ${slot.courseColor || '#0f172a'};">${slot.courseCode}</strong></td>
            <td>${slot.courseName}</td>
            <td style="text-transform: capitalize;">${slot.type}</td>
            <td>📍 ${slot.location || 'Campus'}</td>
            <td>${slot.instructor || 'Staff'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(printableHtml);
    printWin.document.close();
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourseId) return;

    const course = courses.find(c => c.id === targetCourseId);
    if (!course) return;

    const newSlot: MeetingSlot = {
      id: `slot_${Date.now()}`,
      day: Number(slotDay),
      startTime: slotStart,
      endTime: slotEnd,
      location: slotLocation || course.location || 'Lecture Hall',
      type: slotType
    };

    updateCourse(course.id, {
      meetingSlots: [...(course.meetingSlots || []), newSlot]
    });

    setAddClassModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Weekly Class Timetable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Days are arranged in horizontal rows across time interval columns (08:00 – 21:00 / 9:00 PM).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCourseFilter}
              onChange={e => setSelectedCourseFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Courses ({courses.length})</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (courses.length > 0) {
                setTargetCourseId(courses[0].id);
                setAddClassModalOpen(true);
              } else {
                setIsAiDrawerOpen(true);
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class Slot</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Timetable</span>
          </button>
        </div>
      </div>

      {/* Upcoming Class Banner */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {upcomingClass ? 'Next Scheduled Class' : 'Schedule Status'}
            </div>
            {upcomingClass ? (
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{upcomingClass.courseCode}: {upcomingClass.courseName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {upcomingClass.type}
                </span>
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {courses.length === 0 ? 'No courses added to workspace yet' : 'No classes scheduled for today'}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              {upcomingClass ? (
                <>
                  <span className="font-mono">{upcomingClass.startTime} – {upcomingClass.endTime}</span>
                  <span>•</span>
                  <span>{upcomingClass.location}</span>
                  <span>•</span>
                  <span>{upcomingClass.instructor}</span>
                </>
              ) : (
                <span>Use "+ Add Class Slot" or click Ask AI (Ctrl+J) to auto-generate your timetable.</span>
              )}
            </div>
          </div>
        </div>

        {upcomingClass ? (
          <button
            onClick={() => navigateToCourse(upcomingClass.courseId)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 shrink-0 self-start sm:self-center"
          >
            <span>Open Course</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI to Setup Schedule</span>
          </button>
        )}
      </div>

      {/* Inverted Timetable Matrix: Days = Rows, Time = Columns */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1020px]">
            {/* Header: Time Columns */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {/* Corner Cell: Day Label */}
              <div className="w-32 sm:w-36 shrink-0 p-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Day / Time</span>
              </div>

              {/* Time Column Headers (08:00 - 21:00: exactly 13 hourly intervals) */}
              <div
                className="flex-1 grid"
                style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
              >
                {hours.slice(0, 13).map(hour => (
                  <div
                    key={hour}
                    className="p-2.5 text-center border-r border-slate-100 dark:border-slate-800/80 last:border-r-0 font-mono text-[11px]"
                  >
                    {hour < 10 ? `0${hour}` : hour}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Days Rows */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {days.map(day => {
                const isToday = day.id === currentDayIndex;
                const daySlots = allMeetingSlots.filter(s => s.day === day.id);

                return (
                  <div
                    key={day.id}
                    className={`flex min-h-[96px] transition-colors ${
                      isToday
                        ? 'bg-blue-50/20 dark:bg-blue-950/15'
                        : 'hover:bg-slate-50/40 dark:hover:bg-slate-950/20'
                    }`}
                  >
                    {/* Day Column (Row Header, exactly matching header width) */}
                    <div
                      className={`w-32 sm:w-36 shrink-0 p-3.5 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-center gap-1 select-none ${
                        isToday ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'bg-slate-50/40 dark:bg-slate-950/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'}`}>
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-600 text-white uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {daySlots.length} {daySlots.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>

                    {/* Timeline Canvas Span (flex-1 matching the 12 columns above) */}
                    <div className="flex-1 relative min-h-[96px] p-2">
                      {/* Vertical Hour Grid Lines (13 columns) */}
                      <div
                        className="absolute inset-0 grid pointer-events-none"
                        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
                      >
                        {Array.from({ length: 13 }).map((_, i) => (
                          <div
                            key={i}
                            className="border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 h-full"
                          />
                        ))}
                      </div>

                      {/* Live Current Time Line (if today and within 08:00 - 21:00) */}
                      {isToday && currentTimeMinutes >= startHour * 60 && currentTimeMinutes <= endHour * 60 && (
                        <div
                          className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                          style={{
                            left: `${((currentTimeMinutes - startHour * 60) / totalMinutes) * 100}%`
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900 -mt-1 shadow-sm" />
                          <div className="w-[2px] bg-rose-600 h-full opacity-80" />
                        </div>
                      )}

                      {/* Placed Class Blocks along the horizontal timeline */}
                      {daySlots.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 italic select-none">
                          No classes scheduled for {day.name}
                        </div>
                      ) : (
                        daySlots.map(slot => {
                          const startMins = parseTimeToMinutes(slot.startTime);
                          const endMins = parseTimeToMinutes(slot.endTime);
                          const durationMins = Math.max(endMins - startMins, 30);

                          // Position calculation based on 08:00 -> 21:00 (780 minutes span)
                          const leftPercent = Math.max(0, Math.min(100, ((startMins - startHour * 60) / totalMinutes) * 100));
                          const widthPercent = Math.max(4.5, Math.min(100 - leftPercent, (durationMins / totalMinutes) * 100));

                          const getTypeBadgeColor = (type: ClassType) => {
                            switch (type) {
                              case 'lab':
                                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                              case 'tutorial':
                                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                              case 'seminar':
                                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800';
                              default:
                                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800';
                            }
                          };

                          return (
                            <div
                              key={slot.id}
                              onClick={() => navigateToCourse(slot.courseId)}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                                backgroundColor: `${slot.courseColor}18`,
                                borderColor: `${slot.courseColor}60`
                              }}
                              className="absolute top-2 bottom-2 p-2 rounded-lg border shadow-xs cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden group z-10"
                            >
                              <div className="flex items-center justify-between gap-1 overflow-hidden">
                                <span
                                  className="font-bold text-[11px] truncate tracking-tight"
                                  style={{ color: slot.courseColor }}
                                >
                                  {slot.courseCode}
                                </span>
                                <span className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded border font-semibold shrink-0 ${getTypeBadgeColor(slot.type)}`}>
                                  {slot.type}
                                </span>
                              </div>

                              <div className="text-[10px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {slot.courseName}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                                <span>{slot.startTime}–{slot.endTime}</span>
                                <span className="truncate flex items-center gap-0.5 ml-1 font-sans">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                  <span className="truncate">{slot.location}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Class Slot Modal */}
      {addClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Add Class Slot to Timetable
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-3">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Target Course</label>
                <select
                  value={targetCourseId}
                  onChange={e => setTargetCourseId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Day of Week</label>
                  <select
                    value={slotDay}
                    onChange={e => setSlotDay(Number(e.target.value))}
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    {days.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">Class Type</label>
                  <select
                    value={slotType}
                    onChange={e => setSlotType(e.target.value as ClassType)}
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none capitalize"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab / Practical</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={slotStart}
                    onChange={e => setSlotStart(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={slotEnd}
                    onChange={e => setSlotEnd(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Location / Lecture Room</label>
                <input
                  type="text"
                  value={slotLocation}
                  onChange={e => setSlotLocation(e.target.value)}
                  placeholder="e.g. Turing Hall 101 or Lab 4B"
                  className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddClassModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800"
                >
                  Save Class Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
