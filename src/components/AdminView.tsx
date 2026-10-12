import { useState, useEffect } from 'react';
import type { Exam, ExamStatus } from '@/types';
import { loadSubjects, addSubject, removeSubject, loadClasses, addClass, removeClass, getSubjectMeta } from '@/storage';
import { StatusBadge, formatDate, ClassBadge } from './shared';
import { toast } from './Toast';
import { ExcelImportModal } from './ExcelImportModal';
import {
  Plus, Edit2, Trash2, Copy, Check, X, ExternalLink, Inbox, Search,
  FileSpreadsheet, PlusCircle, XCircle,
} from 'lucide-react';

interface AdminViewProps {
  exams: Exam[];
  onCreate: (exam: Omit<Exam, 'id' | 'createdAt'>) => void;
  onBatchCreate: (exams: Omit<Exam, 'id' | 'createdAt'>[]) => void;
  onUpdate: (id: string, updates: Partial<Exam>) => void;
  onDelete: (id: string) => void;
}

export function AdminView({ exams, onCreate, onBatchCreate, onUpdate, onDelete }: AdminViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = exams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = async (exam: Exam) => {
    try {
      await navigator.clipboard.writeText(exam.formsUrl);
      setCopiedId(exam.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast('Đã sao chép link bài thi', 'success');
    } catch {
      const input = document.createElement('input');
      input.value = exam.formsUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedId(exam.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast('Đã sao chép link bài thi', 'success');
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Quản lý bài thi</h2>
        <p className="text-sm text-slate-500">{exams.length} bài thi tổng cộng</p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] hover:bg-blue-700"
        >
          <Plus size={18} />
          Tạo mới
        </button>
        <button
          onClick={() => setShowExcelImport(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all active:scale-[0.98] hover:bg-emerald-100"
        >
          <FileSpreadsheet size={18} />
          Nhập từ Excel
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm bài thi..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((exam) => {
            const meta = getSubjectMeta(exam.subject);
            return (
              <div key={exam.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${meta.bg} ${meta.text}`}>
                      {exam.subject}
                    </span>
                    {exam.grade && (
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Khối {exam.grade}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={exam.status} />
                </div>

                <h3 className="mb-2 text-sm font-semibold text-slate-800">{exam.title}</h3>

                <div className="mb-2.5">
                  <ClassBadge classes={exam.targetClasses} />
                </div>

                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{exam.durationMinutes} phút</span>
                  <span>Hạn: {formatDate(exam.deadline)}</span>
                </div>

                <div className="mb-3 flex items-center gap-1.5">
                  <div className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    {exam.formsUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(exam)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-all active:scale-[0.95] ${
                      copiedId === exam.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {copiedId === exam.id ? <Check size={15} /> : <Copy size={15} />}
                    {copiedId === exam.id ? 'Đã copy' : 'Copy'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditingExam(exam)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Edit2 size={14} /> Sửa
                  </button>
                  <a
                    href={exam.formsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ExternalLink size={14} /> Mở
                  </a>
                  <button
                    onClick={() => {
                      onUpdate(exam.id, { status: exam.status === 'open' ? 'closed' : 'open' });
                      toast(exam.status === 'open' ? 'Đã tắt bài thi' : 'Đã bật bài thi', 'info');
                    }}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      exam.status === 'open'
                        ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {exam.status === 'open' ? 'Tắt bài thi' : 'Bật bài thi'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Xóa bài thi "${exam.title}"?`)) {
                        onDelete(exam.id);
                        toast('Đã xóa bài thi', 'info');
                      }
                    }}
                    className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox size={48} className="mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Chưa có bài thi nào</p>
          <p className="mt-1 text-xs text-slate-400">Bấm "Tạo mới" để thêm bài thi đầu tiên</p>
        </div>
      )}

      {showCreate && (
        <ExamFormModal
          onClose={() => setShowCreate(false)}
          onSave={(data) => { onCreate(data); setShowCreate(false); toast('Đã tạo bài thi mới', 'success'); }}
        />
      )}
      {editingExam && (
        <ExamFormModal
          exam={editingExam}
          onClose={() => setEditingExam(null)}
          onSave={(data) => { onUpdate(editingExam.id, data); setEditingExam(null); toast('Đã cập nhật bài thi', 'success'); }}
        />
      )}
      {showExcelImport && (
        <ExcelImportModal
          onClose={() => setShowExcelImport(false)}
          onImport={(imported) => { onBatchCreate(imported); toast(`Đã nhập ${imported.length} bài thi từ Excel`, 'success'); }}
        />
      )}
    </div>
  );
}

interface ExamFormModalProps {
  exam?: Exam;
  onClose: () => void;
  onSave: (data: Omit<Exam, 'id' | 'createdAt'>) => void;
}

function ExamFormModal({ exam, onClose, onSave }: ExamFormModalProps) {
  const [title, setTitle] = useState(exam?.title ?? '');
  const [subject, setSubject] = useState(exam?.subject ?? 'Toán');
  const [grade, setGrade] = useState(exam?.grade ?? '');
  const [duration, setDuration] = useState(exam?.durationMinutes?.toString() ?? '15');
  const [deadline, setDeadline] = useState(exam?.deadline ? new Date(exam.deadline).toISOString().slice(0, 10) : '');
  const [formsUrl, setFormsUrl] = useState(exam?.formsUrl ?? '');
  const [status, setStatus] = useState<ExamStatus>(exam?.status ?? 'open');
  const [targetClasses, setTargetClasses] = useState<string[]>(exam?.targetClasses ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [subjects, setSubjects] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [subjectMode, setSubjectMode] = useState<'select' | 'input'>('select');
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');
  const [showClassInput, setShowClassInput] = useState(false);

  useEffect(() => {
    loadSubjects().then(setSubjects);
    loadClasses().then(setClasses);
  }, []);

  const toggleClass = (cls: string) => {
    setTargetClasses((prev) => {
      if (cls === 'Tất cả') return ['Tất cả'];
      const withoutAll = prev.filter((c) => c !== 'Tất cả');
      if (withoutAll.includes(cls)) {
        const next = withoutAll.filter((c) => c !== cls);
        return next;
      }
      return [...withoutAll, cls];
    });
  };

  const handleAddSubject = async () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    const updated = await addSubject(trimmed);
    setSubjects(updated);
    setSubject(trimmed);
    setNewSubject('');
    setSubjectMode('select');
    toast(`Đã thêm môn "${trimmed}"`, 'success');
  };

  const handleRemoveSubject = async (s: string) => {
    const updated = await removeSubject(s);
    setSubjects(updated);
    if (subject === s && updated.length > 0) setSubject(updated[0]);
    toast(`Đã xóa môn "${s}"`, 'info');
  };

  const handleAddClass = async () => {
    const trimmed = newClass.trim();
    if (!trimmed) return;
    const updated = await addClass(trimmed);
    setClasses(updated);
    setTargetClasses((prev) => prev.includes('Tất cả') ? [trimmed] : [...prev, trimmed]);
    setNewClass('');
    setShowClassInput(false);
    toast(`Đã thêm lớp "${trimmed}"`, 'success');
  };

  const handleRemoveClass = async (cls: string) => {
    const updated = await removeClass(cls);
    setClasses(updated);
    setTargetClasses((prev) => prev.filter((c) => c !== cls));
    toast(`Đã xóa lớp "${cls}"`, 'info');
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề';
    if (!subject.trim()) newErrors.subject = 'Vui lòng chọn môn học';
    if (!formsUrl.trim()) newErrors.formsUrl = 'Vui lòng dán link Microsoft Forms';
    if (!deadline) newErrors.deadline = 'Vui lòng chọn hạn nộp';
    if (!duration || parseInt(duration) <= 0) newErrors.duration = 'Thời gian phải > 0';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    onSave({
      title: title.trim(), subject: subject.trim(), grade: grade.trim(),
      durationMinutes: parseInt(duration), deadline: new Date(deadline).toISOString(),
      formsUrl: formsUrl.trim(), status, targetClasses,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">{exam ? 'Chỉnh sửa bài thi' : 'Tạo bài thi mới'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tiêu đề bài thi</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Kiểm tra Toán 15 phút"
              className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${errors.title ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`} />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Môn học</label>
              {subjectMode === 'select' ? (
                <div className="relative">
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                    {subjects.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <button onClick={() => setSubjectMode('input')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-blue-500 hover:bg-blue-50" title="Thêm môn mới">
                    <PlusCircle size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                    placeholder="Nhập môn..." className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" autoFocus />
                  <button onClick={handleAddSubject} className="rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700"><Check size={18} /></button>
                  <button onClick={() => { setSubjectMode('select'); setNewSubject(''); }} className="rounded-xl bg-slate-100 px-3 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
                </div>
              )}
              {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Khối lớp</label>
              <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="VD: 12"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          {subjects.length > 0 && subjectMode === 'select' && (
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <span key={s} className="group inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {s}
                  <button onClick={() => handleRemoveSubject(s)} className="text-slate-300 hover:text-red-500"><XCircle size={11} /></button>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Thời gian (phút)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="15" min={1}
                className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${errors.duration ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`} />
              {errors.duration && <p className="mt-1 text-xs text-red-500">{errors.duration}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Hạn nộp</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${errors.deadline ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`} />
              {errors.deadline && <p className="mt-1 text-xs text-red-500">{errors.deadline}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Lớp áp dụng</label>
            <p className="mb-2 text-xs text-slate-400">Chọn lớp được phép làm bài thi. Bỏ trống = tất cả các lớp.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleClass('Tất cả')}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${targetClasses.includes('Tất cả') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Tất cả các lớp
              </button>
              {classes.map((cls) => (
                <div key={cls} className="relative group">
                  <button onClick={() => toggleClass(cls)}
                    className={`rounded-lg px-3 py-2 pr-7 text-xs font-medium transition-all ${targetClasses.includes(cls) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
                  placeholder="Nhập tên lớp mới (VD: 12A3, Ôn thi HSG...)" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" autoFocus />
                <button onClick={handleAddClass} className="rounded-xl bg-blue-600 px-3 text-white hover:bg-blue-700"><Check size={18} /></button>
                <button onClick={() => { setShowClassInput(false); setNewClass(''); }} className="rounded-xl bg-slate-100 px-3 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setShowClassInput(true)} className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50">
                <PlusCircle size={14} /> Thêm lớp mới
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Trạng thái</label>
            <div className="flex gap-2">
              {([{ v: 'open', l: 'Đang mở' }, { v: 'upcoming', l: 'Sắp tới' }, { v: 'closed', l: 'Đã đóng' }] as { v: ExamStatus; l: string }[]).map((opt) => (
                <button key={opt.v} onClick={() => setStatus(opt.v)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${status === opt.v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Đường link Microsoft Forms</label>
            <input type="url" value={formsUrl} onChange={(e) => setFormsUrl(e.target.value)} placeholder="https://forms.office.com/..."
              className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${errors.formsUrl ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`} />
            {errors.formsUrl && <p className="mt-1 text-xs text-red-500">{errors.formsUrl}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
            <button onClick={handleSubmit} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700">{exam ? 'Lưu thay đổi' : 'Tạo bài thi'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
