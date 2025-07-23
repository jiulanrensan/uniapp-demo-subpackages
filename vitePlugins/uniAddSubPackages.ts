import { PluginOption } from 'vite'
import {OutputAsset} from 'rollup'
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import path from 'path'
const appJsonName = 'app.json'
const vendorJs = 'vendor.js'

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
function handleJson(content: string, key: string) {
  if (isAppJson(key)) {
    subPackageList = collectSubPackages(content)
    // console.log(`subPackageList`, subPackageList)
    return content
  }
  if (!subPackageList || !Array.isArray(subPackageList)) return content
  // 处理 页面Json 和 组件Json
  return parseNormalJson(content, key, subPackageList)
}

/**
 * 获取文件扩展名
 * @param {string} url 文件URL
 * @returns {string} 文件扩展名（不包含点号）
 */
function getFileExtension(url: string) {
  if (!url) return null
  // 先去除查询参数
  const [urlWithoutQuery, query] = url.split('?')
  // 获取最后一个点号后的内容
  const lastDotIndex = urlWithoutQuery.lastIndexOf('.')
  if (lastDotIndex === -1) return ''
  const extension = urlWithoutQuery.substring(lastDotIndex + 1).toLowerCase()
  const queryParams = (query ? query.split('&').reduce((acc, param) => {
    const [key, value] = param.split('=')
    acc[key] = value
    return acc
  }, {}) : {}) as Record<string, string>
  return {
    extension,
    queryParams
  }
}


function isExcludePath(id: string) {
  const excludePath = ['node_modules', 'uni_modules', 'uniComponent', 'uniPage'].some(path => id.includes(path))
  if (excludePath) return true
  const fileExtension = getFileExtension(id)
  if (!fileExtension) return true
  const { extension, queryParams } = fileExtension
  if (extension === 'vue' && queryParams.type === 'style') {
    return true
  }
  return false
}

// 路径转换函数：将路径转换为变量名
function convertPathToVariableName(path) {
  return path
    .replace(/^[@./]+/, '') // 移除开头的 @、.、/ 等字符
    .replace(/\.\./g, '') // 移除 ..
    .replace(/[\/\\]/g, '_') // 将斜杠替换为下划线
    .replace(/\./g, '_') // 将点替换为下划线
    .replace(/^_+/, '') // 移除开头的下划线
    .replace(/_+$/, ''); // 移除结尾的下划线
}

function handleUniappCode(code: string, id: string) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: [
      'jsx', 
      'typescript',
      'decorators',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'importMeta',
      'logicalAssignment',
      'nullishCoalescingOperator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining'
    ]
  });

  // 存储命名空间导入的变量名和对应的路径变量名
  const namespaceImports = new Map(); // key: 导入变量名, value: 路径变量名

  traverse(ast, {
    ImportDeclaration(astPath) {
      // 获取 import 语句
      const importNode = astPath.node;
      
      // 提取导入的来源 (y in "import x from y")
      let source = importNode.source.value;
      
             // 处理以 '@/' 开头的路径，将其转换为相对路径
       if (source.startsWith('@/')) {
         // 将 @ 替换为 process.env.UNI_INPUT_DIR，并统一路径分隔符为 '/'
         const uniInputDir = (process.env.UNI_INPUT_DIR || '').replace(/\\/g, '/');
         const absoluteSourcePath = source.replace('@', uniInputDir);
         
         // 确保 id 也使用正斜杠
         const normalizedId = id.replace(/\\/g, '/');
         
         // 计算相对于当前文件的路径
         const currentFileDir = path.dirname(normalizedId);
         const relativePath = path.relative(currentFileDir, absoluteSourcePath);
         
         // 将 path.relative 返回的反斜杠路径转换为正斜杠
         const normalizedRelativePath = (relativePath.startsWith('.') ? relativePath : `./${relativePath}`).replace(/\\/g, '/');
        console.log('normalizedId, currentFileDir', normalizedId, currentFileDir)
         console.log('relativePath', relativePath)
        console.log(`路径转换: ${source} -> ${normalizedRelativePath}`);
        console.log(`当前文件: ${id}`);
        console.log(`绝对路径: ${absoluteSourcePath}`);
        console.log(`相对路径: ${normalizedRelativePath}`);
        
        // 更新 source 为相对路径
        source = normalizedRelativePath;
        
        // 更新 AST 中的 source 值
        importNode.source.value = source;
      }
      
      // 处理命名空间导入 (import * as x from y)
      const namespaceSpecifiers = importNode.specifiers
        .filter(specifier => specifier.type === 'ImportNamespaceSpecifier')
        .map(specifier => specifier.local.name);
      
      if (namespaceSpecifiers.length > 0) {
        console.log('---'); 
        console.log(`命名空间导入 from "${source}":`, namespaceSpecifiers);
        
        // 转换路径为变量名
        const pathVariableName = convertPathToVariableName(source);
        console.log(`路径变量名: ${pathVariableName}`);
        
        // 创建新的 require.async 语句
        const newRequireStatement = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(pathVariableName),
            t.callExpression(
              t.memberExpression(
                t.identifier('require'),
                t.identifier('async')
              ),
              [t.stringLiteral(source)]
            )
          )
        ]);
        
        // 替换原来的 import 语句
        astPath.replaceWith(newRequireStatement);
        
        console.log(`转换后的语句: const ${pathVariableName} = require.async('${source}')`);
        console.log('---');
        
        // 记录命名空间导入的变量名和对应的路径变量名
        namespaceSpecifiers.forEach(name => {
          namespaceImports.set(name, pathVariableName);
        });
      }
    },
    
    AwaitExpression(astPath) {
      const awaitNode = astPath.node;
      const argument = awaitNode.argument;
      
      // 检查 await 后面是否是标识符（变量名）
      if (argument.type === 'Identifier') {
        const variableName = argument.name;
        
        // 检查这个变量名是否是我们记录的命名空间导入
        if (namespaceImports.has(variableName)) {
          const pathVariableName = namespaceImports.get(variableName);
          
          console.log(`找到 await 语句: await ${variableName}`);
          console.log(`对应的路径变量名: ${pathVariableName}`);
          
          // 创建新的 await 表达式
          const newAwaitExpression = t.awaitExpression(
            t.callExpression(
              t.memberExpression(
                t.identifier(pathVariableName),
                t.identifier('then')
              ),
              [
                t.arrowFunctionExpression(
                  [t.objectPattern([
                    t.objectProperty(
                      t.identifier(variableName),
                      t.identifier(variableName),
                      false,
                      true
                    )
                  ])],
                  t.identifier(variableName)
                )
              ]
            )
          );
          
          // 替换原来的 await 表达式
          astPath.replaceWith(newAwaitExpression);
          
          // 获取父级语句（通常是 VariableDeclaration 或 ExpressionStatement）
          const parentStatement = astPath.findParent((p) => 
            p.isVariableDeclaration() || p.isExpressionStatement()
          );
          
          if (parentStatement) {
            const statementCode = generate(parentStatement.node).code;
            console.log(`修改后的完整语句: ${statementCode}`);
          }
          
          console.log('---');
        }
      }
    }
  })

  // 生成转换后的代码
  const output = generate(ast, {
    retainLines: false,
    compact: false,
    comments: false
  });

  // console.log('\n=== 转换后的完整代码 ===');
  // console.log(output.code);
  return output.code
}

export function uniAddSubPackagesPlugin(): PluginOption {
  return {
    name: 'uni:add-sub-packages',
    enforce: 'post',
    apply() {
      // console.log('uni:add-sub-packages apply', process.env.UNI_PLATFORM)
      return ['mp-weixin'].includes(process.env.UNI_PLATFORM!)
    },
    /**
     * https://github.com/dcloudio/uni-app/blob/next/packages/vite-plugin-uni/src/config/resolve.ts
     */
    transform(code, id) {
      /**
       * script设置了lang=ts的时候
       * pages/index/index.vue 文件会解析为三个：
       * pages/index/index.vue,
       * pages/index/index.vue?vue&type=style&index=0&lang.css
       * pages/index/index.vue?vue&type=script&setup=true&lang.ts
       * 
       * script 没有设置lang或setup的时候，只会有pages/index/index.vue
       */
      /**
       * id要排除掉node_modules
       */
      if (isExcludePath(id)) return
      console.log('uni:add-sub-packages transform', id)
      // if (id.includes('components/hello/index')) {
      //   console.log('uni:add-sub-packages transform', id, code)
      // }
      const newCode = handleUniappCode(code, id)
      // if (id.includes('components/hello/index')) {
      //   console.log('uni:add-sub-packages transform', id, newCode)
      // }
      return newCode
      // return null
    },
    generateBundle(options, bundle) {
      // 在这里处理 uni:mp-pages-json 插件输出的文件
      // console.log('uni:add-sub-packages generateBundle', Object.keys(bundle))
      /**
       * 优先处理app.json
       * 然后处理其他页面和组件的json
       * 不能保证Object.keys的顺序
       * app.json不需要重新处理，仅记录
       * 热更新时不会有app.json
       */
      const appJson = bundle[appJsonName]
      if (appJson) {
        handleJson((appJson as OutputAsset).source as string, appJsonName)
      }
      Object.keys(bundle).forEach(fileName => {
        const asset = bundle[fileName]
        if (fileName.endsWith('.json') && fileName !== appJsonName) {
          if (asset.type === 'asset') {
            // console.log(`Processing ${fileName}`, asset.source)
            const content = handleJson(asset.source as string, fileName)
            asset.source = content
            // console.log(`Processed ${fileName}`, content)
            // 覆盖会警告
            /**
             * 重新覆盖
             */
            // this.emitFile({
            //   type: 'asset',
            //   fileName: fileName, // 同名覆盖
            //   source: content
            // })
          }  
        }
      })  
    }  
  }
}