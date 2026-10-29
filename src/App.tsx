import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { MobileNav } from './components/layout/MobileNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { QuickCreateModal } from './components/layout/QuickCreateModal';
import { GlobalAiDrawer } from './components/modules/ai/GlobalAiDrawer';
import { AuthModal } from './components/modules/auth/AuthModal';

// Views
import { TodayDashboard } from './components/modules/today/TodayDashboard';
import { CoursesView } from './components/modules/courses/CoursesView';
import { CourseDetailView } from './components/modules/courses/CourseDetailView';
import { AssignmentsView } from './components/modules/assignments/AssignmentsView';
import { TasksView } from './components/modules/tasks/TasksView';
import { NotesView } from './components/modules/notes/NotesView';
import { ScheduleView } from './components/modules/schedule/ScheduleView';
import { CalendarView } from './components/modules/calendar/CalendarView';
import { InboxView } from './components/modules/inbox/InboxView';
import { FilesView } from './components/modules/files/FilesView';
import { StudyHubView } from './components/modules/studyhub/StudyHubView';
import { QuizzesView } from './components/modules/quizzes/QuizzesView';
import { ExamsView } from './components/modules/exams/ExamsView';
import { GradesView } from './components/modules/grades/GradesView';
import { AiTutorView } from './components/modules/ai/AiTutorView';
import { IntegrationsView } from './components/modules/integrations/IntegrationsView';
import { RemindersView } from './components/modules/reminders/RemindersView';
import { BackupsView } from './components/modules/backups/BackupsView';
import { TrashView } from './components/modules/trash/TrashView';
import { SettingsView } from './components/modules/settings/SettingsView';

const WorkspaceContent: React.FC = () => {
  const { user, activeView } = useApp();

  // If not logged in, show dedicated full-screen Register / Sign-in page
  if (!user) {
    return <AuthModal />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'today':
        return <TodayDashboard />;
      case 'courses':
        return <CoursesView />;
      case 'course-detail':
        return <CourseDetailView />;
      case 'assignments':
        return <AssignmentsView />;
      case 'tasks':
        return <TasksView />;
      case 'notes':
        return <NotesView />;
      case 'schedule':
        return <ScheduleView />;
      case 'calendar':
        return <CalendarView />;
      case 'inbox':
        return <InboxView />;
      case 'files':
        return <FilesView />;
      case 'studyhub':
        return <StudyHubView />;
      case 'ai-tutor':
        return <AiTutorView />;
      case 'quizzes':
        return <QuizzesView />;
      case 'exams':
        return <ExamsView />;
      case 'grades':
        return <GradesView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'reminders':
        return <RemindersView />;
      case 'backups':
        return <BackupsView />;
      case 'trash':
        return <TrashView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayDashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-6">
          {renderActiveView()}
        </main>
      </div>

      <MobileNav />
      <CommandPalette />
      <QuickCreateModal />
      <GlobalAiDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <WorkspaceContent />
    </AppProvider>
  );
}
