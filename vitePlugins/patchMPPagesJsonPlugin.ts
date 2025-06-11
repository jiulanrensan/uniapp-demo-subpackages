import { Plugin } from 'vite'
import path from 'path'
import { findChangedJsonFiles } from '@dcloudio/uni-cli-shared'

const appJsonName = 'app'
const originFindChangedJsonFiles = findChangedJsonFiles

function isAppJson(fileName: string) {
  return fileName === appJsonName
}

function parseAppJson(content: string) {
  try {
    const { subPackages } =  JSON.parse(content)
    const subPackageMap = new Map<string, boolean>()
    if (subPackages && Array.isArray(subPackages)) {
      subPackages.forEach(subPackage => {
        if (subPackage.root) {
          // 记录绝对路径
          subPackageMap.set(path.resolve(subPackage.root), true)
        }
      })
    }
    console.log('subPackageMap', subPackageMap)
  } catch (e) {
    console.error(`Error parsing ${appJsonName}.json:`, e)
    return {}
  }
}

function overrideFindChangedJsonFiles() {
  return function (args: any) {
    return originFindChangedJsonFiles.apply(this, args)
  }
}

const PLUGIN_NAME = 'uni:mp-pages-json'
export function patchMPPagesJsonPlugin(plugins: Plugin[]) {
  const pagesJsonPlugin = plugins.find((p) => p.name === PLUGIN_NAME)
  if (pagesJsonPlugin) {
    // const originalBundle = pagesJsonPlugin.transform
    // pagesJsonPlugin.transform = async function (code: string, id: string) {
    //   console.log(`Processing ${id}`)
    //   if (originalBundle) return originalBundle.call(this, code, id)
    // }
    const originalBundle = pagesJsonPlugin.generateBundle
    pagesJsonPlugin.generateBundle = async function (args) {
      // console.log(`generateBundle`, args)
      if (originalBundle) {
        originalBundle.apply(this, args)
      }
    }
  }
    
}
