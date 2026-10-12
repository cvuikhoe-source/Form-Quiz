import { useState, useEffect, useCallback } from 'react';
import type { Exam, User, CompletionRecord, ExamResult, Lesson, ViewMode } from '@/types';
import {
  loadExams, createExam, batchCreateExams, updateExam, deleteExam,
  loadUsers, createUser, updateUser, deleteUser,
  loadSession, saveSession,
  loadCompletions, saveCompletions,
  loadResults,
  loadLessons, upsertLessons, deleteLesson,
  generateId, isExamCompletedByUser,
  onDataChange, subscribeToExams, subscribeToResults,
} from '@/storage';
import { BottomNav } from '@/components/BottomNav';
import { LoginScreen } from '@/components/LoginScreen';
import { StudentView } from '@/components/StudentView';
import { AdminView } from '@/components/AdminView';
import { UserManagementView } from '@/components/UserManagementView';
import { StatsView } from '@/components/StatsView';
import { HistoryView } from '@/components/HistoryView';
import { ProfileView } from '@/components/ProfileView';
import { TakeExamView } from '@/components/TakeExamView';
import { LessonListView } from '@/components/LessonListView';
import { LessonDetailView } from '@/components/LessonDetailView';
import { LessonImportModal } from '@/components/LessonImportModal';
import { ToastContainer, toast } from '@/components/Toast';
import { GraduationCap } from 'lucide-react';

const LS_LESSON_DONE = 'quizforms_lesson_done';

function loadLessonDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_LESSON_DONE) ?? '[]')); } catch { return new Set(); }
}
function saveLessonDone(ids: Set<string>) {
  localStorage.setItem(LS_LESSON_DONE, JSON.stringify(Array.from(ids)));
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonDone, setLessonDone] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [showLessonImport, setShowLessonImport] = useState(false);
  const [view, setView] = useState<ViewMode>('exams');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [prevExamCount, setPrevExamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [e, u, c, r, l] = await Promise.all([
        loadExams(), loadUsers(), loadCompletions(), loadResults(), loadLessons(),
      ]);
      setExams(e);
      setUsers(u);
      setCompletions(c);
      setResults(r);
      setLessons(l);
      setLessonDone(loadLessonDone());
      setCurrentUser(loadSession());
      setLoading(false);
    })();
  }, []);

  useEffect(() => { setPrevExamCount(exams.length); }, [exams.length]);

  useEffect(() => {
    if (!currentUser) return;
    const reloadExams = async () => {
      const latest = await loadExams();
      if (currentUser.role === 'student' && latest.length > prevExamCount) {
        toast('Có bài thi mới vừa được cập nhật!', 'success');
      }
      setExams(latest);
    };
    const reloadResults = async () => { setResults(await loadResults()); };
    const unsubExams = subscribeToExams(reloadExams);
    const unsubResults = subscribeToResults(reloadResults);
    const unsubLocal = onDataChange((type) => {
      if (type === 'exams') reloadExams();
      if (type === 'results') reloadResults();
    });
    return () => { unsubExams(); unsubResults(); unsubLocal(); };
  }, [currentUser, prevExamCount]);

  // ─── Auth ──────────────────────────────────────────────────
  const handleLogin = useCallback((user: User) => { setCurrentUser(user); setView('exams'); }, []);
  const handleLogout = useCallback(() => {
    saveSession(null); setCurrentUser(null); setActiveExam(null); setActiveLesson(null); setView('exams');
  }, []);

  // ─── Exams CRUD ────────────────────────────────────────────
  const handleCreateExam = useCallback(async (data: Omit<Exam, 'id' | 'createdAt'>) => {
    const exam = await createExam(data); setExams((prev) => [exam, ...prev]);
  }, []);
  const handleBatchCreate = useCallback(async (items: Omit<Exam, 'id' | 'createdAt'>[]) => {
    const newExams = await batchCreateExams(items); setExams((prev) => [...newExams, ...prev]);
  }, []);
  const handleUpdateExam = useCallback(async (id: string, updates: Partial<Exam>) => {
    await updateExam(id, updates); setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);
  const handleDeleteExam = useCallback(async (id: string) => {
    await deleteExam(id);
    setExams((prev) => prev.filter((e) => e.id !== id));
    const next = completions.filter((c) => c.examId !== id);
    setCompletions(next); await saveCompletions(next);
  }, [completions]);

  // ─── Users CRUD ────────────────────────────────────────────
  const handleCreateUser = useCallback(async (data: Omit<User, 'id'>) => {
    const user = await createUser(data); setUsers((prev) => [...prev, user]);
  }, []);
  const handleUpdateUser = useCallback(async (id: string, updates: Partial<User>) => {
    await updateUser(id, updates);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser?.id === id) { const updated = { ...currentUser, ...updates }; setCurrentUser(updated); saveSession(updated); }
  }, [currentUser]);
  const handleDeleteUser = useCallback(async (id: string) => {
    await deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    const next = completions.filter((c) => c.userId !== id);
    setCompletions(next); await saveCompletions(next);
  }, [completions]);

  // ─── Completions ───────────────────────────────────────────
  const handleMarkCompleted = useCallback(async (examId: string) => {
    if (!currentUser || isExamCompletedByUser(examId, currentUser.id, completions)) return;
    const record: CompletionRecord = { id: generateId('comp'), examId, userId: currentUser.id, completedAt: new Date().toISOString() };
    const next = [...completions, record]; setCompletions(next); await saveCompletions(next);
  }, [completions, currentUser]);

  // ─── Results ───────────────────────────────────────────────
  const handleResultsChanged = useCallback(async () => { setResults(await loadResults()); }, []);

  // ─── Lessons ───────────────────────────────────────────────
  const handleImportLessons = useCallback(async (imported: Lesson[]) => {
    await upsertLessons(imported);
    const latest = await loadLessons();
    setLessons(latest);
    toast(`Đã nhập ${imported.length} bài học`, 'success');
  }, []);

  const handleMarkLessonDone = useCallback((id: string) => {
    setLessonDone((prev) => {
      const next = new Set(prev); next.add(id); saveLessonDone(next); return next;
    });
    toast('Đã đánh dấu hoàn thành bài học!', 'success');
  }, []);

  // ─── Take exam ─────────────────────────────────────────────
  const handleStartExam = useCallback((exam: Exam) => { setActiveExam(exam); }, []);
  const handleCloseExam = useCallback(() => { setActiveExam(null); }, []);

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
          <GraduationCap size={28} className="text-white animate-pulse" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (<><LoginScreen onLogin={handleLogin} /><ToastContainer /></>);
  }

  if (activeExam) {
    const currentExam = exams.find((e) => e.id === activeExam.id) ?? activeExam;
    return (
      <><TakeExamView exam={currentExam} completed={isExamCompletedByUser(currentExam.id, currentUser.id, completions)}
        onClose={handleCloseExam} onComplete={handleMarkCompleted} /><ToastContainer /></>
    );
  }

  const role = currentUser.role;
  const canManageExams = role === 'admin' || role === 'teacher';

  const titles: Record<string, string> = {
    exams: canManageExams ? 'Quản lý bài thi' : 'Đề thi của tôi',
    users: 'Quản lý tài khoản',
    students: 'Học sinh',
    stats: 'Thống kê',
    history: 'Lịch sử làm bài',
    lessons: 'Bài học Ngữ pháp',
    profile: role === 'student' ? 'Hồ sơ cá nhân' : 'Tài khoản',
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-20 glass border-b border-slate-200/80 safe-top">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">{titles[view] || 'QuizForms'}</h1>
            <p className="text-xs text-slate-400">{currentUser.fullName}</p>
          </div>
        </div>
      </header>

      <main>
        {/* Lesson detail overlay (shared across roles) */}
        {view === 'lessons' && activeLesson ? (
          <LessonDetailView
            lesson={activeLesson}
            completed={lessonDone.has(activeLesson.id)}
            onBack={() => setActiveLesson(null)}
            onMarkDone={handleMarkLessonDone}
          />
        ) : view === 'lessons' ? (
          <LessonListView
            lessons={lessons}
            completedIds={lessonDone}
            canManage={canManageExams}
            onOpen={setActiveLesson}
            onImport={() => setShowLessonImport(true)}
          />
        ) : canManageExams ? (
          <>
            {view === 'exams' && <AdminView exams={exams} onCreate={handleCreateExam} onBatchCreate={handleBatchCreate} onUpdate={handleUpdateExam} onDelete={handleDeleteExam} />}
            {(view === 'users' || view === 'students') && <UserManagementView users={users} currentUser={currentUser} onCreate={handleCreateUser} onUpdate={handleUpdateUser} onDelete={handleDeleteUser} />}
            {view === 'stats' && <StatsView exams={exams} users={users} completions={completions} results={results} onResultsChanged={handleResultsChanged} />}
            {view === 'profile' && <ProfileView user={currentUser} onLogout={handleLogout} />}
          </>
        ) : (
          <>
            {view === 'exams' && <StudentView exams={exams} user={currentUser} completions={completions} results={results} onStart={handleStartExam} onMarkCompleted={handleMarkCompleted} />}
            {view === 'history' && <HistoryView exams={exams} user={currentUser} completions={completions} results={results} />}
            {view === 'profile' && <ProfileView user={currentUser} onLogout={handleLogout} />}
          </>
        )}
      </main>

      <BottomNav role={currentUser.role} current={view} onChange={(v) => { setActiveLesson(null); setView(v); }} />
      <ToastContainer />

      {showLessonImport && (
        <LessonImportModal
          onClose={() => setShowLessonImport(false)}
          onImport={handleImportLessons}
        />
      )}
    </div>
  );
}

export default App;
