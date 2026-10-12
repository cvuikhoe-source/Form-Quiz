import type { Role, ViewMode } from '@/types';
import { ClipboardList, Users, BarChart3, UserCircle, History, GraduationCap, BookOpen } from 'lucide-react';

interface BottomNavProps {
  role: Role;
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ADMIN_NAV: { mode: ViewMode; label: string; icon: typeof ClipboardList }[] = [
  { mode: 'exams', label: 'Bài thi', icon: ClipboardList },
  { mode: 'lessons', label: 'Bài học', icon: BookOpen },
  { mode: 'users', label: 'Tài khoản', icon: Users },
  { mode: 'stats', label: 'Thống kê', icon: BarChart3 },
  { mode: 'profile', label: 'Hồ sơ', icon: UserCircle },
];

const TEACHER_NAV: { mode: ViewMode; label: string; icon: typeof ClipboardList }[] = [
  { mode: 'exams', label: 'Bài thi', icon: ClipboardList },
  { mode: 'lessons', label: 'Bài học', icon: BookOpen },
  { mode: 'students', label: 'Học sinh', icon: GraduationCap },
  { mode: 'stats', label: 'Thống kê', icon: BarChart3 },
  { mode: 'profile', label: 'Hồ sơ', icon: UserCircle },
];

const STUDENT_NAV: { mode: ViewMode; label: string; icon: typeof ClipboardList }[] = [
  { mode: 'exams', label: 'Đề thi', icon: ClipboardList },
  { mode: 'lessons', label: 'Bài học', icon: BookOpen },
  { mode: 'history', label: 'Lịch sử', icon: History },
  { mode: 'profile', label: 'Hồ sơ', icon: UserCircle },
];

export function BottomNav({ role, current, onChange }: BottomNavProps) {
  const items = role === 'admin' ? ADMIN_NAV : role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-slate-200/80 safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => onChange(item.mode)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-1 w-8 rounded-full bg-blue-600" />
              )}
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
