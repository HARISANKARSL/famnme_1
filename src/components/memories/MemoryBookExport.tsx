/**
 * MemoryBookExport — One-click PDF generation with cover page, TOC, and memories
 * Uses browser print API with a styled print layout
 */

import { useState, useRef } from 'react';
import { BookOpen, X, Download, Loader2 } from 'lucide-react';
import type { Memory } from '@/types';

interface MemoryBookExportProps {
  memories: Memory[];
  treeName: string;
  onClose: () => void;
}

type LayoutTemplate = 'classic' | 'modern';

export function MemoryBookExport({ memories, treeName, onClose }: MemoryBookExportProps) {
  const [template, setTemplate] = useState<LayoutTemplate>('classic');
  const [generating, setGenerating] = useState(false);
  const [includeTextContent, setIncludeTextContent] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const mediaMemories = memories.filter(m => m.mediaUrl || m.textContent || m.files?.[0]?.textContent);

  const handleGenerate = () => {
    setGenerating(true);

    // Small delay so the print content renders
    setTimeout(() => {
      const printContent = printRef.current;
      if (!printContent) { setGenerating(false); return; }

      const printWindow = window.open('', '_blank');
      if (!printWindow) { setGenerating(false); return; }

      const isClassic = template === 'classic';
      const fontFamily = isClassic ? "'Georgia', 'Times New Roman', serif" : "'Segoe UI', 'Helvetica Neue', sans-serif";
      const titleColor = isClassic ? '#3D2E1F' : '#1a1a2e';
      const accentColor = isClassic ? '#2F3E8F' : '#6366f1';

      printWindow.document.write(`<!DOCTYPE html><html><head><title>${treeName} - Memory Book</title>
<style>
  @media print { @page { margin: 1in; size: A4 portrait; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fontFamily}; color: #333; line-height: 1.6; }
  .page-break { page-break-after: always; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 90vh; text-align: center; }
  .cover h1 { font-size: 36px; color: ${titleColor}; margin-bottom: 8px; }
  .cover p { font-size: 16px; color: #888; }
  .cover .line { width: 60px; height: 3px; background: ${accentColor}; margin: 24px auto; border-radius: 2px; }
  .toc { min-height: 50vh; }
  .toc h2 { font-size: 24px; color: ${titleColor}; margin-bottom: 24px; }
  .toc-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #ddd; font-size: 14px; }
  .toc-item .title { color: #333; }
  .toc-item .page { color: #999; }
  .memory-page { min-height: 70vh; padding-top: 16px; }
  .memory-page h3 { font-size: 22px; color: ${titleColor}; margin-bottom: 8px; }
  .memory-meta { font-size: 12px; color: #888; margin-bottom: 16px; }
  .memory-img { max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 8px; margin-bottom: 16px; }
  .memory-text { font-size: 14px; line-height: 1.8; white-space: pre-wrap; color: #444; }
  .memory-tags { font-size: 11px; color: #999; margin-top: 12px; }
  .footer { text-align: center; font-size: 10px; color: #bbb; margin-top: 40px; }
</style></head><body>`);

      // Cover page
      printWindow.document.write(`
        <div class="cover page-break">
          <h1>${treeName}</h1>
          <div class="line"></div>
          <p>A Family Memory Book</p>
          <p style="margin-top:8px;font-size:13px;color:#aaa">${mediaMemories.length} memories · Generated ${new Date().toLocaleDateString()}</p>
        </div>
      `);

      // Table of Contents
      printWindow.document.write(`<div class="toc page-break"><h2>Table of Contents</h2>`);
      mediaMemories.forEach((m, i) => {
        const date = m.dateTaken ? new Date(m.dateTaken).toLocaleDateString() : '';
        printWindow.document.write(`<div class="toc-item"><span class="title">${i + 1}. ${m.title}</span><span class="page">${date}</span></div>`);
      });
      printWindow.document.write(`</div>`);

      // Memory pages
      mediaMemories.forEach((m, i) => {
        const isLast = i === mediaMemories.length - 1;
        printWindow.document.write(`<div class="memory-page ${isLast ? '' : 'page-break'}">`);
        printWindow.document.write(`<h3>${m.title}</h3>`);

        const metaParts = [];
        if (m.dateTaken) metaParts.push(new Date(m.dateTaken).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
        if (m.placeTaken) metaParts.push(m.placeTaken);
        if (m.category) metaParts.push(m.category);
        if (metaParts.length) printWindow.document.write(`<p class="memory-meta">${metaParts.join(' · ')}</p>`);

        if (m.mediaUrl) printWindow.document.write(`<img class="memory-img" src="${m.mediaUrl}" alt="${m.title}" crossorigin="anonymous" />`);
        if (m.description) printWindow.document.write(`<p class="memory-text">${m.description}</p>`);
        if (includeTextContent && (m.textContent || m.files?.[0]?.textContent)) printWindow.document.write(`<p class="memory-text">${m.textContent || m.files?.[0]?.textContent}</p>`);

        const tagged = m.taggedPersons || (m as any).taggedPeople || m.files?.[0]?.taggedPeople || m.files?.[0]?.taggedPersons || [];
        if (tagged.length) {
          const names = tagged.map((p: any) => p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()).join(', ');
          printWindow.document.write(`<p class="memory-tags">People: ${names}</p>`);
        }

        printWindow.document.write(`</div>`);
      });

      printWindow.document.write(`<div class="footer">Created with FamNme</div>`);
      printWindow.document.write(`</body></html>`);
      printWindow.document.close();

      // Wait for images to load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setGenerating(false);
        }, 500);
      };
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md mx-3 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-2xl border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#E8EDFF] dark:bg-[#2F3E8F]/10">
              <BookOpen className="w-4 h-4 text-[#2F3E8F]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Export Memory Book</h2>
              <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{mediaMemories.length} memories will be included</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
            <X className="w-4 h-4 text-[#8B7355] dark:text-[#999]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[12px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] mb-2">Layout Template</p>
            <div className="flex gap-2">
              {(['classic', 'modern'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                    template === t
                      ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/10'
                      : 'border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:border-[#2F3E8F]/30'
                  }`}
                >
                  <p className={`text-[13px] font-semibold ${template === t ? 'text-[#2F3E8F]' : 'text-[#3D2E1F] dark:text-[#f5f5f5]'}`}>
                    {t === 'classic' ? 'Classic' : 'Modern'}
                  </p>
                  <p className="text-[10px] text-[#8B7355] dark:text-[#999] mt-0.5">
                    {t === 'classic' ? 'Serif, warm tones' : 'Sans-serif, clean'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTextContent}
              onChange={(e) => setIncludeTextContent(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F]"
            />
            <span className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5]">Include text/story content</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <button onClick={onClose}
            className="h-9 px-4 rounded-lg text-[13px] font-medium text-[#8B7355] dark:text-[#999] border border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:bg-black/[0.02] transition-all">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || mediaMemories.length === 0}
            className="h-9 px-5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-40 transition-all hover:brightness-110 flex items-center gap-2"
            style={{ background: 'linear-gradient(180deg, #2F3E8F, #25327A)' }}
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Download className="w-4 h-4" /> Generate PDF</>
            )}
          </button>
        </div>

        {/* Hidden print content */}
        <div ref={printRef} className="hidden" />
      </div>
    </div>
  );
}
