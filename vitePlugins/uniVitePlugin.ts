import uni from '@dcloudio/vite-plugin-uni'
import {patchMPPagesJsonPlugin} from './patchMPPagesJsonPlugin'
export function uniVitePlugin() {
  const vitePluginUni = uni()
  patchMPPagesJsonPlugin(vitePluginUni)
  return vitePluginUni
}
