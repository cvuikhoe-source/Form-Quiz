import type { Exam, User, CompletionRecord, ExamResult, Lesson } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── LocalStorage keys (fallback) ──────────────────────────────

const LS_EXAMS = 'quizforms_exams';
const LS_USERS = 'quizforms_users';
const LS_SESSION = 'quizforms_session';
const LS_COMPLETIONS = 'quizforms_completions';
const LS_SUBJECTS = 'quizforms_subjects';
const LS_CLASSES = 'quizforms_classes';
const LS_RESULTS = 'quizforms_exam_results';

// ─── Subject metadata (color mapping) ──────────────────────────

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Toán': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Lý':   { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  'Hóa':  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  'Văn':  { bg: 'bg-rose-100', text: 'text-rose-700' },
  'Anh':  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'Sử':   { bg: 'bg-amber-100', text: 'text-amber-700' },
  'Địa':  { bg: 'bg-teal-100', text: 'text-teal-700' },
  'Sinh': { bg: 'bg-lime-100', text: 'text-lime-700' },
  'Tin':  { bg: 'bg-violet-100', text: 'text-violet-700' },
};

const FALLBACK_COLORS = [
  { bg: 'bg-slate-100', text: 'text-slate-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
];

export function getSubjectMeta(subject: string) {
  const meta = SUBJECT_COLORS[subject];
  if (meta) return meta;
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = ((hash << 5) - hash) + subject.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

// ─── Default subjects (classes start empty) ────────────────────

const DEFAULT_SUBJECTS = ['Toán', 'Lý', 'Hóa', 'Văn', 'Anh', 'Sử', 'Địa', 'Sinh', 'Tin'];

// ─── Seed data ─────────────────────────────────────────────────

const now = new Date();
const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

const SEED_USERS: User[] = [
  { id: 'user-admin', username: 'admin', password: 'admin123', fullName: 'Quản Trị Viên', role: 'admin', assignedClasses: [], allowedSubjects: [] },
  { id: 'user-teacher', username: 'teacher', password: 'teacher123', fullName: 'Thầy Nguyễn Văn Khoa', role: 'teacher', assignedClasses: [], allowedSubjects: [] },
  { id: 'user-hs-10a1', username: 'hs_10a1', password: '123456', fullName: 'Nguyễn Văn An', role: 'student', assignedClasses: [], allowedSubjects: [] },
];

const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-001',
    title: 'Kiểm tra Toán 15 phút - Đạo hàm',
    subject: 'Toán',
    grade: '12',
    durationMinutes: 15,
    deadline: inDays(3),
    status: 'open',
    formsUrl: 'https://forms.office.com/Pages/ResponsePage.aspx?id=test123',
    targetClasses: [],
    createdAt: inDays(-7),
  },
  {
    id: 'exam-002',
    title: 'Kiểm tra 15 phút English Vocabulary',
    subject: 'Anh',
    grade: '10',
    durationMinutes: 15,
    deadline: inDays(1),
    status: 'open',
    formsUrl: 'https://forms.office.com/Pages/ResponsePage.aspx?id=test456',
    targetClasses: [],
    createdAt: inDays(-5),
  },
];

const SEED_COMPLETIONS: CompletionRecord[] = [];

// ─── Real-time event bus (for LocalStorage mode) ───────────────

export const DATA_CHANGE_EVENT = 'quizforms-data-change';

function dispatchDataChange(type: string) {
  window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT, { detail: { type } }));
}

export function onDataChange(callback: (type: string) => void) {
  const handler = (e: Event) => {
    const ce = e as CustomEvent;
    callback(ce.detail?.type ?? 'unknown');
  };
  window.addEventListener(DATA_CHANGE_EVENT, handler);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === LS_EXAMS) callback('exams');
    if (e.key === LS_RESULTS) callback('results');
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(DATA_CHANGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ─── Supabase realtime subscriptions ───────────────────────────

export function subscribeToExams(callback: () => void) {
  if (!supabase) return () => {};
  const sb = supabase;
  const channel = sb
    .channel('exams-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, callback)
    .subscribe();
  return () => { sb.removeChannel(channel); };
}

export function subscribeToResults(callback: () => void) {
  if (!supabase) return () => {};
  const sb = supabase;
  const channel = sb
    .channel('results-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, callback)
    .subscribe();
  return () => { sb.removeChannel(channel); };
}

// ─── Helpers ───────────────────────────────────────────────────

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function examVisibleForUser(exam: Exam, user: User): boolean {
  if (user.role === 'admin' || user.role === 'teacher') return true;
  if (exam.targetClasses.includes('Tất cả')) return true;
  if (exam.targetClasses.length === 0) return true;
  const classMatch = exam.targetClasses.some((cls) => user.assignedClasses.includes(cls));
  if (!classMatch) return false;
  if (user.allowedSubjects.length > 0 && !user.allowedSubjects.includes(exam.subject)) return false;
  return true;
}

export function isExamCompletedByUser(examId: string, userId: string, completions: CompletionRecord[]): boolean {
  return completions.some((c) => c.examId === examId && c.userId === userId);
}

// ─── Subjects ──────────────────────────────────────────────────

export async function loadSubjects(): Promise<string[]> {
  if (supabase) {
    const { data } = await supabase.from('subjects').select('name').order('name');
    if (data && data.length > 0) return data.map((r) => r.name);
    // Seed default subjects to Supabase
    const inserts = DEFAULT_SUBJECTS.map((name) => ({ id: generateId('sub'), name }));
    await supabase.from('subjects').insert(inserts);
    return DEFAULT_SUBJECTS;
  }
  const raw = localStorage.getItem(LS_SUBJECTS);
  if (!raw) {
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
    return DEFAULT_SUBJECTS;
  }
  return JSON.parse(raw);
}

export async function addSubject(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (supabase) {
    await supabase.from('subjects').insert({ id: generateId('sub'), name: trimmed });
    return loadSubjects();
  }
  const current = await loadSubjects();
  if (!current.includes(trimmed)) {
    const next = [...current, trimmed];
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(next));
    dispatchDataChange('subjects');
    return next;
  }
  return current;
}

export async function removeSubject(name: string): Promise<string[]> {
  if (supabase) {
    await supabase.from('subjects').delete().eq('name', name);
    return loadSubjects();
  }
  const current = await loadSubjects();
  const next = current.filter((s) => s !== name);
  localStorage.setItem(LS_SUBJECTS, JSON.stringify(next));
  dispatchDataChange('subjects');
  return next;
}

// ─── Classes (empty by default) ────────────────────────────────

export async function loadClasses(): Promise<string[]> {
  if (supabase) {
    const { data } = await supabase.from('classes').select('name').order('name');
    if (data) return data.map((r) => r.name);
    return [];
  }
  const raw = localStorage.getItem(LS_CLASSES);
  if (!raw) {
    localStorage.setItem(LS_CLASSES, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export async function addClass(name: string): Promise<string[]> {
  const trimmed = name.trim();
  if (supabase) {
    await supabase.from('classes').insert({ id: generateId('cls'), name: trimmed });
    return loadClasses();
  }
  const current = await loadClasses();
  if (!current.includes(trimmed)) {
    const next = [...current, trimmed];
    localStorage.setItem(LS_CLASSES, JSON.stringify(next));
    dispatchDataChange('classes');
    return next;
  }
  return current;
}

export async function removeClass(name: string): Promise<string[]> {
  if (supabase) {
    await supabase.from('classes').delete().eq('name', name);
    return loadClasses();
  }
  const current = await loadClasses();
  const next = current.filter((c) => c !== name);
  localStorage.setItem(LS_CLASSES, JSON.stringify(next));
  dispatchDataChange('classes');
  return next;
}

// ─── Exams ─────────────────────────────────────────────────────

function mapExamRow(r: Record<string, unknown>): Exam {
  return {
    id: r.id as string,
    title: r.title as string,
    subject: r.subject as string,
    grade: (r.grade as string) ?? '',
    durationMinutes: (r.duration_minutes as number) ?? 15,
    deadline: r.deadline as string,
    status: r.status as Exam['status'],
    formsUrl: r.forms_url as string,
    targetClasses: (r.target_classes as string[]) ?? [],
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function examToRow(e: Omit<Exam, 'id' | 'createdAt'>) {
  return {
    title: e.title,
    subject: e.subject,
    grade: e.grade,
    duration_minutes: e.durationMinutes,
    deadline: e.deadline,
    status: e.status,
    forms_url: e.formsUrl,
    target_classes: e.targetClasses,
  };
}

export async function loadExams(): Promise<Exam[]> {
  if (supabase) {
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
    if (data) return data.map(mapExamRow);
    return [];
  }
  const raw = localStorage.getItem(LS_EXAMS);
  if (!raw) {
    localStorage.setItem(LS_EXAMS, JSON.stringify(SEED_EXAMS));
    return SEED_EXAMS;
  }
  const parsed = JSON.parse(raw) as Exam[];
  return parsed.map((e) => ({ ...e, targetClasses: e.targetClasses ?? [] }));
}

export async function saveExams(exams: Exam[]): Promise<void> {
  if (supabase) {
    // Full sync: delete all and re-insert
    await supabase.from('exams').delete().neq('id', '___none___');
    if (exams.length > 0) {
      const rows = exams.map((e) => ({ id: e.id, ...examToRow(e), created_at: e.createdAt }));
      await supabase.from('exams').insert(rows);
    }
    return;
  }
  localStorage.setItem(LS_EXAMS, JSON.stringify(exams));
  dispatchDataChange('exams');
}

export async function createExam(data: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
  const exam: Exam = { ...data, id: generateId('exam'), createdAt: new Date().toISOString() };
  if (supabase) {
    await supabase.from('exams').insert({ id: exam.id, ...examToRow(data), created_at: exam.createdAt });
  } else {
    const current = await loadExams();
    await saveExamsLocal([exam, ...current]);
  }
  return exam;
}

export async function batchCreateExams(items: Omit<Exam, 'id' | 'createdAt'>[]): Promise<Exam[]> {
  const newExams: Exam[] = items.map((data) => ({
    ...data, id: generateId('exam'), createdAt: new Date().toISOString(),
  }));
  if (supabase) {
    const rows = newExams.map((e) => ({ id: e.id, ...examToRow(e), created_at: e.createdAt }));
    await supabase.from('exams').insert(rows);
  } else {
    const current = await loadExams();
    await saveExamsLocal([...newExams, ...current]);
  }
  return newExams;
}

export async function updateExam(id: string, updates: Partial<Exam>): Promise<void> {
  if (supabase) {
    const row: Record<string, unknown> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.subject !== undefined) row.subject = updates.subject;
    if (updates.grade !== undefined) row.grade = updates.grade;
    if (updates.durationMinutes !== undefined) row.duration_minutes = updates.durationMinutes;
    if (updates.deadline !== undefined) row.deadline = updates.deadline;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.formsUrl !== undefined) row.forms_url = updates.formsUrl;
    if (updates.targetClasses !== undefined) row.target_classes = updates.targetClasses;
    await supabase.from('exams').update(row).eq('id', id);
    return;
  }
  const current = await loadExams();
  const next = current.map((e) => (e.id === id ? { ...e, ...updates } : e));
  await saveExamsLocal(next);
}

export async function deleteExam(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('exams').delete().eq('id', id);
    await supabase.from('exam_results').delete().eq('exam_id', id);
    return;
  }
  const current = await loadExams();
  await saveExamsLocal(current.filter((e) => e.id !== id));
}

async function saveExamsLocal(exams: Exam[]): Promise<void> {
  localStorage.setItem(LS_EXAMS, JSON.stringify(exams));
  dispatchDataChange('exams');
}

// ─── Users ─────────────────────────────────────────────────────

function mapUserRow(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    username: r.username as string,
    password: r.password as string,
    fullName: r.full_name as string,
    role: r.role as User['role'],
    assignedClasses: (r.assigned_classes as string[]) ?? [],
    allowedSubjects: (r.allowed_subjects as string[]) ?? [],
  };
}

function userToRow(u: Omit<User, 'id'>) {
  return {
    username: u.username,
    password: u.password,
    full_name: u.fullName,
    role: u.role,
    assigned_classes: u.assignedClasses,
    allowed_subjects: u.allowedSubjects,
  };
}

export async function loadUsers(): Promise<User[]> {
  if (supabase) {
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: true });
    if (data && data.length > 0) return data.map(mapUserRow);
    // Seed default users
    const rows = SEED_USERS.map((u) => ({ id: u.id, ...userToRow(u) }));
    await supabase.from('app_users').insert(rows);
    return SEED_USERS;
  }
  const raw = localStorage.getItem(LS_USERS);
  if (!raw) {
    localStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
  const parsed = JSON.parse(raw) as User[];
  return parsed.map((u) => ({ ...u, allowedSubjects: u.allowedSubjects ?? [] }));
}

export async function saveUsers(users: User[]): Promise<void> {
  if (supabase) {
    await supabase.from('app_users').delete().neq('id', '___none___');
    if (users.length > 0) {
      const rows = users.map((u) => ({ id: u.id, ...userToRow(u), created_at: new Date().toISOString() }));
      await supabase.from('app_users').insert(rows);
    }
    return;
  }
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  const user: User = { ...data, id: generateId('user') };
  if (supabase) {
    await supabase.from('app_users').insert({ id: user.id, ...userToRow(data) });
  } else {
    const current = await loadUsers();
    await saveUsersLocal([...current, user]);
  }
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  if (supabase) {
    const row: Record<string, unknown> = {};
    if (updates.username !== undefined) row.username = updates.username;
    if (updates.password !== undefined) row.password = updates.password;
    if (updates.fullName !== undefined) row.full_name = updates.fullName;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.assignedClasses !== undefined) row.assigned_classes = updates.assignedClasses;
    if (updates.allowedSubjects !== undefined) row.allowed_subjects = updates.allowedSubjects;
    await supabase.from('app_users').update(row).eq('id', id);
    return;
  }
  const current = await loadUsers();
  await saveUsersLocal(current.map((u) => (u.id === id ? { ...u, ...updates } : u)));
}

export async function deleteUser(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('app_users').delete().eq('id', id);
    return;
  }
  const current = await loadUsers();
  await saveUsersLocal(current.filter((u) => u.id !== id));
}

async function saveUsersLocal(users: User[]): Promise<void> {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

// ─── Session ───────────────────────────────────────────────────

export function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) as User : null;
  } catch {
    return null;
  }
}

export function saveSession(user: User | null): void {
  if (user) localStorage.setItem(LS_SESSION, JSON.stringify(user));
  else localStorage.removeItem(LS_SESSION);
}

// ─── Completions (LocalStorage only — ephemeral) ───────────────

export async function loadCompletions(): Promise<CompletionRecord[]> {
  const raw = localStorage.getItem(LS_COMPLETIONS);
  if (!raw) {
    localStorage.setItem(LS_COMPLETIONS, JSON.stringify(SEED_COMPLETIONS));
    return SEED_COMPLETIONS;
  }
  return JSON.parse(raw);
}

export async function saveCompletions(records: CompletionRecord[]): Promise<void> {
  localStorage.setItem(LS_COMPLETIONS, JSON.stringify(records));
}

// ─── Exam Results (scores) ─────────────────────────────────────

function mapResultRow(r: Record<string, unknown>): ExamResult {
  return {
    id: r.id as string,
    examId: r.exam_id as string,
    studentName: r.student_name as string,
    studentUsername: (r.student_username as string) ?? '',
    className: (r.class_name as string) ?? '',
    examTitle: (r.exam_title as string) ?? '',
    score: Number(r.score) ?? 0,
    status: (r.status as ExamResult['status']) ?? 'submitted',
    submittedAt: (r.submitted_at as string) ?? null,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

export async function loadResults(): Promise<ExamResult[]> {
  if (supabase) {
    const { data } = await supabase.from('exam_results').select('*').order('created_at', { ascending: false });
    if (data) return data.map(mapResultRow);
    return [];
  }
  const raw = localStorage.getItem(LS_RESULTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveResults(results: ExamResult[]): Promise<void> {
  if (supabase) {
    await supabase.from('exam_results').delete().neq('id', '___none___');
    if (results.length > 0) {
      const rows = results.map((r) => ({
        id: r.id,
        exam_id: r.examId,
        student_name: r.studentName,
        student_username: r.studentUsername,
        class_name: r.className,
        exam_title: r.examTitle,
        score: r.score,
        status: r.status,
        submitted_at: r.submittedAt,
      }));
      await supabase.from('exam_results').insert(rows);
    }
    return;
  }
  localStorage.setItem(LS_RESULTS, JSON.stringify(results));
  dispatchDataChange('results');
}

export async function importResults(items: Omit<ExamResult, 'id' | 'createdAt'>[]): Promise<void> {
  if (supabase) {
    const rows = items.map((r) => ({
      id: generateId('result'),
      exam_id: r.examId,
      student_name: r.studentName,
      student_username: r.studentUsername,
      class_name: r.className,
      exam_title: r.examTitle,
      score: r.score,
      status: r.status,
      submitted_at: r.submittedAt,
    }));
    await supabase.from('exam_results').insert(rows);
    return;
  }
  const current = await loadResults();
  const newRecords: ExamResult[] = items.map((r) => ({
    ...r, id: generateId('result'), createdAt: new Date().toISOString(),
  }));
  await saveResults([...newRecords, ...current]);
}

export { isSupabaseConfigured };

// ─── Lessons ───────────────────────────────────────────────────

const LS_LESSONS = 'quizforms_lessons';

const SEED_LESSONS: Lesson[] = [
  {
    id: 'lesson-001',
    title: '～に際して・～にあたって',
    source: 'Mau_bai_hoc_ngu_phap_JLPT_N2.xlsx',
    sheetId: 'Bai_01',
    meaning: 'Vào lúc / Nhân dịp (khi thực hiện một sự việc quan trọng)',
    connectionRule: 'V-る/N + に際して　／　V-る/N + にあたって',
    notes: '「に際して」mang sắc thái trang trọng, dùng trong văn viết. 「にあたって」dùng được cả văn nói và văn viết, nhấn mạnh vào thời điểm chuẩn bị trước khi làm việc quan trọng.',
    distinction: '・に際して ≒ にあたって（trang trọng hơn）\n・のとき: thông dụng hơn, không nhất thiết trang trọng\n・にあたり: biến thể viết tắt của にあたって',
    examples: [
      { stt: 1, japanese: '渡航に際して、パスポートの有効期限を確認してください。', vietnamese: 'Nhân dịp xuất ngoại, hãy kiểm tra thời hạn hộ chiếu.', analysis: 'N + に際して → nhấn mạnh vào thời điểm trước/trong khi thực hiện', vocabulary: '渡航(とこう): xuất ngoại; 有効期限(ゆうこうきげん): thời hạn hiệu lực', note: 'Văn phong trang trọng' },
      { stt: 2, japanese: '新年度にあたって、目標を立てた。', vietnamese: 'Nhân đầu năm học mới, tôi đã đặt ra mục tiêu.', analysis: 'N + にあたって → nhân dịp sự kiện mang tính dấu mốc', vocabulary: '新年度(しんねんど): năm học/năm tài chính mới; 目標(もくひょう): mục tiêu', note: '' },
      { stt: 3, japanese: '契約を結ぶに際して、内容を十分に確認すること。', vietnamese: 'Khi ký kết hợp đồng, cần kiểm tra kỹ nội dung.', analysis: 'V-る + に際して → hành động quan trọng cần chuẩn bị trước', vocabulary: '契約(けいやく): hợp đồng; 結ぶ(むすぶ): ký kết', note: '' },
      { stt: 4, japanese: '入学にあたり、必要書類を揃えてください。', vietnamese: 'Nhân dịp nhập học, hãy chuẩn bị đầy đủ giấy tờ cần thiết.', analysis: 'にあたり = にあたって (văn viết)', vocabulary: '入学(にゅうがく): nhập học; 書類(しょるい): giấy tờ; 揃える(そろえる): chuẩn bị đầy đủ', note: 'にあたり là dạng viết tắt' },
      { stt: 5, japanese: '開会に際しまして、一言ご挨拶申し上げます。', vietnamese: 'Nhân dịp khai mạc, cho phép tôi xin gửi vài lời chào.', analysis: 'に際しまして: dạng kính ngữ cao nhất của に際して', vocabulary: '開会(かいかい): khai mạc; ご挨拶(あいさつ): lời chào', note: 'Kính ngữ - dùng trong diễn văn' },
    ],
    exercises: [
      { stt: 1, type: 'multiple_choice', question: '卒業（　　）、先生方への感謝の気持ちを伝えたい。', optionA: 'に際して', optionB: 'にもかかわらず', optionC: 'にとって', optionD: 'によって', hint: 'Nhân dịp tốt nghiệp' },
      { stt: 2, type: 'multiple_choice', question: '新しいプロジェクトを始める（　　）、チームで話し合いをした。', optionA: 'にあたって', optionB: 'にしたがって', optionC: 'に反して', optionD: 'に対して', hint: 'Khi bắt đầu dự án mới' },
      { stt: 3, type: 'conjugation', question: '（出発する）___に際して、荷物の確認をしてください。', optionA: '出発する', optionB: '出発した', optionC: '出発して', optionD: '', hint: 'V-る + に際して' },
      { stt: 4, type: 'translate', question: 'Dịch sang tiếng Nhật: "Nhân dịp kỷ niệm 10 năm thành lập công ty, chúng tôi sẽ tổ chức tiệc lớn."', optionA: '', optionB: '', optionC: '', optionD: '', hint: '創立10周年 / 記念パーティー' },
      { stt: 5, type: 'arrange', question: 'Sắp xếp: [試験 ／ に際して ／ 受ける ／ を ／ 、注意事項をよく読め]', optionA: '', optionB: '', optionC: '', optionD: '', hint: 'N/V-る + に際して' },
    ],
    answers: [
      { stt: 1, answer: 'A: に際して', fullSentence: '卒業に際して、先生方への感謝の気持ちを伝えたい。', explanation: '「に際して」dùng với danh từ/động từ thể る, mang nghĩa "nhân dịp/vào lúc" sự kiện quan trọng.', commonErrors: '「にもかかわらず」= dù cho; 「にとって」= đối với → sai ngữ cảnh.', selfAssess: '★★★★☆' },
      { stt: 2, answer: 'A: にあたって', fullSentence: '新しいプロジェクトを始めるにあたって、チームで話し合いをした。', explanation: 'V-る + にあたって nhấn mạnh vào giai đoạn chuẩn bị trước khi thực hiện việc quan trọng.', commonErrors: '「にしたがって」= theo/tuỳ theo sự thay đổi; hoàn toàn khác nghĩa.', selfAssess: '★★★☆☆' },
      { stt: 3, answer: '出発する', fullSentence: '出発するに際して、荷物の確認をしてください。', explanation: 'に際して nối với V thể る (thể từ điển), không dùng thể た hay て.', commonErrors: 'Sai khi dùng thể た (quá khứ) vì に際して đề cập đến thời điểm hiện tại/tương lai của sự kiện.', selfAssess: '★★★★☆' },
      { stt: 4, answer: '会社設立10周年にあたって（／に際して）、大きなパーティーを開催します。', fullSentence: '会社設立10周年にあたって、大きなパーティーを開催します。', explanation: 'にあたって / に際して đều đúng. 周年(しゅうねん)=kỷ niệm năm; 開催(かいさい)=tổ chức.', commonErrors: 'Không dùng 「のとき」vì câu này có sắc thái trang trọng.', selfAssess: '★★☆☆☆' },
      { stt: 5, answer: '試験を受けるに際して、注意事項をよく読め。', fullSentence: '試験を受けるに際して、注意事項をよく読め。', explanation: 'V-る + に際して. 注意事項(ちゅういじこう)=điều chú ý; よく読め=đọc kỹ (mệnh lệnh).', commonErrors: 'Nhớ thứ tự: [đối tượng + を + V-る] + に際して.', selfAssess: '★★★☆☆' },
    ],
    sortOrder: 1,
    targetClasses: [],
    createdAt: new Date().toISOString(),
  },
];

function mapLessonRow(r: Record<string, unknown>): Lesson {
  return {
    id: r.id as string,
    title: r.title as string,
    source: (r.source as string) ?? '',
    sheetId: (r.sheet_id as string) ?? '',
    meaning: (r.meaning as string) ?? '',
    connectionRule: (r.connection_rule as string) ?? '',
    notes: (r.notes as string) ?? '',
    distinction: (r.distinction as string) ?? '',
    examples: (r.examples as Lesson['examples']) ?? [],
    exercises: (r.exercises as Lesson['exercises']) ?? [],
    answers: (r.answers as Lesson['answers']) ?? [],
    sortOrder: (r.sort_order as number) ?? 0,
    targetClasses: (r.target_classes as string[]) ?? [],
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function lessonToRow(l: Lesson) {
  return {
    id: l.id,
    title: l.title,
    source: l.source,
    sheet_id: l.sheetId,
    meaning: l.meaning,
    connection_rule: l.connectionRule,
    notes: l.notes,
    distinction: l.distinction,
    examples: l.examples,
    exercises: l.exercises,
    answers: l.answers,
    sort_order: l.sortOrder,
    target_classes: l.targetClasses,
    created_at: l.createdAt,
  };
}

export async function loadLessons(): Promise<Lesson[]> {
  if (supabase) {
    const { data } = await supabase.from('lessons').select('*').order('sort_order', { ascending: true });
    if (data && data.length > 0) return data.map(mapLessonRow);
    // Seed
    await supabase.from('lessons').insert(SEED_LESSONS.map(lessonToRow));
    return SEED_LESSONS;
  }
  const raw = localStorage.getItem(LS_LESSONS);
  if (!raw) {
    localStorage.setItem(LS_LESSONS, JSON.stringify(SEED_LESSONS));
    return SEED_LESSONS;
  }
  return JSON.parse(raw);
}

export async function saveLessons(lessons: Lesson[]): Promise<void> {
  if (supabase) {
    await supabase.from('lessons').delete().neq('id', '___none___');
    if (lessons.length > 0) await supabase.from('lessons').insert(lessons.map(lessonToRow));
    return;
  }
  localStorage.setItem(LS_LESSONS, JSON.stringify(lessons));
  dispatchDataChange('lessons');
}

export async function upsertLessons(lessons: Lesson[]): Promise<void> {
  if (supabase) {
    const rows = lessons.map(lessonToRow);
    await supabase.from('lessons').upsert(rows, { onConflict: 'id' });
    return;
  }
  const current = await loadLessons();
  const map = new Map(current.map((l) => [l.id, l]));
  lessons.forEach((l) => map.set(l.id, l));
  const merged = Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  localStorage.setItem(LS_LESSONS, JSON.stringify(merged));
  dispatchDataChange('lessons');
}

export async function deleteLesson(id: string): Promise<void> {
  if (supabase) {
    await supabase.from('lessons').delete().eq('id', id);
    return;
  }
  const current = await loadLessons();
  localStorage.setItem(LS_LESSONS, JSON.stringify(current.filter((l) => l.id !== id)));
  dispatchDataChange('lessons');
}
