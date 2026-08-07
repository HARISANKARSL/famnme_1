/**
 * CulturalEvolutionPanel - Occupation/caste distribution per generation
 */

import { useState, useEffect } from 'react';
import { X, Globe, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface CulturalEvolutionPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CulturalEvolutionPanel({ treeId, isOpen, onClose }: CulturalEvolutionPanelProps) {
  const [data, setData] = useState<Array<{ generation: number; occupation: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/tree/${treeId}/statistics/advanced`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d.occupationByGeneration || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  if (!isOpen) return null;

  const genMap = new Map<number, Record<string, number>>();
  for (const entry of data) {
    if (!genMap.has(entry.generation)) genMap.set(entry.generation, {});
    genMap.get(entry.generation)![entry.occupation] = entry.count;
  }
  const chartData = Array.from(genMap.entries()).map(([gen, occupations]) => ({ generation: `Gen ${gen}`, ...occupations }));
  const allOccupations = [...new Set(data.map(e => e.occupation))].slice(0, 6);
  const colors = ['#2F3E8F', '#8b5cf6', '#10b981', '#60a5fa', '#ef4444', '#3b82f6'];

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-emerald-50 to-emerald-100">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Cultural Evolution</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-emerald-200 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No occupation data available. Add occupations to see evolution patterns.</p>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Occupation Distribution by Generation</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="generation" />
                <YAxis />
                <Tooltip />
                <Legend />
                {allOccupations.map((occ, i) => (
                  <Bar key={occ} dataKey={occ} fill={colors[i % colors.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
