import preserveFamilyInstance from './preserveFamilyInstance';
import aiInstance from './aiInstance';

export const postApi = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await preserveFamilyInstance.post<T>(url, data);
  return response.data;
};

export const postAIApi = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await aiInstance.post<T>(url, data);
  return response.data;
};

export const putApi = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await preserveFamilyInstance.put<T>(url, data);
  return response.data;
};

export const patchApi = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await preserveFamilyInstance.patch<T>(url, data);
  return response.data;
};

export const getApi = async <T = any>(url: string, params?: any): Promise<T> => {
  const response = await preserveFamilyInstance.get<T>(url, { params });
  return response.data;
};

export const deleteApi = async <T = any>(url: string, data?: any): Promise<T> => {
  const response = await preserveFamilyInstance.delete<T>(url, { data });
  return response.data;
};

/**
 * For file downloads/blobs
 */
export const getApiBlob = async (url: string) => {
  const response = await preserveFamilyInstance.get(url, { responseType: 'blob' });
  return response.data;
};

export const postApiBlob = async (url: string, data: any = {}) => {
  const response = await preserveFamilyInstance.post(url, data, {
    responseType: 'blob',
  });
  return response;
};
