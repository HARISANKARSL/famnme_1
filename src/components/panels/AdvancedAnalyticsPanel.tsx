/**
 * AdvancedAnalyticsPanel - Age gap histogram + surname evolution charts
 */

import { useState, useEffect } from 'react';
import { X, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface AdvancedStats {
  ageGapHistogram: Array<{ bucket: string; count: number }>;
  surnameByGeneration: Array<{ generation: number; surname: string; count: number }>;
  occupationByGeneration: Array<{ generation: number; occupation: string; count: number }>;
}

interface AdvancedAnalyticsPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedAnalyticsPanel({ treeId, isOpen, onClose }: AdvancedAnalyticsPanelProps) {
  const [data, setData] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/tree/${treeId}/statistics/advanced`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  if (!isOpen) return null;

  // Transform surname data into grouped bar chart format
  const surnameChartData = data ? (() => {
    const genMap = new Map<number, Record<string, number>>();
    for (const entry of data.surnameByGeneration) {
      if (!genMap.has(entry.generation)) genMap.set(entry.generation, {});
      genMap.get(entry.generation)![entry.surname] = entry.count;
    }
    return Array.from(genMap.entries()).map(([gen, surnames]) => ({ generation: `Gen ${gen}`, ...surnames }));
  })() : [];

  const allSurnames = data ? [...new Set(data.surnameByGeneration.map(e => e.surname))].slice(0, 5) : [];
  const colors = ['#2F3E8F', '#8b5cf6', '#10b981', '#60a5fa', '#ef4444'];

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-sky-50 to-sky-100">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-600" />
          <h2 className="font-semibold text-gray-900">Advanced Analytics</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-sky-200 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data ? (
          <p className="text-sm text-gray-500 text-center py-8">No data available.</p>
        ) : (
          <>
            {/* Age Gap Histogram */}
            {data.ageGapHistogram.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Parent-Child Age Gap Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.ageGapHistogram}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2F3E8F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Surname Evolution */}
            {surnameChartData.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Surname Frequency by Generation</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={surnameChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="generation" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {allSurnames.map((surname, i) => (
                      <Bar key={surname} dataKey={surname} stackId="a" fill={colors[i % colors.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
