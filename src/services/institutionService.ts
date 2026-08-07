/**
 * Institution API Service
 *
 * Client-side service for the Celebrate Culture microservice.
 * Uses shared axios instances and resolves image URLs.
 */

import {
  institutionInstance,
  aiInstitutionInstance,
} from "@/services/api/institutionInstance";

import { resolveBackendUrl } from "@/config/api";

import type {
  Institution,
  InstitutionDetail,
  UserInstitution,
  InstitutionMemory,
  InstitutionMember,
  InstitutionTag,
  Pagination,
  JourneySearchPayload,
  JourneySearchResponse,
  AddToMyListPayload,
  TempleDetailsPayload,
  TempleDetailsResponse,
  JourneyWeaveCreatePayload,
  JourneyWeaveResponse,
  UpdateInstitutionTagPayload,
  UpdateInstitutionTagResponse,
} from "@/types";

const CELEBRATE_API = "/celebrate/api";
const VAULT_API = "/vault";
const AI_API = "/journey";

function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  return resolveBackendUrl(url);
}

// ── Shared API Helpers ───────────────────────────────────────────────────

async function getCelebrateApi<T>(
  path: string,
  params?: Record<string, any>,
): Promise<T> {
  const response = await institutionInstance.get<T>(`${CELEBRATE_API}${path}`, {
    params,
  });

  return response.data;
}

async function postCelebrateApi<T>(path: string, data?: any): Promise<T> {
  const response = await institutionInstance.post<T>(
    `${CELEBRATE_API}${path}`,
    data,
  );

  return response.data;
}
async function aiPostCelebrateApi<T>(path: string, data?: any): Promise<T> {
  const response = await aiInstitutionInstance.post<T>(
    `${AI_API}${path}`,
    data,
  );

  return response.data;
}

async function putCelebrateApi<T>(path: string, data?: any): Promise<T> {
  const response = await institutionInstance.put<T>(
    `${CELEBRATE_API}${path}`,
    data,
  );

  return response.data;
}

async function deleteCelebrateApi<T>(path: string, data?: any): Promise<T> {
  const response = await institutionInstance.delete<T>(
    `${CELEBRATE_API}${path}`,
    {
      data,
    },
  );

  return response.data;
}

async function postVaultApi<T>(path: string, data?: any): Promise<T> {
  const response = await institutionInstance.post<T>(
    `${VAULT_API}${path}`,
    data,
  );

  return response.data;
}

// ── AI API Helpers ───────────────────────────────────────────────────────

async function getAiApi<T>(
  path: string,
  params?: Record<string, any>,
): Promise<T> {
  const response = await aiInstitutionInstance.get<T>(`${AI_API}${path}`, {
    params,
  });

  return response.data;
}

async function postAiApi<T>(path: string, data?: any): Promise<T> {
  const response = await aiInstitutionInstance.post<T>(
    `${AI_API}${path}`,
    data,
  );

  return response.data;
}

async function putAiApi<T>(path: string, data?: any): Promise<T> {
  const response = await aiInstitutionInstance.put<T>(`${AI_API}${path}`, data);

  return response.data;
}

async function deleteAiApi<T>(path: string, data?: any): Promise<T> {
  const response = await aiInstitutionInstance.delete<T>(`${AI_API}${path}`, {
    data,
  });

  return response.data;
}

// ── Institution Discovery ────────────────────────────────────────────────

export interface GetInstitutionsOptions {
  q?: string;
  lat?: number;
  lng?: number;
  filter?: "popular" | "near_me";
  religion?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface GetInstitutionsResponse {
  success: boolean;
  data: {
    institutions: Institution[];
    pagination: Pagination;
  };
}

function normalizeInstitution(institution: Institution): Institution {
  return {
    ...institution,
    thumbnail: resolveImageUrl(institution.thumbnail) ?? institution.thumbnail,
  };
}

function normalizeInstitutionDetail(
  detail: InstitutionDetail,
): InstitutionDetail {
  return {
    ...detail,
    thumbnail: resolveImageUrl(detail.thumbnail) ?? detail.thumbnail,

    images: (detail.images ?? [])
      .map(resolveImageUrl)
      .filter((url): url is string => Boolean(url)),
  };
}

function normalizeInstitutionMember(member: any): InstitutionMember {
  return {
    ...member,
    profilePhotoUrl: resolveImageUrl(member.profilePhotoUrl) ?? undefined,
  };
}

function normalizeInstitutionMemory(
  m: any,
  institutionId: string,
): InstitutionMemory {
  const files = Array.isArray(m.files) ? m.files : [];

  const mediaUrls = files
    .map((file: any): string | undefined =>
      resolveImageUrl(file.signedUrl ?? file.fileUrl),
    )
    .filter((url: any): url is string => Boolean(url));

  return {
    _id: m.id ?? m._id,
    memoryId: m.id ?? m._id,
    institutionId: m.templeId ?? institutionId,
    userId: m.createdBy ?? m.userId ?? "",
    title: m.title ?? "",
    description: m.description ?? m.textContent ?? m.files?.[0]?.textContent ?? "",
    mediaUrls: mediaUrls.length
      ? mediaUrls
      : m.mediaUrl
        ? [resolveImageUrl(m.mediaUrl) ?? m.mediaUrl]
        : [],
    mediaType: (m.memoryType as any) ?? "photo",
    festival: m.category ?? undefined,
    ritual: m.place ?? undefined,
    date: m.dateTaken ?? m.createdAt ?? "",
    // taggedMembers: Array.isArray(m.taggedPeople)
    //   ? m.taggedPeople
    //       .map((person: any) => person.id ?? person.personId ?? "")
    //       .filter(Boolean)
    //   : [],

    // ── add this line ──
    taggedPeople: (() => {
      const raw = m.taggedPeople || m.files?.[0]?.taggedPeople || m.taggedPersons || m.files?.[0]?.taggedPersons || [];
      return Array.isArray(raw)
        ? raw.map((p: any) => ({ name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(), id: p.id || p.personId || "" }))
        : [];
    })(),

    visibility: (m.privacy as any) ?? "everyone_in_tree",
    createdAt: m.createdAt ?? new Date().toISOString(),
    thumbnailUrl:
      resolveImageUrl(
        m.thumbnailUrl ??
        files?.[0]?.thumbnailSignedUrl ??
        files?.[0]?.thumbnailUrl ??
        files?.[0]?.signedUrl ??
        files?.[0]?.fileUrl,
      ) ?? undefined,
    files: m.files,
  };
}

/** Search / Near Me / Popular institutions. */
export async function getInstitutions(
  options?: GetInstitutionsOptions,
): Promise<GetInstitutionsResponse> {
  const params = {
    q: options?.q,
    lat: options?.lat,
    lng: options?.lng,
    filter: options?.filter,
    religion: options?.religion,
    type: options?.type,
    page: options?.page,
    limit: options?.limit,
  };

  const response = await getCelebrateApi<GetInstitutionsResponse>(
    "/institutions",
    params,
  );

  return {
    ...response,

    data: {
      ...response.data,

      institutions: (response.data.institutions ?? []).map(
        normalizeInstitution,
      ),
    },
  };
}

/** Get a single institution's full detail. */
export async function getInstitutionDetail(id: string): Promise<{
  success: boolean;
  data: InstitutionDetail;
}> {
  const response = await getCelebrateApi<{
    success: boolean;
    data: InstitutionDetail;
  }>(`/institutions/${id}`);

  return {
    ...response,
    data: normalizeInstitutionDetail(response.data),
  };
}

// ── My Institutions ──────────────────────────────────────────────────────

export async function getMyInstitutions(): Promise<{
  success: boolean;
  data: UserInstitution[];
}> {
  return getCelebrateApi("/institutions/my");
}

export async function addInstitutionToMyList(
  payload: AddToMyListPayload,
): Promise<{
  success: boolean;
  message: string;
  data: {
    institutionId: string;
    tag: InstitutionTag;
    addedAt: string;
  };
}> {
  return postCelebrateApi("/institutions/my", payload);
}

export async function removeInstitutionFromMyList(
  institutionId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  return deleteCelebrateApi(`/institutions/my/${institutionId}`);
}

export async function updateInstitutionTag(
  institutionId: string,
  payload: UpdateInstitutionTagPayload
): Promise<UpdateInstitutionTagResponse> {
  return putCelebrateApi(
    `/institutions/my/${institutionId}/tag`,
    payload
  );
}

// ── Institution Tags ─────────────────────────────────────────────────────

export async function getInstitutionTags(): Promise<{
  success: boolean;
  data: {
    religions: string[];
    types: string[];
    userTags: InstitutionTag[];
  };
}> {
  return getCelebrateApi("/institutions/tags");
}

// ── Memories ─────────────────────────────────────────────────────────────

export interface GetMemoriesOptions {
  page?: number;
  limit?: number;
}

export interface CreateMemoryPayload {
  title: string;
  description?: string;
  category?: string;
  dateTaken?: string;
  place?: string;

  files?: {
    key: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    thumbnailKey?: string;
  }[];

  taggedPeople?: Array<{
    name: string;
    id: string;
  }>;
}

export interface MemoryUploadUrlFileRequest {
  fileName: string;
  fileType: string;
}

export interface MemoryUploadUrlResponseItem {
  uploadUrl: string;
  key: string;
  fileId: string;
  expiresIn: number;
  fileName: string;
  thumbnailKey?: string;
  thumbnailUploadUrl?: string;
}

export interface GenerateMemoryUploadUrlsResponse {
  success: boolean;
  data: MemoryUploadUrlResponseItem[];
}

export async function getInstitutionMemories(
  institutionId: string,
  options?: GetMemoriesOptions,
): Promise<{
  success: boolean;
  data: {
    memories: InstitutionMemory[];
    pagination: Pagination;
  };
}> {
  const res = await postVaultApi<{
    memories: any[];
  }>("/memories", {
    page: options?.page || 1,
    limit: options?.limit || 200,
    filter: {
      section: "heritage",
    },
  });

  const filteredMemories = (res.memories ?? []).filter(
    (m: any) => m.templeId === institutionId,
  );

  const normalizedMemories = filteredMemories.map((m: any) =>
    normalizeInstitutionMemory(m, institutionId),
  );

  return {
    success: true,

    data: {
      memories: normalizedMemories,

      pagination: {
        page: options?.page || 1,
        limit: options?.limit || 20,
        total: normalizedMemories.length,
        totalPages: 1,
      },
    },
  };
}

export async function addInstitutionMemory(
  institutionId: string,
  payload: CreateMemoryPayload,
): Promise<{
  success: boolean;
  message: string;
  data: {
    _id: string;
    institutionId: string;
    title: string;
    createdAt: string;
  };
}> {
  const confirmPayload: Record<string, any> = {
    title: payload.title || "",
    type: "post",
    status: "publish",
    templeId: institutionId,
    section: "heritage",

    taggedPeople: payload.taggedPeople || [],

    files: payload.files || [],
  };

  if (payload.description) {
    confirmPayload.description = payload.description;
  }

  if (payload.category) {
    confirmPayload.category = payload.category;
  }

  if (payload.dateTaken) {
    confirmPayload.dateTaken = payload.dateTaken;
  }

  if (payload.place) {
    confirmPayload.place = payload.place;
  }

  const res = await postVaultApi<any>("/memories/confirm", confirmPayload);

  return {
    success: true,
    message: "Memory added",

    data: {
      _id: res._id || res.id || "",

      institutionId,

      title: res.title || payload.title,

      createdAt: res.createdAt || new Date().toISOString(),
    },
  };
}

export async function generateInstitutionMemoryUploadUrls(
  institutionId: string,
  files: MemoryUploadUrlFileRequest[],
): Promise<GenerateMemoryUploadUrlsResponse> {
  const res = await postVaultApi<{
    success: boolean;
    data: MemoryUploadUrlResponseItem[];
  }>("/memories/presigned-url", {
    files,
  });

  return {
    success: true,
    data: res.data,
  };
}

export async function deleteInstitutionMemory(
  institutionId: string,
  memoryId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  await postVaultApi("/memories/remove-heritage", {
    id: [memoryId],
  });

  return {
    success: true,
    message: "Memory deleted",
  };
}

// ── Family Members ───────────────────────────────────────────────────────

export interface TagMemberPayload {
  memberId: string;
  visitDate?: string;
}

export interface UpdateMemberPayload {
  visitDate?: string;
  notes?: string;
}

export async function getInstitutionMembers(institutionId: string): Promise<{
  success: boolean;
  data: InstitutionMember[];
}> {
  const response = await getCelebrateApi<{
    success: boolean;
    data: InstitutionMember[];
  }>(`/institutions/${institutionId}/members`);

  return {
    ...response,

    data: (response.data ?? []).map(normalizeInstitutionMember),
  };
}

export async function tagFamilyMember(
  institutionId: string,
  payload: TagMemberPayload,
): Promise<{
  success: boolean;
  message: string;
}> {
  return postCelebrateApi(`/institutions/${institutionId}/members`, payload);
}

export async function removeFamilyMemberTag(
  institutionId: string,
  memberId: string,
): Promise<{
  success: boolean;
  message: string;
}> {
  return deleteCelebrateApi(
    `/institutions/${institutionId}/members/${memberId}`,
  );
}

export async function updateTaggedFamilyMember(
  institutionId: string,
  memberId: string,
  payload: UpdateMemberPayload,
): Promise<{
  success: boolean;
  message: string;
}> {
  return postCelebrateApi(
    `/institutions/${institutionId}/members/${memberId}`,
    payload,
  );
}

// ── AI Journey APIs ──────────────────────────────────────────────────────

// export async function searchJourneyTemples(
//   payload: JourneySearchPayload,
// ): Promise<JourneySearchResponse> {
//   const response = await aiPostCelebrateApi<JourneySearchResponse>("/search", {
//     query: payload.query,
//     lat: payload.lat,
//     lng: payload.lng,
//     page: payload.page ?? 1,
//     limit: payload.limit ?? 10,
//   });


//   try {
//     await postCelebrateApi<any>("/sacred-places/search", {
//       dataset: response ?? [], query: payload.query,
//       lat: payload.lat,
//       lng: payload.lng,
//       page: payload.page ?? 1,
//       limit: payload.limit ?? 10,
//     });
//   } catch (error) {
//     console.error("Failed to post dataset to sacred-places search API:", error);
//   }

//   return response ?? [];
// }

export async function searchJourneyTemples(
  payload: JourneySearchPayload,
): Promise<JourneySearchResponse> {
  const body: any = {
    query: payload.query,
    limit: payload.limit ?? 10,
    skip: payload.skip ?? 0,
  };

  if (payload.lat !== undefined && payload.lat !== null && payload.lat !== 0) {
    body.lat = payload.lat;
  }
  if (payload.lng !== undefined && payload.lng !== null && payload.lng !== 0) {
    body.lng = payload.lng;
  }

  const response = await aiPostCelebrateApi<JourneySearchResponse>("/search", body);

  if (Array.isArray(response) && response.length > 0) {
    try {
      const sacredPlacesBody: any = {
        dataset: response,
        query: payload.query,
        page: payload.page ?? 1,
        limit: payload.limit ?? 10,
      };
      if (payload.lat !== undefined && payload.lat !== null && payload.lat !== 0) {
        sacredPlacesBody.lat = payload.lat;
      }
      if (payload.lng !== undefined && payload.lng !== null && payload.lng !== 0) {
        sacredPlacesBody.lng = payload.lng;
      }
      await postCelebrateApi<any>("/sacred-places/search", sacredPlacesBody);
    } catch (error) {
      console.error(
        "Failed to post dataset to sacred-places search API:",
        error,
      );
    }
  }

  return response ?? [];
}




// ── AI Journey Weave APIs ───────────────────────────────────

/** Create AI Journey Weave */
export async function createJourneyWeave(
  payload: JourneyWeaveCreatePayload,
): Promise<JourneyWeaveResponse> {
  return postAiApi<JourneyWeaveResponse>("/weave", payload);
}

/** Get AI Journey Weave by userId */
export async function getJourneyWeave(
  userId: string,
): Promise<JourneyWeaveResponse> {
  return getAiApi<JourneyWeaveResponse>("/weave", {
    userId,
  });
}

// ─────────────────────────────────────────────────────────────
// Temple Details
// ─────────────────────────────────────────────────────────────

export async function postTempleDetails(
  payload: TempleDetailsPayload,
): Promise<TempleDetailsResponse> {
  return postAiApi<TempleDetailsResponse>(
    "/temple/details",
    payload,
  );
}

// ─────────────────────────────────────────────────────────────
// Temple Details
// ─────────────────────────────────────────────────────────────

export async function getTempleDetails(
  payload: TempleDetailsPayload,
): Promise<TempleDetailsResponse> {
  const params = new URLSearchParams({
    templeId: payload.templeId,
    userId: payload.userId,
  });

  return getAiApi<TempleDetailsResponse>(
    `/temple/details?${params.toString()}`,
  );
}

// ─────────────────────────────────────────────────────────────
// Refresh Temple Details
// ─────────────────────────────────────────────────────────────

export async function refreshTempleDetails(
  payload: TempleDetailsPayload,
): Promise<TempleDetailsResponse> {
  const params = new URLSearchParams({
    templeId: payload.templeId,
    userId: payload.userId,
  });

  return getAiApi<TempleDetailsResponse>(
    `/temple/refresh?${params.toString()}`,
  );
}
