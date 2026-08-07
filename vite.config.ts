import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 3000,
    cors: true, // Enable CORS
    headers: {
      // Prevents Clickjacking (Legacy support)
      "X-Frame-Options": "DENY",
      // Modern Clickjacking protection (must be in HTTP headers, not meta tags)
      "Content-Security-Policy": "frame-ancestors 'none';",
      // Prevents MIME-sniffing attacks
      "X-Content-Type-Options": "nosniff",
      // Protects against Cross-Site Scripting (XSS) attacks
      "X-XSS-Protection": "1; mode=block",
      // HTTP Strict Transport Security (HSTS)
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
      // Controls referrer information
      "Referrer-Policy": "strict-origin-when-cross-origin",
      // Restricts access to device features
      "Permissions-Policy": "geolocation=*, microphone=(self), camera=()",
    },
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
