import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { attachProxyInterceptor } from '@/utils/proxyIdCleaner';

// Use the Preserve Family URL from environment variables, defaulting to localhost:8000
const baseURL = import.meta.env.VITE_API_BASE_URL;
// const baseURL = 'http://localhost:8000';

const preserveFamilyInstance = axios.create({
  baseURL,
});

// Interceptor to add the auth token to every request
preserveFamilyInstance.interceptors.request.use((config) => {
  const token = getAuthToken() || localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Attach proxy cleaner interceptor
attachProxyInterceptor(preserveFamilyInstance);

export default preserveFamilyInstance;
