import { Plugin } from 'vite'
import path from 'path'
import { findChangedJsonFiles } from '@dcloudio/uni-cli-shared'

const appJsonName = 'app'

function isAppJson(fileName: string) {
  return fileName === appJsonName
}

function collectSubPackages(content: string) {
  try {
    const { subPackages } =  JSON.parse(content)
    const subPackageList: string[] = []
    if (subPackages && Array.isArray(subPackages)) {
      subPackages.forEach(subPackage => {
        if (subPackage.root) {
          // 记录绝对路径
          subPackageList.push(path.resolve(subPackage.root))
        }
      })
    }
    // console.log('subPackageList', subPackageList)
    return subPackageList
  } catch (e) {
    console.error(`Error parsing ${appJsonName}.json:`, e)
  }
}

/**
 * 同时满足以下两个条件：
 * 1. 引入的组件是分包组件
 * 2. 当前组件/页面与引入的组件不属于一个包
 * 
 * @param content - JSON 文件内容
 * @param key - 当前 JSON 文件的路径
 * @param subPackageList - 分包列表
 * @returns 处理后的 JSON 内容
 */
function parseNormalJson(content: string, key: string, subPackageList: string[]) {
  try {
    // 记录需要添加 placeholder 的组件名称
    const recordList: string[] = []
    const currentAbsolutePath = path.resolve(key)
    const json = JSON.parse(content)
    const { usingComponents } = json
    if (!usingComponents) return content
    Object.keys(usingComponents).forEach((componentName) => {
      // 引入的组件路径
      const componentPath = usingComponents[componentName]
      const dirname = getDirname(key)
      const absoluteComponentPath = path.resolve(dirname, componentPath)
      // console.log(`resolve`, key, dirname, componentPath, absoluteComponentPath)
      // 如果不是分包组件，则不处理
      const { bool, subPackagePath } = hanldeIsSubPackageComponent(absoluteComponentPath, subPackageList)
      if (!bool) return
      // 如果当前组件/页面与引入的组件属于同一个包，则不处理
      // const isSamePackage = absoluteComponentPath.startsWith(currentAbsolutePath)
      const isSamePackage = handleIsSamePackage({ packagePath: subPackagePath, pathList: [absoluteComponentPath, currentAbsolutePath] })
      // console.log(`isSamePackage`, absoluteComponentPath, currentAbsolutePath, isSamePackage)
      if (isSamePackage) return
      recordList.push(componentName)
    })
    if (!recordList.length) return content
    recordList.forEach((componentName) => {
      if (!json.componentPlaceholder) {
        json.componentPlaceholder = {
          [componentName]: 'view'
        }
      } else {
        json.componentPlaceholder[componentName] = 'view'
      }
    })
    // console.log(`parseNormalJson`, key, json)
    return JSON.stringify(json)
  } catch (error) {
    console.error(`parseNormalJson Error parsing ${key}.json:`, error)
    return content
  }
}

function getDirname(filePath: string) {
  const list = filePath.split('/')
  list.pop()
  return list.join('/')
}

function handleIsSamePackage({packagePath, pathList}: {packagePath: string, pathList: string[]}) {
  return pathList.every(path => path.startsWith(packagePath))
}

/**
 * 判断当前组件/页面是否在分包中
 */
function hanldeIsSubPackageComponent(path: string, subPackageList: string[]) {
  let isIn = false
  let subPath = ''
  subPackageList.some(subPackagePath => {
    const bool = isIn = path.startsWith(subPackagePath)
    if (bool) {
      // 如果是分包组件，则记录分包路径
      subPath = subPackagePath
    }
    // console.log(`isSubPackageComponent`, path, subPackagePath, bool)
    return bool
  })
  return {
    bool: isIn,
    subPackagePath: subPath
  }
}
let subPackageList: string[] | void = []
function handleJson(content, key) {
  if (isAppJson(key)) {
    subPackageList = collectSubPackages(content)
    // console.log(`subPackageList`, subPackageList)
    return content
  }
  if (!subPackageList || !Array.isArray(subPackageList)) return content
  // 处理 页面Json 和 组件Json
  return parseNormalJson(content, key, subPackageList)
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
    pagesJsonPlugin.generateBundle = async function () {
      findChangedJsonFiles().forEach((value, key) => {
        // console.log('uni:mp-pages-json', key);
        /**
         * 会第一个处理app.json
         */
        const contentStr = handleJson(value, key)
        // 将处理后的 JSON 文件作为资产输出
        this.emitFile({
            type: 'asset',
            fileName: key + '.json',
            source: contentStr,
        });
      })
    }
  }
    
}
