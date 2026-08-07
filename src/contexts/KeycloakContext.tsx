import React, { createContext, useContext, useEffect, useState } from "react";
import keycloak, { initKeycloak } from "@/services/keycloak";
import { useAuthStore } from "@/store/authStore";
import {
  setAuthToken,
  setRefreshToken,
  clearAuthToken,
} from "@/lib/auth";
import { Loader2 } from "lucide-react";

interface KeycloakContextType {
  initialized: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => void;
}

const KeycloakContext = createContext<KeycloakContextType | null>(null);

export const useKeycloak = () => {
  const context = useContext(KeycloakContext);

  if (!context) {
    throw new Error(
      "useKeycloak must be used within a KeycloakProvider"
    );
  }

  return context;
};

export const KeycloakProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const { checkSession, setUser } = useAuthStore();

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const initialize = async () => {
      try {
        // Initialize Keycloak
        const auth = await initKeycloak();

        setAuthenticated(auth);

        if (auth) {
          // Save tokens
          setAuthToken(keycloak.token || "");
          setRefreshToken(keycloak.refreshToken || "");

          // Sync user session
          await checkSession();

          // Auto token refresh
          refreshTimer = setInterval(async () => {
            try {
              const refreshed = await keycloak.updateToken(70);

              if (refreshed) {
                console.log("[Keycloak] Token refreshed");

                setAuthToken(keycloak.token || "");

                await checkSession();
              }
            } catch (error) {
              console.error(
                "[Keycloak] Token refresh failed",
                error
              );

              clearAuthToken();

              setUser(null);

              setAuthenticated(false);

              keycloak.clearToken();
            }
          }, 30000);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("[Keycloak] Initialization failed", error);

        clearAuthToken();

        setUser(null);

        setAuthenticated(false);
      } finally {
        setInitialized(true);
      }
    };

    initialize();

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [checkSession, setUser]);

  const login = () => {
    keycloak.login();
  };

  const logout = async () => {
    try {
      console.log("[KeycloakContext] Initiating logout flow...");
      // Enter loading state to prevent client-side routing to /login during logout redirect
      useAuthStore.setState({ loading: true });
      clearAuthToken();
      console.log("[KeycloakContext] Auth token cleared.");

      sessionStorage.clear();
      console.log("[KeycloakContext] sessionStorage cleared.");

      localStorage.clear();
      console.log("[KeycloakContext] localStorage cleared.");

      console.log("[KeycloakContext] Calling Keycloak.logout...");
      await keycloak.logout({
        redirectUri: window.location.origin,
      });
    } catch (error) {
      console.error("[Keycloak] Logout failed", error);
      useAuthStore.setState({ loading: false });
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F2EA]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#2F3E8F] mx-auto" />

          <p className="text-sm font-medium text-[#4A3D2E]">
            Initializing secure session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <KeycloakContext.Provider
      value={{
        initialized,
        authenticated,
        login,
        logout,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};

export default KeycloakContext;