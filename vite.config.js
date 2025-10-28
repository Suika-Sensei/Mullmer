// Vite configuration for the React frontend.
// Enables React plugin and Tailwind v4 integration. Exposes env vars with prefixes.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  // Register plugins for React and Tailwind CSS
  plugins: [react(), tailwindcss()],
  // Define prefixes for environment variables
  envPrefix: ["VITE_", "PUBLIC_"],
  // Configure server settings
  server: {
    // Set server port
    port: 1420,
    // Allow port to be reused if already in use
    strictPort: false,
  },
});
