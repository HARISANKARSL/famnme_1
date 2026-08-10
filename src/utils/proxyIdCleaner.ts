/**
 * Recursively cleans any proxy suffixes (e.g. "_proxy_1") from string values
 * in URLs, parameters, and payloads.
 */
export const cleanProxyId = (val: string): string => {
  if (typeof val === 'string' && val.includes('_proxy_')) {
    return val.split('_proxy_')[0];
  }
  return val;
};

export const cleanProxyData = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.includes('_proxy_') ? obj.split('_proxy_')[0] : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanProxyData);
  }
  if (typeof obj === 'object') {
    if (obj instanceof FormData) {
      const newFormData = new FormData();
      for (const [key, value] of (obj as any).entries()) {
        if (typeof value === 'string') {
          newFormData.append(key, value.includes('_proxy_') ? value.split('_proxy_')[0] : value);
        } else {
          newFormData.append(key, value);
        }
      }
      return newFormData;
    }
    // Avoid modifying special objects like File, Blob, Date
    if (obj instanceof File || obj instanceof Blob || obj instanceof Date) {
      return obj;
    }
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanProxyData(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export const cleanProxyFromUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  return url.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');
};

export const attachProxyInterceptor = (instance: any) => {
  instance.interceptors.request.use((config: any) => {
    if (config.url) {
      config.url = cleanProxyFromUrl(config.url);
    }
    if (config.params) {
      config.params = cleanProxyData(config.params);
    }
    if (config.data) {
      config.data = cleanProxyData(config.data);
    }
    return config;
  }, (error: any) => {
    return Promise.reject(error);
  });
};

const IGNORED_API_PATTERNS = [
  '/api/streak',
  '/share/preferences',
  '/api/streak/activity',
  '/share/post-of-day',
  '/api/tree/:id/pending-edit-count',
  '/api/tree/:id/temple-links',
  '/api/tree/:id/suggestions',
  '/tree/:id/suggestions',
  '/share/posts/:id/view',
  '/api/tree/:id/temple-memory-counts'
];

export const normalizeUrl = (url: string | undefined): string => {
  if (!url) return "unknown_api";
  
  let path = url;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      path = new URL(url).pathname;
    } else {
      path = url.split('?')[0];
    }
  } catch {
    path = url.split('?')[0];
  }

  // Replace UUIDs with :id placeholder
  path = path.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':id');
  
  // Replace standalone numbers (ids) with :id placeholder
  path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
  
  // Clean any proxy suffix if present (e.g. _proxy_1)
  path = path.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');

  return path;
};

export const shouldSkipTracking = (url: string | undefined): boolean => {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  return IGNORED_API_PATTERNS.some((pattern) => normalized === pattern || normalized.endsWith(pattern));
};

export const setupGlobalFetchInterceptor = () => {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let requestUrl = "";
    if (input instanceof Request) {
      requestUrl = input.url;
    } else {
      requestUrl = typeof input === 'string' ? input : (input as URL).href || "";
    }

    const handleFetchResponse = (response: Response) => {
      if (shouldSkipTracking(requestUrl)) {
        return response;
      }
      if (!response.ok) {
        const status = response.status;
        if (status !== 401 && status !== 403 && status !== 404) {
          const apiName = normalizeUrl(requestUrl);
          import('@/services/firebase/analytics.service')
            .then(({ trackEvent }) => {
              trackEvent('api_failed', { api_name: apiName });
            })
            .catch(() => {});
        }
      }
      return response;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFetchError = (error: any) => {
      if (shouldSkipTracking(requestUrl)) {
        throw error;
      }
      const apiName = normalizeUrl(requestUrl);
      const isTimeout =
        error?.name === 'AbortError' ||
        error?.message?.toLowerCase().includes('timeout') ||
        error?.code === 'ETIMEDOUT';

      import('@/services/firebase/analytics.service')
        .then(({ trackEvent }) => {
          if (isTimeout) {
            trackEvent('api_timeout', { api_name: apiName });
          } else {
            trackEvent('api_failed', { api_name: apiName });
          }
        })
        .catch(() => {});

      throw error;
    };

    if (input instanceof Request) {
      const newUrl = cleanProxyFromUrl(input.url) || input.url;
      let newInit: any = {
        method: input.method,
        headers: input.headers,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity,
      };

      if (init) {
        newInit = { ...newInit, ...init };
      }

      if (newInit.body) {
        if (typeof newInit.body === 'string') {
          try {
            const parsed = JSON.parse(newInit.body);
            newInit.body = JSON.stringify(cleanProxyData(parsed));
          } catch {
            if (newInit.body.includes('_proxy_')) {
              newInit.body = newInit.body.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');
            }
          }
        } else if (newInit.body instanceof FormData) {
          newInit.body = cleanProxyData(newInit.body);
        }
      }

      const newRequest = new Request(newUrl, newInit);
      return originalFetch(newRequest)
        .then(handleFetchResponse)
        .catch(handleFetchError);
    }

    let url = typeof input === 'string' ? input : input.href;
    url = cleanProxyFromUrl(url) || url;

    let newInit = init;
    if (init && init.body) {
      newInit = { ...init };
      if (typeof init.body === 'string') {
        try {
          const parsed = JSON.parse(init.body);
          newInit.body = JSON.stringify(cleanProxyData(parsed));
        } catch {
          if (init.body.includes('_proxy_')) {
            newInit.body = init.body.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');
          }
        }
      } else if (init.body instanceof FormData) {
        newInit.body = cleanProxyData(init.body);
      }
    }

    return originalFetch(url, newInit)
      .then(handleFetchResponse)
      .catch(handleFetchError);
  };
};
