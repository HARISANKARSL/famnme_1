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

export const setupGlobalFetchInterceptor = () => {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
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

      // Note: Getting body from a Request object is async (e.g. input.text()),
      // so if body is already set in init, clean it.
      if (newInit.body) {
        if (typeof newInit.body === 'string') {
          try {
            const parsed = JSON.parse(newInit.body);
            newInit.body = JSON.stringify(cleanProxyData(parsed));
          } catch (e) {
            if (newInit.body.includes('_proxy_')) {
              newInit.body = newInit.body.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');
            }
          }
        } else if (newInit.body instanceof FormData) {
          newInit.body = cleanProxyData(newInit.body);
        }
      }

      const newRequest = new Request(newUrl, newInit);
      return originalFetch(newRequest);
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
        } catch (e) {
          if (init.body.includes('_proxy_')) {
            newInit.body = init.body.replace(/_proxy_[a-zA-Z0-9_-]+/g, '');
          }
        }
      } else if (init.body instanceof FormData) {
        newInit.body = cleanProxyData(init.body);
      }
    }

    return originalFetch(url, newInit);
  };
};
