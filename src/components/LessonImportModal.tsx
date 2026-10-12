import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { Lesson, LessonExample, LessonExercise, LessonAnswer, ExerciseType } from '@/types';
import { generateId } from '@/storage';
import { toast } from './Toast';
import { X, Upload, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';

interface LessonImportModalProps {
  onClose: () => void;
  onImport: (lessons: Lesson[]) => void;
}

export function LessonImportModal({ onClose, onImport }: LessonImportModalProps) {
  const [parsedLessons, setParsedLessons] = useState<Lesson[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet: Danh_muc
    const dmData = [
      ['STT', 'Tên ngữ pháp', 'Ý nghĩa', 'Tên sheet bài học'],
      [1, '～に際して・～にあたって', 'Vào lúc / Nhân dịp (khi thực hiện việc quan trọng)', 'Bai_01'],
      [2, '～と思うと・～と思ったら', 'Vừa … thì …/ Ngờ đâu …', 'Bai_02'],
    ];
    const wsDm = XLSX.utils.aoa_to_sheet(dmData);
    wsDm['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 45 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsDm, 'Danh_muc');

    // Sheet: Bai_01
    const b1Data = [
      ['PHẦN 1: CẤU TRÚC & Ý NGHĨA', '', '', ''],
      ['Nguồn tài liệu', 'Mau_bai_hoc_ngu_phap_JLPT_N2.xlsx', '', ''],
      ['Tên ngữ pháp', '～に際して・～にあたって', '', ''],
      ['Ý nghĩa', 'Vào lúc / Nhân dịp (khi thực hiện việc quan trọng)', '', ''],
      ['Quy tắc liên kết (接続)', 'V-る/N + に際して　／　V-る/N + にあたって', '', ''],
      ['Lưu ý (注意)', '「に際して」mang sắc thái trang trọng, dùng trong văn viết.', '', ''],
      ['Phân biệt', '・に際して ≒ にあたって（trang trọng hơn）', '', ''],
      [],
      ['PHẦN 2: CÂU VÍ DỤ THỰC TẾ (例文)', '', '', '', '', ''],
      ['STT', 'Tiếng Nhật', 'Tiếng Việt', 'Phân tích', 'Từ vựng / Furigana', 'Ghi chú'],
      [1, '渡航に際して、パスポートの有効期限を確認してください。', 'Nhân dịp xuất ngoại, hãy kiểm tra thời hạn hộ chiếu.', 'N + に際して → thời điểm trước/trong khi thực hiện', '渡航(とこう): xuất ngoại', 'Văn phong trang trọng'],
      [2, '新年度にあたって、目標を立てた。', 'Nhân đầu năm học mới, tôi đã đặt ra mục tiêu.', 'N + にあたって → nhân dịp dấu mốc', '新年度(しんねんど): năm học mới', ''],
      [],
      ['PHẦN 3: BÀI TẬP LUYỆN TẬP (練習問題)', '', '', '', '', '', ''],
      ['STT', 'Dạng bài', 'Đề bài', 'Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Gợi ý'],
      [1, 'multiple_choice', '卒業（　　）、先生方への感謝の気持ちを伝えたい。', 'に際して', 'にもかかわらず', 'にとって', 'Nhân dịp tốt nghiệp'],
      [2, 'translate', 'Dịch sang tiếng Nhật: Nhân dịp kỷ niệm 10 năm...', '', '', '', '創立10周年'],
      [],
      ['PHẦN 4: ĐÁP ÁN & GIẢI THÍCH (解答と解説)', '', '', '', '', ''],
      ['STT', 'Đáp án', 'Câu hoàn chỉnh / Bài dịch', 'Giải thích chi tiết', 'Lỗi gây nhiễu', 'Tự đánh giá'],
      [1, 'A: に際して', '卒業に際して、先生方への感謝の気持ちを伝えたい。', '「に際して」dùng với N/V-る, mang nghĩa "nhân dịp".', '「にもかかわらず」= dù cho → sai ngữ cảnh.', '★★★★☆'],
      [2, '会社設立10周年にあたって、大きなパーティーを開催します。', '会社設立10周年にあたって...', 'にあたって/に際して đều đúng.', 'Không dùng のとき vì trang trọng.', '★★☆☆☆'],
    ];
    const wsB1 = XLSX.utils.aoa_to_sheet(b1Data);
    wsB1['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 40 }, { wch: 35 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsB1, 'Bai_01');

    XLSX.writeFile(wb, 'Mau_bai_hoc_ngu_phap_JLPT_N2.xlsx');
    toast('Đã tải file mẫu', 'success');
  };

  const parseSheet = (ws: XLSX.WorkSheet, sheetName: string, sortOrder: number, source: string): Lesson | null => {
    try {
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
      const get = (r: number, c: number): string => String(rows[r]?.[c] ?? '').trim();

      // Find section rows by scanning for section headers
      let part1Row = -1, part2Row = -1, part3Row = -1, part4Row = -1;
      for (let i = 0; i < rows.length; i++) {
        const cell = String(rows[i]?.[0] ?? '').toUpperCase();
        if (cell.includes('PHẦN 1') || cell.includes('PHAN 1') || cell.includes('CẤU TRÚC')) { part1Row = i; }
        if (cell.includes('PHẦN 2') || cell.includes('PHAN 2') || cell.includes('VÍ DỤ') || cell.includes('例文')) { part2Row = i; }
        if (cell.includes('PHẦN 3') || cell.includes('PHAN 3') || cell.includes('BÀI TẬP') || cell.includes('練習')) { part3Row = i; }
        if (cell.includes('PHẦN 4') || cell.includes('PHAN 4') || cell.includes('ĐÁP ÁN') || cell.includes('解答')) { part4Row = i; }
      }

      // Parse Part 1: key-value rows after header
      let title = '', meaning = '', connectionRule = '', notes = '', distinction = '', src = source;
      const startP1 = part1Row >= 0 ? part1Row + 1 : 1;
      const endP1 = part2Row >= 0 ? part2Row : Math.min(startP1 + 8, rows.length);
      for (let i = startP1; i < endP1; i++) {
        const key = get(i, 0).toLowerCase();
        const val = get(i, 1);
        if (!val) continue;
        if (key.includes('nguồn') || key.includes('nguon')) src = val;
        else if (key.includes('tên ngữ pháp') || key.includes('ten ngu phap') || key.includes('ngữ pháp')) title = val;
        else if (key.includes('ý nghĩa') || key.includes('y nghia')) meaning = val;
        else if (key.includes('quy tắc') || key.includes('接続') || key.includes('liên kết')) connectionRule = val;
        else if (key.includes('lưu ý') || key.includes('注意') || key.includes('lu y')) notes = val;
        else if (key.includes('phân biệt') || key.includes('phan biet')) distinction = val;
      }
      if (!title) title = sheetName.replace(/_/g, ' ');

      // Parse Part 2: examples (skip header row)
      const examples: LessonExample[] = [];
      if (part2Row >= 0) {
        const dataStart = part2Row + 2; // skip header
        const dataEnd = part3Row >= 0 ? part3Row : Math.min(dataStart + 10, rows.length);
        for (let i = dataStart; i < dataEnd; i++) {
          const stt = Number(get(i, 0));
          if (!stt || isNaN(stt)) continue;
          examples.push({
            stt,
            japanese: get(i, 1),
            vietnamese: get(i, 2),
            analysis: get(i, 3),
            vocabulary: get(i, 4),
            note: get(i, 5),
          });
        }
      }

      // Parse Part 3: exercises
      const exercises: LessonExercise[] = [];
      if (part3Row >= 0) {
        const dataStart = part3Row + 2;
        const dataEnd = part4Row >= 0 ? part4Row : Math.min(dataStart + 10, rows.length);
        for (let i = dataStart; i < dataEnd; i++) {
          const stt = Number(get(i, 0));
          if (!stt || isNaN(stt)) continue;
          const rawType = get(i, 1).toLowerCase();
          let type: ExerciseType = 'multiple_choice';
          if (rawType.includes('conjug') || rawType.includes('chia')) type = 'conjugation';
          else if (rawType.includes('arrang') || rawType.includes('sắp xếp') || rawType.includes('sap xep')) type = 'arrange';
          else if (rawType.includes('trans') || rawType.includes('dịch')) type = 'translate';
          exercises.push({
            stt,
            type,
            question: get(i, 2),
            optionA: get(i, 3),
            optionB: get(i, 4),
            optionC: get(i, 5),
            optionD: get(i, 6),
            hint: get(i, 7) || get(i, 6),
          });
        }
      }

      // Parse Part 4: answers
      const answers: LessonAnswer[] = [];
      if (part4Row >= 0) {
        const dataStart = part4Row + 2;
        for (let i = dataStart; i < rows.length; i++) {
          const stt = Number(get(i, 0));
          if (!stt || isNaN(stt)) continue;
          answers.push({
            stt,
            answer: get(i, 1),
            fullSentence: get(i, 2),
            explanation: get(i, 3),
            commonErrors: get(i, 4),
            selfAssess: get(i, 5),
          });
        }
      }

      return {
        id: generateId('lesson'),
        title,
        source: src,
        sheetId: sheetName,
        meaning,
        connectionRule,
        notes,
        distinction,
        examples,
        exercises,
        answers,
        sortOrder,
        createdAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('Parse error for sheet', sheetName, e);
      return null;
    }
  };

  const parseFile = (file: File) => {
    setFileName(file.name);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Try to read Danh_muc sheet for ordered list
        const dmSheet = wb.Sheets['Danh_muc'] || wb.Sheets['danh_muc'] || wb.Sheets[wb.SheetNames[0]];
        const dmRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(dmSheet, { defval: '' });

        const lessonSheetOrder: { name: string; order: number }[] = [];
        dmRows.forEach((row, idx) => {
          const sheetName = String(row['Tên sheet bài học'] ?? row['ten_sheet'] ?? '').trim();
          if (sheetName && wb.Sheets[sheetName]) {
            lessonSheetOrder.push({ name: sheetName, order: idx + 1 });
          }
        });

        // If no Danh_muc mapping, fall back to all sheets except Danh_muc
        if (lessonSheetOrder.length === 0) {
          wb.SheetNames
            .filter((n) => !n.toLowerCase().includes('danh') && !n.toLowerCase().includes('muc_luc'))
            .forEach((n, idx) => lessonSheetOrder.push({ name: n, order: idx + 1 }));
        }

        const lessons: Lesson[] = [];
        lessonSheetOrder.forEach(({ name, order }) => {
          const ws = wb.Sheets[name];
          if (!ws) return;
          const lesson = parseSheet(ws, name, order, file.name);
          if (lesson) lessons.push(lesson);
        });

        if (lessons.length === 0) {
          toast('Không tìm thấy bài học hợp lệ trong file', 'error');
        } else {
          setParsedLessons(lessons);
          toast(`Đã phân tích ${lessons.length} bài học`, 'success');
        }
      } catch {
        toast('Không thể đọc file Excel', 'error');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 animate-slide-up safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <FileSpreadsheet size={22} className="text-indigo-600" /> Nhập bài học từ Excel
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <div className="mb-4 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-700 space-y-1">
          <p className="font-semibold">Định dạng file Excel chuẩn:</p>
          <p>• Sheet <strong>Danh_muc</strong>: STT | Tên ngữ pháp | Ý nghĩa | Tên sheet</p>
          <p>• Mỗi sheet bài học: 4 phần theo cấu trúc mẫu</p>
        </div>

        <button onClick={downloadTemplate}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
          <Download size={18} /> Tải file Excel giáo án mẫu
        </button>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-8 transition-all ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
        >
          <Upload size={32} className={`mb-2 ${dragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
          <p className="text-sm font-medium text-slate-600">{parsing ? 'Đang phân tích...' : (fileName || 'Kéo thả hoặc chọn file Excel')}</p>
          <p className="mt-1 text-xs text-slate-400">Hỗ trợ .xlsx, .xls</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} className="hidden" />
        </div>

        {parsedLessons.length > 0 && (
          <>
            <div className="mb-3 space-y-1.5">
              {parsedLessons.map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2">
                  <CheckCircle2 size={16} className="shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-indigo-800 truncate">{l.title || l.sheetId}</p>
                    <p className="text-[10px] text-indigo-500">{l.examples.length} ví dụ · {l.exercises.length} bài tập</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { onImport(parsedLessons); onClose(); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
            >
              <FileSpreadsheet size={18} /> Nhập {parsedLessons.length} bài học
            </button>
          </>
        )}
      </div>
    </div>
  );
}
