/**
 * Institution Hooks
 *
 * React hooks for the Celebrate Culture microservice.
 * Uses plain React (useState + useEffect + useCallback) — no external query library.
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  AddToMyListPayload,
  InstitutionTag,
  JourneySearchPayload,
  JourneyWeaveCreatePayload,
  TempleDetailsPayload,
  UpdateInstitutionTagPayload,
} from "@/types";
import {
  getInstitutions,
  getInstitutionDetail,
  getMyInstitutions,
  addInstitutionToMyList,
  removeInstitutionFromMyList,
  updateInstitutionTag,
  getInstitutionTags,
  getInstitutionMemories,
  addInstitutionMemory,
  deleteInstitutionMemory,
  generateInstitutionMemoryUploadUrls,
  getInstitutionMembers,
  tagFamilyMember,
  removeFamilyMemberTag,
  updateTaggedFamilyMember,
  type GetInstitutionsOptions,
  type GetMemoriesOptions,
  type CreateMemoryPayload,
  type MemoryUploadUrlFileRequest,
  type TagMemberPayload,
  type UpdateMemberPayload,
  searchJourneyTemples,

  createJourneyWeave,
  getJourneyWeave,
  getTempleDetails,
  postTempleDetails,
  refreshTempleDetails,
} from "@/services/institutionService";

// ── Generic State Shapes ─────────────────────────────────────────────────────

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

interface MutationState<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>
  loading: boolean
  error: string | null
  reset: () => void
}

// ── Generic helpers ───────────────────────────────────────────────────────────

function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): QueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetcher()
      .then(res => { if (!cancelled) setData(res) })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Something went wrong') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, refetch }
}

function useMutation<TData, TVariables>(
  mutator: (variables: TVariables) => Promise<TData>
): MutationState<TData, TVariables> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => setError(null), [])

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await mutator(variables)
      return result
    } catch (err: any) {
      // Extract API response message if available, fall back to err.message
      const message =
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong'
      setError(message)
      // Re-throw so callers using try/catch also get the real message
      throw err
    } finally {
      setLoading(false)
    }
  }, [mutator])

  return { mutate, loading, error, reset }
}

// ── Institution Discovery ─────────────────────────────────────────────────────

/** Search / filter institutions. Re-fetches whenever options change. */
export function useInstitutions(options?: GetInstitutionsOptions) {
  return useQuery(
    () => getInstitutions(options),
    [
      options?.q,
      options?.lat,
      options?.lng,
      options?.filter,
      options?.religion,
      options?.type,
      options?.page,
      options?.limit,
    ]
  )
}

/** Get a single institution's full detail. */
export function useInstitutionDetail(id: string) {
  return useQuery(
    () => getInstitutionDetail(id),
    [id]
  )
}

// ── My Institutions ───────────────────────────────────────────────────────────

/** Get the current user's saved institution list. */
export function useMyInstitutions(deps: unknown[] = []) {
  return useQuery(getMyInstitutions, deps)
}

/** Add an institution to the current user's list. */
export function useAddInstitutionToMyList() {
  return useMutation((payload: AddToMyListPayload) =>
    addInstitutionToMyList(payload)
  );
}

/** Remove an institution from the current user's list. */
export function useRemoveInstitutionFromMyList() {
  return useMutation((institutionId: string) => removeInstitutionFromMyList(institutionId))
}

/** Update the tag on a saved institution. */
export function useUpdateInstitutionTag() {
  return useMutation(
    ({
      institutionId,
      payload,
    }: {
      institutionId: string;
      payload: UpdateInstitutionTagPayload;
    }) => updateInstitutionTag(institutionId, payload)
  );
}

// ── Institution Tags ──────────────────────────────────────────────────────────

/** Get predefined filter tags. Fetched once — tags rarely change. */
export function useInstitutionTags() {
  return useQuery(getInstitutionTags, [])
}

// ── Memories ──────────────────────────────────────────────────────────────────

/** Get memories linked to an institution. */
export function useInstitutionMemories(institutionId: string, options?: GetMemoriesOptions) {
  return useQuery(
    () => getInstitutionMemories(institutionId, options),
    [institutionId, options?.page, options?.limit]
  )
}

/** Add a memory to an institution. */
export function useAddInstitutionMemory() {
  return useMutation(
    ({ institutionId, payload }: { institutionId: string; payload: CreateMemoryPayload }) =>
      addInstitutionMemory(institutionId, payload)
  )
}

/** Generate presigned upload URLs for memory media. */
export function useGenerateInstitutionMemoryUploadUrls() {
  return useMutation(
    ({ institutionId, files }: { institutionId: string; files: MemoryUploadUrlFileRequest[] }) =>
      generateInstitutionMemoryUploadUrls(institutionId, files)
  )
}

/** Delete a memory from an institution. */
export function useDeleteInstitutionMemory() {
  return useMutation(
    ({ institutionId, memoryId }: { institutionId: string; memoryId: string }) =>
      deleteInstitutionMemory(institutionId, memoryId)
  )
}

// ── Family Members at Institution ─────────────────────────────────────────────

/** Get family members tagged at an institution. */
export function useInstitutionMembers(institutionId: string) {
  return useQuery(
    () => {
      if (!institutionId) return Promise.resolve({ success: true, data: [] })
      return getInstitutionMembers(institutionId)
    },
    [institutionId]
  )
}

/** Tag a family member at an institution. */
export function useTagFamilyMember() {
  return useMutation(
    ({ institutionId, payload }: { institutionId: string; payload: TagMemberPayload }) =>
      tagFamilyMember(institutionId, payload)
  )
}

/** Remove a family member tag from an institution. */
export function useRemoveFamilyMemberTag() {
  return useMutation(
    ({ institutionId, memberId }: { institutionId: string; memberId: string }) =>
      removeFamilyMemberTag(institutionId, memberId)
  )
}

/** Update a tagged family member's info at an institution. */
export function useUpdateTaggedFamilyMember() {
  return useMutation(
    ({ institutionId, memberId, payload }: { institutionId: string; memberId: string; payload: UpdateMemberPayload }) =>
      updateTaggedFamilyMember(institutionId, memberId, payload)
  )
}

// Journey Ai Apis
// ── AI Journey Search ─────────────────────────────────────────────────────

/** Search temples using AI Journey API. */
export function useSearchJourneyTemples(
  payload?: JourneySearchPayload,
) {
  return useQuery(
    () => {
      if (
        !payload ||
        !payload.query
      ) {
        return Promise.resolve([])
      }

      return searchJourneyTemples(
        payload,
      )
    },
    [
      payload?.query,
      payload?.lat,
      payload?.lng,
      payload?.page,
      payload?.limit,
    ],
  )
}

// ── AI Journey Weave ───────────────────────────────────────

/** Create journey weave using coordinates */
export function useCreateJourneyWeave() {
  return useMutation(
    (payload: JourneyWeaveCreatePayload) =>
      createJourneyWeave(payload),
  );
}

/** Get existing journey weave for user */
export function useJourneyWeave(
  userId?: string,
) {
  return useQuery(
    () => {
      if (!userId) {
        return Promise.resolve(null);
      }

      return getJourneyWeave(userId);
    },
    [userId],
  );
}

// ─────────────────────────────────────────────────────────────
// Temple Details
// ─────────────────────────────────────────────────────────────

export function useCreateTempleDetails() {
  return useMutation(
    (payload: TempleDetailsPayload) =>
      postTempleDetails(payload),
  );
}

// ─────────────────────────────────────────────────────────────
// Temple Details
// ─────────────────────────────────────────────────────────────

export function useGetTempleDetails() {
  return useMutation(
    (payload: TempleDetailsPayload) =>
      getTempleDetails(payload),
  );
}

export function useRefreshTempleDetails() {
  return useMutation(
    (payload: TempleDetailsPayload) =>
      refreshTempleDetails(payload),
  );
}