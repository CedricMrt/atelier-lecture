import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Chemins relatifs : indispensable pour que l'appli fonctionne dans Capacitor.
  base: "./",

  server: {
    host: true,
    port: 5174,
  },
});
