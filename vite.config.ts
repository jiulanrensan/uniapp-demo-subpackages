import { defineConfig } from "vite";
import {uniVitePlugin} from "./vitePlugins/uniVitePlugin";
import { uniAddSubPackagesPlugin } from './vitePlugins/uniAddSubPackages'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uniVitePlugin(),
    uniAddSubPackagesPlugin()
  ],
});
