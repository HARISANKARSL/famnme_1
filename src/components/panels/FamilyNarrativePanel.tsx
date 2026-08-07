/**
 * FamilyNarrativePanel - Auto-generated family narrative summary
 */

import { useState, useEffect } from 'react';
import { X, BookOpen, Loader2, Copy, Download, Check } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface FamilyNarrativePanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FamilyNarrativePanel({ treeId, isOpen, onClose }: FamilyNarrativePanelProps) {
  const [narrative, setNarrative] = useState<{ narrative: string; paragraphs: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/tree/${treeId}/reports/family-narrative`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setNarrative)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  const handleCopy = () => {
    if (narrative) {
      navigator.clipboard.writeText(narrative.narrative);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = () => {
    if (!narrative) return;
    const blob = new Blob([narrative.narrative], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-narrative.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-sky-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#2F3E8F]" />
          <h2 className="font-semibold text-gray-900">Family Narrative</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 hover:bg-blue-200 rounded" title="Copy">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={handleExport} className="p-1.5 hover:bg-blue-200 rounded" title="Export">
            <Download className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-blue-200 rounded">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !narrative ? (
          <p className="text-sm text-gray-500 text-center py-8">Unable to generate narrative.</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            {narrative.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed mb-4">{p}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
