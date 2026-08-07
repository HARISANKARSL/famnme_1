import { apiInstance, aiInstance } from './api';
import { treeApi, aiApi } from './endpoints';
import type { TreeMetadata, Person } from '@/types';

export const treeApiCalls = {
  list: async () => {
    const response = await apiInstance.get<{ success: boolean; data: TreeMetadata[] }>(treeApi.list);
    return response.data.data;
  },

  create: async (treeName: string, description?: string) => {
    const response = await apiInstance.post<{ success: boolean; data: { treeId: string; treeName: string } }>(treeApi.create, {
      treeName,
      description,
    });
    return response.data.data;
  },


  createRoot: async (treeId: string, personData: Partial<Person>) => {
    const response = await apiInstance.post<{ success: boolean; data: Person }>(treeApi.createRoot, {
      treeId,
      person: personData,
    });
    return response.data.data;
  },

  getWindow: async (treeId: string, params?: Record<string, any>) => {
    const response = await apiInstance.get<{ success: boolean; data: any }>(treeApi.getWindow(treeId), {
      params,
    });
    return response.data.data;
  },

  addSpouse: async (personId: string, spouseData: Partial<Person>, unionData: any) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addSpouse(personId), {
      spouseData,
      unionData,
    });
    return response.data.data;
  },

  addSpouseBetweenExisting: async (treeId: string, personId: string, spouseId: string, unionData: any) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addSpouseBetweenExisting, {
      treeId,
      personId,
      spouseId,
      unionData,
    });
    return response.data.data;
  },

  addParent: async (childId: string, parentData: Partial<Person>, marriedToExistingParent: boolean) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addParent(childId), {
      parentData,
      marriedToExistingParent,
    });
    return response.data.data;
  },

  addChild: async (unionId: string | null, treeId: string, childData: Partial<Person>, parentChildType: string, parentId?: string) => {
    const payload: any = {
      treeId,
      child: childData,
      parentChildType,
    };
    if (!unionId && parentId) {
      payload.parentId = parentId;
    }
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addChild(unionId || 'null'), payload);
    return response.data.data;
  },

  getPerson: async (personId: string) => {
    const response = await apiInstance.get<{ success: boolean; data: Person }>(treeApi.person(personId));
    return response.data.data;
  },

  updatePerson: async (personId: string, updates: Partial<Person>) => {
    const response = await apiInstance.put<{ success: boolean; data: Person }>(treeApi.person(personId), updates);
    return response.data.data;
  },

  addSibling: async (personId: string, siblingData: Partial<Person>, parentChildType: string) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addSibling(personId), {
      parentChildType,
      sibling: siblingData,
    });
    return response.data.data;
  },

  moveChildren: async (treeId: string, fromUnionId: string, toUnionId: string, childIds: string[]) => {
    const response = await apiInstance.post<any>(treeApi.moveChildren, {
      treeId,
      fromUnionId,
      toUnionId,
      childIds,
    });
    return response.data.data !== undefined ? response.data.data : response.data;
  },

  quickCreate: async (personId: string, relatives: any[]) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.quickCreate(personId), {
      relatives,
    });
    return response.data.data;
  },

  importGedcom: async (formData: FormData) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.importGedcom, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  setHomePerson: async (treeId: string, personId: string) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.setHomePerson(treeId), {
      personId,
    });
    return response.data.data;
  },

  updatePersonPhoto: async (personId: string, image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.updatePhoto(personId), formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  exportGedcom: async (treeId: string) => {
    const response = await apiInstance.get(treeApi.exportGedcom(treeId), {
      responseType: 'blob',
    });
    return response.data;
  },

  exportCsv: async (treeId: string) => {
    const response = await apiInstance.get(treeApi.exportCsv(treeId), {
      responseType: 'blob',
    });
    return response.data;
  },


  mergePersons: async (treeId: string, data: any) => {
    const response = await apiInstance.post(treeApi.mergePersons(treeId), data);
    return response.data;
  },


  deletePerson: async (personId: string) => {
    const response = await apiInstance.delete<{ success: boolean; data: any }>(treeApi.person(personId));
    return response.data;
  },

  renameTree: async (treeId: string, treeName: string) => {
    const response = await apiInstance.put(treeApi.edit(treeId), { treeName, description: '' });
    return response.data;
  },

  editTreeDescription: async (treeId: string, treeName: string, description: string) => {
    const response = await apiInstance.put(treeApi.edit(treeId), { treeName, description });
    return response.data;
  },

  duplicateTree: async (treeId: string, newTreeName: string) => {
    const response = await apiInstance.post(treeApi.duplicate(treeId), { newTreeName });
    return response.data.data;
  },

  deleteTree: async (treeId: string) => {
    const response = await apiInstance.delete(treeApi.delete(treeId));
    return response.data;
  },

  setDefaultTree: async (treeId: string) => {
    const response = await apiInstance.patch(treeApi.setDefault(treeId));
    return response.data;
  },

  getNodeDisplayPreferences: async (treeId: string) => {
    const response = await apiInstance.get<{ success: boolean; data: { fields: string[] } }>(treeApi.nodeDisplayPreferences(treeId));
    return response.data.data;
  },

  updateNodeDisplayPreferences: async (treeId: string, fields: string[]) => {
    const response = await apiInstance.put<{ success: boolean; data: any }>(treeApi.nodeDisplayPreferences(treeId), { fields });
    return response.data;
  },

  aiOnboarding: async (payload: any) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.onboarding, payload);
    return response.data.data || response.data;
  },

  addLifeEvent: async (personId: string, payload: any) => {
    const response = await apiInstance.post<{ success: boolean; data: any }>(treeApi.addLifeEvent(personId), payload);
    return response.data.data || response.data;
  },

  getLifeEvents: async (personId: string) => {
    const response = await apiInstance.get<{ success: boolean; data: any }>(treeApi.addLifeEvent(personId));
    return response.data.data || [];
  },

  updateLifeEvent: async (eventId: string, payload: any) => {
    const response = await apiInstance.put<{ success: boolean; data: any }>(treeApi.updateLifeEvent(eventId), payload);
    return response.data.data || response.data;
  },

  deleteLifeEvent: async (eventId: string) => {
    const response = await apiInstance.delete<{ success: boolean; data: any }>(treeApi.deleteLifeEvent(eventId));
    return response.data.data || response.data;
  },
};

export interface AIRelationshipResponse {
  treeId: string;
  fromId: string;
  toId: string;
  path: Array<{
    person_id: string;
    name: string;
    relation_to_previous: string;
  }>;
  kinship: {
    english: string;
    indian: string;
    hop_count: number;
  };
  text: string;
  source: string;
}

export const aiApiCalls = {
  getRelationshipStory: async (treeId: string, fromId: string, toId: string, nativeLanguage?: string) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.get<AIRelationshipResponse>(`${aiBaseUrl}${aiApi.relationshipStory(treeId, fromId, toId, nativeLanguage)}`);
    return response.data;
  },
  getDuplicates: async (treeId: string, threshold = 0.65, limit = 25) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.get<any[]>(`${aiBaseUrl}${aiApi.duplicates(treeId, threshold, limit)}`);
    return response.data;
  },
  resolveFollowup: async (payload: any) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.post(`${aiBaseUrl}${aiApi.resolveFollowup}`, payload);
    return response.data;
  },
  identifyGender: async (name: string) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.post<any>(`${aiBaseUrl}${aiApi.genderIdentify}`, { name });
    return response.data;
  },
  getLifeStory: async (personId: string) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.get<any>(`${aiBaseUrl}${aiApi.lifeStory(personId)}`);
    return response.data;
  },
  dismissDuplicate: async (personAId: string, personBId: string) => {
    const aiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL;
    const response = await aiInstance.post(`${aiBaseUrl}${aiApi.dismissDuplicate}`, {
      a_id: personAId,
      b_id: personBId,
    });
    return response.data;
  },
};
