/**
 * 处理 esmodule
 */
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

import { code } from './code.js';

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

process.env.UNI_INPUT_DIR = 'D:\\coding\\babelDemo\\src'

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

traverse.default(ast, {
  ImportDeclaration(path) {
    // 获取 import 语句
    const importNode = path.node;
    
    // 提取导入的来源 (y in "import x from y")
    const source = importNode.source.value;
    
    // 处理默认导入 (import x from y)
    // if (importNode.specifiers.length === 1 && importNode.specifiers[0].type === 'ImportDefaultSpecifier') {
    //   const defaultImport = importNode.specifiers[0].local.name;
    //   console.log(`默认导入: ${defaultImport} from "${source}"`);
    // }
    
    // 处理命名导入 (import { x } from y)
    // const namedImports = importNode.specifiers
    //   .filter(specifier => specifier.type === 'ImportSpecifier')
    //   .map(specifier => {
    //     const imported = specifier.imported ? specifier.imported.name : specifier.local.name;
    //     const local = specifier.local.name;
    //     return { imported, local };
    //   });
    
    // if (namedImports.length > 0) {
    //   console.log(`命名导入 from "${source}":`, namedImports);
    // }
    
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
      path.replaceWith(newRequireStatement);
      
      console.log(`转换后的语句: const ${pathVariableName} = require.async('${source}')`);
      console.log('---');
      
      // 记录命名空间导入的变量名和对应的路径变量名
      namespaceSpecifiers.forEach(name => {
        namespaceImports.set(name, pathVariableName);
      });
    }
  },
  
  AwaitExpression(path) {
    const awaitNode = path.node;
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
        path.replaceWith(newAwaitExpression);
        
        // 获取父级语句（通常是 VariableDeclaration 或 ExpressionStatement）
        const parentStatement = path.findParent((p) => 
          p.isVariableDeclaration() || p.isExpressionStatement()
        );
        
        if (parentStatement) {
          const statementCode = generate.default(parentStatement.node).code;
          console.log(`修改后的完整语句: ${statementCode}`);
        }
        
        console.log('---');
      }
    }
  }
})

// 生成转换后的代码
const output = generate.default(ast, {
  retainLines: false,
  compact: false,
  comments: false
});

console.log('\n=== 转换后的完整代码 ===');
console.log(output.code);