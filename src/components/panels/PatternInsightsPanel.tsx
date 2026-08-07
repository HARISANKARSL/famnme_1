/**
 * PatternInsightsPanel - Ancestral pattern detection visualization
 *
 * Shows:
 * - Average marriage age by generation (line chart)
 * - Longevity trends by generation (line chart)
 * - Naming cycles table
 */

import { useState, useEffect } from 'react';
import { X, TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

interface PatternResults {
  marriageAgeByGeneration: Array<{ generation: number; averageAge: number; count: number }>;
  longevityByGeneration: Array<{ generation: number; averageLifespan: number; count: number }>;
  namingCycles: Array<{ name: string; count: number; generations: number[] }>;
}

interface PatternInsightsPanelProps {
  treeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PatternInsightsPanel({ treeId, isOpen, onClose }: PatternInsightsPanelProps) {
  const [data, setData] = useState<PatternResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const token = getAuthToken();
    fetch(`${API_BASE_URL}/tree/${treeId}/patterns`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, treeId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-xl z-50 flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-violet-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-600" />
          <h2 className="font-semibold text-gray-900">Pattern Insights</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-violet-200 rounded">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : !data ? (
          <p className="text-sm text-gray-500 text-center py-8">No pattern data available.</p>
        ) : (
          <>
            {/* Marriage Age by Generation */}
            {data.marriageAgeByGeneration.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Average Marriage Age by Generation</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.marriageAgeByGeneration}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="generation" label={{ value: 'Generation', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Age', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v) => `${v} years`} />
                    <Line type="monotone" dataKey="averageAge" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Longevity Trends */}
            {data.longevityByGeneration.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Longevity by Generation</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.longevityByGeneration}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="generation" label={{ value: 'Generation', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Years', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v) => `${v} years`} />
                    <Line type="monotone" dataKey="averageLifespan" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Naming Cycles */}
            {data.namingCycles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">Recurring Names</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Name</th>
                        <th className="px-3 py-2 text-center text-gray-600">Count</th>
                        <th className="px-3 py-2 text-left text-gray-600">Generations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.namingCycles.map(nc => (
                        <tr key={nc.name} className="border-t">
                          <td className="px-3 py-2 capitalize font-medium">{nc.name}</td>
                          <td className="px-3 py-2 text-center">{nc.count}</td>
                          <td className="px-3 py-2 text-gray-500">{nc.generations.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.marriageAgeByGeneration.length === 0 && data.longevityByGeneration.length === 0 && data.namingCycles.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                Not enough data to detect patterns. Add more birth dates, marriage dates, and death dates to see insights.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
