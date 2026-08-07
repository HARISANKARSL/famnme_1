import axios from "axios";
import { getAuthToken } from "@/lib/auth";
import { attachProxyInterceptor } from "@/utils/proxyIdCleaner";

// Main API base URL
const baseURL = import.meta.env.VITE_API_BASE_URL;

// AI API base URL
const aiApiBaseURL = import.meta.env.VITE_AI_API_BASE_URL;

// Common interceptor setup
const attachAuthInterceptor = (instance: any) => {
  instance.interceptors.request.use(
    (config:any) => {
      const token =
        getAuthToken() || localStorage.getItem("auth_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error:any) => Promise.reject(error)
  );
};

// Main API instance
export const institutionInstance = axios.create({
  baseURL,
});

// AI API instance
export const aiInstitutionInstance = axios.create({
  baseURL: aiApiBaseURL,
});

// Attach interceptors to both
attachAuthInterceptor(institutionInstance);
attachAuthInterceptor(aiInstitutionInstance);

attachProxyInterceptor(institutionInstance);
attachProxyInterceptor(aiInstitutionInstance);

export default institutionInstance;