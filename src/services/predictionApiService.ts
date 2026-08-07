/**
 * Prediction API Service — Frontend client for prediction CRUD endpoints.
 */

import { API_BASE_URL } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

function getHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface SavedPrediction {
  predictionId: string
  userId: string
  personName: string
  dateOfBirth: string
  timeOfBirth: string | null
  placeOfBirth: string | null
  gender: string
  zodiacSign: string
  birthStar: string
  predictionDate: string
  predictionData: string // JSON-stringified prediction result
  createdAt: string
}

export async function savePrediction(input: {
  personName: string
  dateOfBirth: string
  timeOfBirth?: string
  placeOfBirth?: string
  gender: string
  zodiacSign: string
  birthStar: string
  predictionData: string
}): Promise<SavedPrediction> {
  const res = await fetch(`${API_BASE_URL}/predictions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to save prediction')
  const data = await res.json() as { prediction: SavedPrediction }
  return data.prediction
}

export async function fetchPredictions(
  limit = 50,
  offset = 0,
): Promise<{ predictions: SavedPrediction[]; total: number }> {
  const res = await fetch(`${API_BASE_URL}/predictions?limit=${limit}&offset=${offset}`, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch predictions')
  return res.json() as Promise<{ predictions: SavedPrediction[]; total: number }>
}

export async function fetchPrediction(id: string): Promise<SavedPrediction> {
  const res = await fetch(`${API_BASE_URL}/predictions/${id}`, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch prediction')
  const data = await res.json() as { prediction: SavedPrediction }
  return data.prediction
}

export async function deletePrediction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/predictions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete prediction')
}

export async function fetchPredictionCount(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/predictions/count`, {
    headers: getHeaders(),
  })
  if (!res.ok) return 0
  const data = await res.json() as { count: number }
  return data.count
}
