import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { AI_BASE_URL } from '@/config/api';
import { attachProxyInterceptor } from '@/utils/proxyIdCleaner';
import { attachAnalyticsInterceptor } from '@/services/firebase/analytics.service';

// const BASE_URL = process.env.VITE_API_BASE_URL;
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance
export const apiInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor for authentication
apiInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add interceptor for response errors to display custom backend messages
apiInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
      const data = error.response.data;
      const apiError = typeof data === 'object' ? (data.error || data.message) : null;
      if (apiError) {
        error.message = apiError;
      }
    }
    return Promise.reject(error);
  }
);

// Create AI axios instance
export const aiInstance = axios.create({
  baseURL: import.meta.env.VITE_AI_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach proxy cleaner interceptor
attachProxyInterceptor(apiInstance);
attachProxyInterceptor(aiInstance);

// Attach analytics interceptor
attachAnalyticsInterceptor(apiInstance);
attachAnalyticsInterceptor(aiInstance);

// Add interceptor for authentication to AI instance if needed (sharing same token)
aiInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);



