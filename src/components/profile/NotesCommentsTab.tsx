import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, AlertTriangle, Hash, Send, Trash2, Check, Loader2, Plus, X } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';
import { getPersonAlerts, createAlert, resolveAlert, deleteAlert } from '@/services/sourceApiService';
import { getCustomFacts, addCustomFact, deleteCustomFact } from '@/services/phase1ApiService';
import type { AlertNote, CustomFact } from '@/types';

interface NotesCommentsTabProps {
  personId: string;
  personName: string;
  treeId: string;
}

interface Comment {
  id: string;
  text: string;
  userName: string;
  createdAt: string;
  userId?: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  } catch {
    return dateStr;
  }
}

export function NotesCommentsTab({ personId, personName: _personName, treeId }: NotesCommentsTabProps) {
  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Alert notes
  const [alerts, setAlerts] = useState<AlertNote[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertSeverity, setNewAlertSeverity] = useState<string>('info');
  const [showAddAlert, setShowAddAlert] = useState(false);

  // Custom facts
  const [facts, setFacts] = useState<CustomFact[]>([]);
  const [factsLoading, setFactsLoading] = useState(true);
  const [showAddFact, setShowAddFact] = useState(false);
  const [newFactLabel, setNewFactLabel] = useState('');
  const [newFactValue, setNewFactValue] = useState('');

  // Load comments
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/tree/${treeId}/person/${personId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : data.comments ?? []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [personId, treeId]);

  // Load alerts & facts
  useEffect(() => {
    fetchComments();
    getPersonAlerts(personId).then(setAlerts).catch(() => {}).finally(() => setAlertsLoading(false));
    getCustomFacts(personId).then(setFacts).catch(() => {}).finally(() => setFactsLoading(false));
  }, [personId, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/tree/${treeId}/person/${personId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      const token = getAuthToken();
      await fetch(`${API_BASE_URL}/comment/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete comment failed:', err);
    }
  };

  const handleAddAlert = async () => {
    if (!newAlertMsg.trim()) return;
    try {
      const alert = await createAlert(personId, treeId, { message: newAlertMsg.trim(), severity: newAlertSeverity });
      setAlerts(prev => [alert, ...prev]);
      setNewAlertMsg('');
      setShowAddAlert(false);
    } catch (err) {
      console.error('Create alert failed:', err);
    }
  };

  const handleAddFact = async () => {
    if (!newFactLabel.trim() || !newFactValue.trim()) return;
    try {
      const fact = await addCustomFact(personId, treeId, { factType: newFactLabel.trim(), factValue: newFactValue.trim() });
      setFacts(prev => [fact, ...prev]);
      setNewFactLabel('');
      setNewFactValue('');
      setShowAddFact(false);
    } catch (err) {
      console.error('Create fact failed:', err);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'error': return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 border-[#2F3E8F]/30 dark:border-[#2F3E8F]/20 text-[#2F3E8F] dark:text-[#8CA0FF]';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* Comments Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E2DBCE] mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Comments
        </h3>
        {commentsLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.userName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{relativeTime(c.createdAt)}</span>
                      <button onClick={() => handleDeleteComment(c.id)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-stone-850 dark:bg-stone-900 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="px-3 py-2 bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A] disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Alert Notes Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E2DBCE] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Alert Notes
          </h3>
          <button onClick={() => setShowAddAlert(!showAddAlert)} className="text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C] dark:hover:text-[#A8C0FF] flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {showAddAlert && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-lg border border-gray-200 dark:border-[#2a2a2a] space-y-2">
            <input
              type="text"
              value={newAlertMsg}
              onChange={e => setNewAlertMsg(e.target.value)}
              placeholder="Alert message..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-stone-850 dark:bg-stone-900 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
            />
            <div className="flex gap-2 items-center">
              <select
                value={newAlertSeverity}
                onChange={e => setNewAlertSeverity(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-stone-850 dark:bg-stone-900 dark:text-gray-200 rounded-lg"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <button onClick={handleAddAlert} className="px-3 py-1 text-sm bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A]">Save</button>
              <button onClick={() => setShowAddAlert(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {alertsLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No alert notes</p>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.noteId} className={`p-3 rounded-lg border ${severityColor(a.severity)} flex items-start justify-between`}>
                <div>
                  <p className="text-sm">{a.message}</p>
                  {a.isResolved && <span className="text-xs opacity-60">Resolved</span>}
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
                  {!a.isResolved && (
                    <button onClick={async () => { const updated = await resolveAlert(a.noteId); setAlerts(prev => prev.map(x => x.noteId === a.noteId ? updated : x)); }} className="p-1 hover:bg-white/50 rounded">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={async () => { await deleteAlert(a.noteId); setAlerts(prev => prev.filter(x => x.noteId !== a.noteId)); }} className="p-1 hover:bg-white/50 rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Custom Facts Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E2DBCE] flex items-center gap-2">
            <Hash className="h-5 w-5" /> Custom Facts
          </h3>
          <button onClick={() => setShowAddFact(!showAddFact)} className="text-sm text-[#2F3E8F] dark:text-[#8CA0FF] hover:text-[#8B5E3C] dark:hover:text-[#A8C0FF] flex items-center gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {showAddFact && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-[#1A1A1A] rounded-lg border border-gray-200 dark:border-[#2a2a2a] flex gap-2 flex-wrap">
            <input
              type="text"
              value={newFactLabel}
              onChange={e => setNewFactLabel(e.target.value)}
              placeholder="Label"
              className="flex-1 min-w-[100px] px-3 py-2 text-sm border border-gray-300 dark:border-stone-850 dark:bg-stone-900 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
            />
            <input
              type="text"
              value={newFactValue}
              onChange={e => setNewFactValue(e.target.value)}
              placeholder="Value"
              className="flex-1 min-w-[100px] px-3 py-2 text-sm border border-gray-300 dark:border-stone-850 dark:bg-stone-900 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2F3E8F]"
            />
            <button onClick={handleAddFact} className="px-3 py-2 text-sm bg-[#2F3E8F] text-white rounded-lg hover:bg-[#25327A]">Save</button>
            <button onClick={() => setShowAddFact(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
        )}

        {factsLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : facts.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No custom facts</p>
        ) : (
          <div className="space-y-2">
            {facts.map(f => (
              <div key={f.factId} className="flex items-center justify-between bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-[#2a2a2a] p-3">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.factType}: </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{f.factValue}</span>
                </div>
                <button
                  onClick={async () => { await deleteCustomFact(f.factId); setFacts(prev => prev.filter(x => x.factId !== f.factId)); }}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
