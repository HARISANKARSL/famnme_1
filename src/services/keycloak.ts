import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_BASE_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
};

const keycloak = new Keycloak(keycloakConfig) as any;

keycloak.isInitializing = false;

export const initKeycloak = async () => {
  if (keycloak.isInitializing) return keycloak.authenticated;
  keycloak.isInitializing = true;
  try {
    const auth = await keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
    return auth;
  } catch (error) {
    keycloak.isInitializing = false;
    throw error;
  }
};

export default keycloak;
