import { defineConfig } from "vite";
import {uniVitePlugin} from "./vitePlugins/uniVitePlugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uniVitePlugin()
  ],
});
