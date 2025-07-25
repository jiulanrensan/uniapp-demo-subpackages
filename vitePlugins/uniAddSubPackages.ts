import { PluginOption } from 'vite'
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import path from 'path'
import { parseJson } from '@dcloudio/uni-cli-shared'
import fs from 'fs'
const appJsonName = 'app.json'

function isAppJson(fileName: string) {
  return fileName === appJsonName
}

function collectSubPackages() {
  try {
    const content = fs.readFileSync(path.resolve(process.env.UNI_INPUT_DIR!, 'pages.json'), 'utf-8')
    const { subPackages } =  parseJson(content)
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
    return []
  }
}
const subPackageList = collectSubPackages()

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

function getDirname(filePath) {
	// const list = filePath.split('/')
	// list.pop()
	// const newPath = list.join('/')
	const newPath = path.dirname(filePath)
	// console.log('filePath, newPath', filePath, newPath)
	return newPath
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
function handleJson(content: string, key: string) {
  // if (isAppJson(key)) {
  //   subPackageList = collectSubPackages(content)
  //   // console.log(`subPackageList`, subPackageList)
  //   return content
  // }
  if (!subPackageList || !Array.isArray(subPackageList)) return content
  // 处理 页面Json 和 组件Json
  return parseNormalJson(content, key, subPackageList)
}


function isExcludePath(id: string) {
  // 排除包含 'common/vendor.js' 和 'common/assets.js' 的路径
  const excludePath = ['common/vendor.js', 'common/assets.js'].some(path => id.includes(path))
  if (excludePath) return true
  return false
}

/**
 * 检查引用的js是否在分包中，且与当前组件/页面不属于同一个包
 * 是 返回 true
 * 否 返回 false
 */
function checkJSRequire(currentFileId, requirePath) {
	// console.log(`找到 require 语句: const ${variableName} = require('${requirePath}')`)
	const dirname = getDirname(currentFileId)
	const currentAbsolutePath = path.resolve(currentFileId)
	const absoluteJsPath = path.resolve(dirname, requirePath)
	// console.log(`引入文件的绝对路径: ${absoluteJsPath}`)
	// console.log(`当前文件的绝对路径: ${currentAbsolutePath}`)
	// 如果不是分包组件，则不处理
	const { bool, subPackagePath } = hanldeIsSubPackageComponent(absoluteJsPath, subPackageList)
	// console.log(`是否是分包组件: ${bool}`)
	if (!bool) return false
	// console.log(`分包路径: ${subPackagePath}`)
	// 如果当前组件/页面与引入的js属于同一个包，则不处理
	const isSamePackage = handleIsSamePackage({
		packagePath: subPackagePath,
		pathList: [absoluteJsPath, currentAbsolutePath]
	})
	// console.log(`是否是同一个包: ${isSamePackage}`)
	if (isSamePackage) return false
	return true
}

function handleUniappCode(code: string, id: string) {
  const ast = parse(code, {
    // @ts-ignore
    sourceType: 'commonjs',
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
  
     // 存储 require 语句的变量名和对应的路径
   const requireModules = new Map(); // key: 变量名, value: 路径
   // 存储需要修改的 require 语句的 AST 路径
   const requirePaths = new Map(); // key: 变量名, value: AST路径
   let isModified = false
  traverse(ast, {
    VariableDeclarator(astPath) {
      const node = astPath.node;
      
      // 检查是否是 require 语句
      if (node.init && node.init.type === 'CallExpression' && 
          node.init.callee.type === 'Identifier' && 
          node.init.callee.name === 'require') {
        
        const variableName = node.id.name;
        const requirePath = node.init.arguments[0].value;
        if (isExcludePath(requirePath)) return
        const bool = checkJSRequire(id, requirePath)
				if (!bool) return
        // 记录 require 模块信息和 AST 路径
        requireModules.set(variableName, requirePath);
        requirePaths.set(variableName, astPath);
        console.log('---', 'variableName', variableName, 'requirePath', requirePath);
        
      }
    },
    /**
     * 低版本的uniapp会莫名其妙的 require全局js文件，尤其是引入分包的js文件，会导致报错
     * 所以这里会把引入分包的js require 语句删除
     * 复现版本："@dcloudio/uni-app": "3.0.0-3061520221228001"
     * 在最新版本(@dcloudio/uni-app": "3.0.0-4030620241128001)的输出文件中，已经没有require全局js文件了
     */
    ExpressionStatement(path) {
			const node = path.node
			if (
				node.expression.type === 'CallExpression' &&
				node.expression.callee.type === 'Identifier' &&
				node.expression.callee.name === 'require' &&
				node.expression.arguments.length === 1 &&
				node.expression.arguments[0].type === 'StringLiteral'
			) {
				const requirePath = node.expression.arguments[0].value
				if (requirePath.includes('wxbarcode')) {
					console.log(`${id}, 打印 require('${requirePath}')`)
				}
				const bool = checkJSRequire(id, requirePath)
				if (!bool) return
				path.remove()
			}
		},
    
    AwaitExpression(astPath) {
      const awaitNode = astPath.node;
      const argument = awaitNode.argument;
      /**
       * 如果 requireModules 为空，则不处理，提升性能
       */
      if (requireModules.size === 0) return
      // 检查 await 后面是否是成员表达式（如 subA_coupon_index.couponModule）
      if (argument.type === 'MemberExpression' && 
          argument.object.type === 'Identifier' && 
          argument.property.type === 'Identifier') {
        
        const objectName = argument.object.name;
        const propertyName = argument.property.name;
        
                 // 检查这个对象名是否是我们记录的 require 模块
         if (requireModules.has(objectName)) {
           const requirePath = requireModules.get(objectName);
           const requirePathNode = requirePaths.get(objectName);
           isModified = true
           console.log(`找到 await 语句: await ${objectName}.${propertyName}`);
           console.log(`对应的 require 路径: ${requirePath}`);
           
           // 修改对应的 require 语句为 require.async
           if (requirePathNode) {
             const newRequireAsync = t.callExpression(
               t.memberExpression(
                 t.identifier('require'),
                 t.identifier('async')
               ),
               [t.stringLiteral(requirePath)]
             );
             requirePathNode.node.init = newRequireAsync;
             console.log(`修改 require 语句: const ${objectName} = require.async('${requirePath}')`);
           }
          
          // 创建新的 await 表达式
          const newAwaitExpression = t.awaitExpression(
            t.callExpression(
              t.memberExpression(
                t.identifier(objectName),
                t.identifier('then')
              ),
              [
                t.arrowFunctionExpression(
                  [t.objectPattern([
                    t.objectProperty(
                      t.identifier(propertyName),
                      t.identifier(propertyName),
                      false,
                      true
                    )
                  ])],
                  t.identifier(propertyName)
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
  console.log('requireModules.size', requireModules.size)
  /**
   * 如果未修改，则不调用 generate, 提升性能
   */
  if (!isModified) return code
  // 生成转换后的代码
  const output = generate(ast, {
    retainLines: false,
    compact: false,
    comments: false
  });
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
    renderChunk(code, chunk, options) {
      // console.log('uni:add-sub-packages renderChunk', process.env.UNI_INPUT_DIR)
      // console.log('uni:add-sub-packages renderChunk', chunk.fileName)
      // if (chunk.fileName.includes('pages/index/index')) {
      //   console.log('uni:add-sub-packages renderChunk', code)
      // }
      if (isExcludePath(chunk.fileName)) return code
      const newCode = handleUniappCode(code, chunk.fileName)
      return newCode
    },
    generateBundle(options, bundle) {
      // 在这里处理 uni:mp-pages-json 插件输出的文件
      // console.log('uni:add-sub-packages generateBundle')
      /**
       * 优先处理app.json
       * 然后处理其他页面和组件的json
       * 不能保证Object.keys的顺序
       * app.json不需要重新处理，仅记录
       * 热更新时不会有app.json
       */
      // const appJson = bundle[appJsonName]
      // if (appJson) {
      //   handleJson((appJson as OutputAsset).source as string, appJsonName)
      // }
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