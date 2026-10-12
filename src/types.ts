export type ExamStatus = 'open' | 'upcoming' | 'closed';
export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: Role;
  assignedClasses: string[];
  allowedSubjects: string[];
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  deadline: string;
  status: ExamStatus;
  formsUrl: string;
  targetClasses: string[];
  createdAt: string;
}

export interface CompletionRecord {
  id: string;
  examId: string;
  userId: string;
  completedAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentName: string;
  studentUsername: string;
  className: string;
  examTitle: string;
  score: number;
  status: 'submitted' | 'graded';
  submittedAt: string | null;
  createdAt: string;
}

// ─── Grammar Lessons ──────────────────────────────────────────

export interface LessonExample {
  stt: number;
  japanese: string;
  vietnamese: string;
  analysis: string;
  vocabulary: string;
  note: string;
}

export type ExerciseType = 'multiple_choice' | 'conjugation' | 'arrange' | 'translate';

export interface LessonExercise {
  stt: number;
  type: ExerciseType;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  hint: string;
}

export interface LessonAnswer {
  stt: number;
  answer: string;
  fullSentence: string;
  explanation: string;
  commonErrors: string;
  selfAssess: string;
}

export interface Lesson {
  id: string;
  title: string;
  source: string;
  sheetId: string;
  meaning: string;
  connectionRule: string;
  notes: string;
  distinction: string;
  examples: LessonExample[];
  exercises: LessonExercise[];
  answers: LessonAnswer[];
  sortOrder: number;
  targetClasses: string[];
  createdAt: string;
}

export type AdminViewMode = 'exams' | 'users' | 'stats' | 'lessons' | 'profile';
export type TeacherViewMode = 'exams' | 'students' | 'stats' | 'lessons' | 'profile';
export type StudentViewMode = 'exams' | 'history' | 'lessons' | 'profile';
export type ViewMode = AdminViewMode | TeacherViewMode | StudentViewMode;
