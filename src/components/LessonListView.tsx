import { useState, useMemo, useEffect } from 'react';
import type { Lesson, User } from '@/types';
import { loadClasses, addClass, removeClass } from '@/storage';
import { BookOpen, Search, CheckCircle2, ChevronRight, Inbox, Plus, FileSpreadsheet, XCircle, PlusCircle, Check, X } from 'lucide-react';

interface LessonListViewProps {
  lessons: Lesson[];
  completedIds: Set<string>;
  currentUser: User;
  canManage: boolean;
  onOpen: (lesson: Lesson) => void;
  onImport: () => void;
  onUpdateLesson?: (id: string, updates: Partial<Lesson>) => void;
}

function lessonVisibleForStudent(lesson: Lesson, user: User): boolean {
  if (user.role !== 'student') return true;
  const tc = lesson.targetClasses;
  if (!tc || tc.length === 0 || tc.includes('Tất cả')) return true;
  return tc.some((cls) => user.assignedClasses.includes(cls));
}

export function LessonListView({ lessons, completedIds, currentUser, canManage, onOpen, onImport, onUpdateLesson }: LessonListViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'done' | 'todo'>('all');
  const [classes, setClasses] = useState<string[]>([]);
  const [showClassInput, setShowClassInput] = useState(false);
  const [newClass, setNewClass] = useState('');
  const [editingLessonClasses, setEditingLessonClasses] = useState<Lesson | null>(null);

  useEffect(() => {
    if (canManage) loadClasses().then(setClasses);
  }, [canManage]);

  // For students: filter by class visibility
  const visibleLessons = useMemo(
    () => lessons.filter((l) => lessonVisibleForStudent(l, currentUser)),
    [lessons, currentUser]
  );

  const filtered = useMemo(() => {
    return visibleLessons.filter((l) => {
      const matchSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.meaning.toLowerCase().includes(search.toLowerCase());
      const done = completedIds.has(l.id);
      if (filter === 'done' && !done) return false;
      if (filter === 'todo' && done) return false;
      return matchSearch;
    });
  }, [visibleLessons, search, filter, completedIds]);

  const doneCount = visibleLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = visibleLessons.length > 0 ? Math.round((doneCount / visibleLessons.length) * 100) : 0;

  const handleAddClass = async () => {
    const trimmed = newClass.trim();
    if (!trimmed) return;
    const updated = await addClass(trimmed);
    setClasses(updated);
    setNewClass('');
    setShowClassInput(false);
  };

  const handleRemoveClass = async (cls: string) => {
    const updated = await removeClass(cls);
    setClasses(updated);
  };

  const toggleLessonClass = (lesson: Lesson, cls: string) => {
    if (!onUpdateLesson) return;
    const current = lesson.targetClasses ?? [];
    let next: string[];
    if (cls === 'Tất cả') {
      next = current.includes('Tất cả') ? [] : ['Tất cả'];
    } else {
      const withoutAll = current.filter((c) => c !== 'Tất cả');
      next = withoutAll.includes(cls) ? withoutAll.filter((c) => c !== cls) : [...withoutAll, cls];
    }
    onUpdateLesson(lesson.id, { targetClasses: next });
    setEditingLessonClasses((prev) => prev ? { ...prev, targetClasses: next } : prev);
  };

  return (
    <div className="px-4 pb-28 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Bài học Ngữ pháp</h2>
          <p className="text-sm text-slate-500">{doneCount}/{visibleLessons.length} bài đã học</p>
        </div>
        {canManage && (
          <button onClick={onImport}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-700">
            <FileSpreadsheet size={15} /> Nhập Excel
          </button>
        )}
      </div>

      {/* Progress bar */}
      {visibleLessons.length > 0 && (
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-4 text-white shadow-md">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Tiến độ học tập</span>
            <span className="font-bold">{progressPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-blue-100">{doneCount} / {visibleLessons.length} bài đã hoàn thành</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm ngữ pháp..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex gap-2">
        {([
          { v: 'all', l: 'Tất cả' },
          { v: 'todo', l: 'Chưa học' },
          { v: 'done', l: 'Đã học' },
        ] as { v: 'all' | 'done' | 'todo'; l: string }[]).map((opt) => (
          <button key={opt.v} onClick={() => setFilter(opt.v)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filter === opt.v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            {opt.l}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map((lesson, idx) => {
            const done = completedIds.has(lesson.id);
            return (
              <div key={lesson.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {done ? <CheckCircle2 size={18} /> : <span>{lesson.sortOrder || idx + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onOpen(lesson)} className="text-left w-full">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{lesson.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{lesson.meaning}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><BookOpen size={10} /> {lesson.examples.length} ví dụ</span>
                        <span>{lesson.exercises.length} bài tập</span>
                        {(lesson.targetClasses?.length ?? 0) > 0 && !lesson.targetClasses.includes('Tất cả') && (
                          <span className="rounded bg-sky-100 px-1 py-0.5 font-medium text-sky-600">{lesson.targetClasses.join(', ')}</span>
                        )}
                      </div>
                    </button>
                    {canManage && onUpdateLesson && (
                      <button onClick={() => setEditingLessonClasses(lesson)}
                        className="mt-2 text-[10px] font-medium text-blue-500 hover:text-blue-700">
                        Phân lớp áp dụng {(lesson.targetClasses?.length ?? 0) > 0 ? `(${lesson.targetClasses.join(', ')})` : '(Tất cả)'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => onOpen(lesson)} className="shrink-0 self-center">
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox size={48} className="mb-3 text-slate-300" />
          {lessons.length === 0 ? (
            <>
              <p className="text-sm font-medium text-slate-500">Chưa có bài học nào</p>
              {canManage && (
                <button onClick={onImport} className="mt-3 flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                  <Plus size={16} /> Nhập từ Excel
                </button>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-slate-500">Không tìm thấy bài học</p>
          )}
        </div>
      )}

      {/* Class assignment modal for lessons */}
      {editingLessonClasses && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={() => setEditingLessonClasses(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Lớp áp dụng bài học</h3>
              <button onClick={() => setEditingLessonClasses(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <p className="mb-3 text-xs text-slate-500 font-medium truncate">{editingLessonClasses.title}</p>
            <p className="mb-3 text-xs text-slate-400">Chọn lớp được phép học bài này. Bỏ trống = tất cả các lớp.</p>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleLessonClass(editingLessonClasses, 'Tất cả')}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${(editingLessonClasses.targetClasses ?? []).includes('Tất cả') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Tất cả các lớp
              </button>
              {classes.map((cls) => (
                <div key={cls} className="relative group">
                  <button onClick={() => toggleLessonClass(editingLessonClasses, cls)}
                    className={`rounded-lg px-3 py-2 pr-7 text-xs font-medium transition-all ${(editingLessonClasses.targetClasses ?? []).includes(cls) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {cls}
                  </button>
                  <button onClick={() => handleRemoveClass(cls)} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500" title="Xóa lớp">
                    <XCircle size={12} />
                  </button>
                </div>
              ))}
            </div>

            {showClassInput ? (
              <div className="mt-2 flex gap-1.5">
                <input type="text" value={newClass} onChange={(e) => setNewClass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                  placeholder="Nhập tên lớp mới (VD: MVTC-N3...)" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" autoFocus />
                <button onClick={handleAddClass} className="rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700"><Check size={18} /></button>
                <button onClick={() => { setShowClassInput(false); setNewClass(''); }} className="rounded-xl bg-slate-100 px-3 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setShowClassInput(true)} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50">
                <PlusCircle size={14} /> Thêm lớp mới
              </button>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditingLessonClasses(null)} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Xong</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
