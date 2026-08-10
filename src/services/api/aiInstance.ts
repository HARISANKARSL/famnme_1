import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { attachProxyInterceptor } from '@/utils/proxyIdCleaner';
import { attachAnalyticsInterceptor } from '@/services/firebase/analytics.service';

// Use the AI API URL from environment variables, defaulting to https://famnme.actigen.ai
const baseURL = import.meta.env.VITE_AI_API_BASE_URL;

const aiInstance = axios.create({
  baseURL,
});

aiInstance.interceptors.request.use((config) => {
  const token = getAuthToken() || localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Attach proxy cleaner interceptor
attachProxyInterceptor(aiInstance);

// Attach analytics interceptor
attachAnalyticsInterceptor(aiInstance);

export default aiInstance;
