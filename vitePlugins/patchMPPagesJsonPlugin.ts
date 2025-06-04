import { Plugin } from 'vite'
import { readFile } from 'fs/promises'
import { parseJson } from '@dcloudio/uni-cli-shared'

const PLUGIN_NAME = 'uni:mp-pages-json'
export function patchMPPagesJsonPlugin(plugins: Plugin[]) {
  const pagesJsonPlugin = plugins.find((p) => p.name === PLUGIN_NAME)
  // if (pagesJsonPlugin)
    // manifestJsonPlugin.generateBundle = async function () {
    //   this.emitFile({
    //     fileName: '',
    //     type: 'asset',
    //     source: '',
    //   })
    // }
}
