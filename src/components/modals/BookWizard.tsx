/**
 * BookWizard - 4-step wizard for family book generation
 *
 * Steps: Scope -> Template -> Content Toggles -> Preview & Export
 */

import { useState } from 'react';
import DOMPurify from 'dompurify';
import { X, Book, ChevronLeft, ChevronRight, Download, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchBookData, generateBookHtml, downloadAsHtml, printBook, type BookOptions } from '@/services/bookGenerationService';
import { generateEpub, downloadEpub } from '@/services/epubExportService';
import { useResponsive } from '@/hooks/useResponsive';

interface BookWizardProps {
  treeId: string;
  treeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BookWizard({ treeId, treeName, isOpen, onClose }: BookWizardProps) {
  const { isMobile } = useResponsive();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<BookOptions>({
    scope: 'full',
    template: 'person-by-person',
    includePhotos: true,
    includeLifeEvents: true,
    includeCulturalData: true,
  });
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (step === 3) {
      // Generate preview
      setLoading(true);
      try {
        const data = await fetchBookData(treeId, options);
        const html = generateBookHtml(data.persons || [], options, treeName);
        setPreviewHtml(html);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleExportPdf = () => { printBook(previewHtml); };

  const handleExportHtml = () => { downloadAsHtml(previewHtml, `${treeName}-family-book.html`); };

  const handleExportEpub = async () => {
    const data = await fetchBookData(treeId, options);
    const persons = data.persons || [];
    const chapters = persons.map(p => ({
      title: `${p.firstName} ${p.lastName}`,
      content: `<p>${p.birthDate ? `Born: ${p.birthDate}` : ''}${p.birthPlace ? ` in ${p.birthPlace}` : ''}</p>` +
        (p.occupation ? `<p>Occupation: ${p.occupation}</p>` : '') +
        (p.biography ? `<p>${p.biography}</p>` : ''),
    }));
    const blob = await generateEpub(`${treeName} Family Book`, 'FamNme', chapters);
    downloadEpub(blob, `${treeName}-family-book.epub`);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`} onClick={onClose}>
      <div className={`bg-white shadow-xl flex flex-col ${isMobile ? 'w-full rounded-t-xl rounded-b-none max-h-[90dvh] overflow-hidden' : 'w-[600px] max-w-[95vw] max-h-[90vh] rounded-xl'}`} style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-[#2F3E8F]" />
            <h2 className="font-semibold">Book Generation Wizard</h2>
            <span className="text-xs text-gray-400">Step {step}/4</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5">
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-medium">Select Scope</h3>
              {(['full', 'ancestors', 'descendants'] as const).map(s => (
                <label key={s} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${options.scope === s ? 'border-blue-500 bg-[#E8EDFF]' : ''}`}>
                  <input type="radio" name="scope" checked={options.scope === s} onChange={() => setOptions(o => ({ ...o, scope: s }))} />
                  <span className="capitalize">{s === 'full' ? 'Full Tree' : `${s.charAt(0).toUpperCase() + s.slice(1)} Only`}</span>
                </label>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-medium">Select Template</h3>
              {([
                { value: 'person-by-person', label: 'Person by Person' },
                { value: 'generational', label: 'By Generation' },
                { value: 'timeline', label: 'Timeline' },
              ] as const).map(t => (
                <label key={t.value} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${options.template === t.value ? 'border-blue-500 bg-[#E8EDFF]' : ''}`}>
                  <input type="radio" name="template" checked={options.template === t.value} onChange={() => setOptions(o => ({ ...o, template: t.value }))} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-medium">Content Options</h3>
              {[
                { key: 'includePhotos', label: 'Include Photos' },
                { key: 'includeLifeEvents', label: 'Include Life Events' },
                { key: 'includeCulturalData', label: 'Include Cultural Data (Gotra, Religion)' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                  <input type="checkbox" checked={options[opt.key as keyof BookOptions] as boolean}
                    onChange={e => setOptions(o => ({ ...o, [opt.key]: e.target.checked }))} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Preview & Export</h3>
              {loading ? (
                <p className="text-gray-500">Generating preview...</p>
              ) : (
                <>
                  <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto bg-gray-50">
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml.replace(/<style>[\s\S]*?<\/style>/, '')) }} />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleExportPdf}><Printer className="w-4 h-4 mr-1" /> Print / PDF</Button>
                    <Button variant="outline" onClick={handleExportHtml}><Download className="w-4 h-4 mr-1" /> HTML</Button>
                    <Button variant="outline" onClick={handleExportEpub}><FileText className="w-4 h-4 mr-1" /> ePub</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between px-5 py-3 border-t bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={() => setStep(s => Math.max(s - 1, 1))} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 && (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
