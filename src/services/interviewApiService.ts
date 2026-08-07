/**
 * Interview API Service - Frontend client for interview CRUD + media uploads
 */

import { resolveBackendUrl } from '@/config/api';
import type { Interview, InterviewAnswer } from '@/types';

const API_BASE = resolveBackendUrl('/api');

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.message || err.error || 'Request failed');
  }
  return res;
}

// ============================================================================
// Interview CRUD
// ============================================================================

export interface CreateInterviewInput {
  templateId: string;
  templateTitle: string;
  intervieweeName?: string;
  intervieweePersonId?: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    answerText: string;
    sortOrder: number;
  }>;
}

export interface CreateInterviewResult extends Interview {
  // The created interview — answers are uploaded separately
}

export async function createInterview(
  treeId: string,
  input: CreateInterviewInput,
): Promise<CreateInterviewResult> {
  const res = await apiFetch(`/tree/${treeId}/interviews`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchInterviews(
  treeId: string,
): Promise<Interview[]> {
  const res = await apiFetch(`/tree/${treeId}/interviews`);
  const data = await res.json();
  return data.interviews;
}

export async function fetchInterview(
  interviewId: string,
): Promise<{ interview: Interview; answers: InterviewAnswer[] }> {
  const res = await apiFetch(`/interview/${interviewId}`);
  return res.json();
}

export async function deleteInterview(
  interviewId: string,
): Promise<void> {
  await apiFetch(`/interview/${interviewId}`, { method: 'DELETE' });
}

export async function regenerateNarrative(
  interviewId: string,
): Promise<{ narrative: string | null; source: string }> {
  const res = await apiFetch(`/interview/${interviewId}/ai-narrative`, {
    method: 'POST',
  });
  return res.json();
}

// ============================================================================
// Answer Media Uploads
// ============================================================================

export async function uploadAnswerAudio(
  interviewId: string,
  answerId: string,
  audioBlob: Blob,
): Promise<{ audioUrl: string }> {
  const formData = new FormData();
  formData.append('file', new File([audioBlob], 'recording.webm', { type: 'audio/webm' }));

  const res = await fetch(`${API_BASE}/interview/${interviewId}/answer/${answerId}/audio`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload audio');
  return res.json();
}

export async function uploadAnswerPhoto(
  interviewId: string,
  answerId: string,
  photoFile: File,
): Promise<{ photoUrl: string; photoThumbnailUrl?: string }> {
  const formData = new FormData();
  formData.append('file', photoFile);

  const res = await fetch(`${API_BASE}/interview/${interviewId}/answer/${answerId}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}
