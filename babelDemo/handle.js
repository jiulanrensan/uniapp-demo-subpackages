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

traverse.default(ast, {
  VariableDeclarator(path) {
    const node = path.node;
    
    // 检查是否是 require 语句
    if (node.init && node.init.type === 'CallExpression' && 
        node.init.callee.type === 'Identifier' && 
        node.init.callee.name === 'require') {
      
      const variableName = node.id.name;
      const requirePath = node.init.arguments[0].value;
      
      // 排除包含 'common/vendor.js' 和 'common/assets.js' 的路径
      if (!requirePath.includes('common/vendor.js') && !requirePath.includes('common/assets.js')) {
        console.log('---');
        console.log(`找到 require 语句: const ${variableName} = require('${requirePath}')`);
        
        // 记录 require 模块信息
        requireModules.set(variableName, requirePath);
        console.log('---');
      }
    }
  },
  
  AwaitExpression(path) {
    const awaitNode = path.node;
    const argument = awaitNode.argument;
    
    // 检查 await 后面是否是成员表达式（如 subA_coupon_index.couponModule）
    if (argument.type === 'MemberExpression' && 
        argument.object.type === 'Identifier' && 
        argument.property.type === 'Identifier') {
      
      const objectName = argument.object.name;
      const propertyName = argument.property.name;
      
      // 检查这个对象名是否是我们记录的 require 模块
      if (requireModules.has(objectName)) {
        const requirePath = requireModules.get(objectName);
        
        console.log(`找到 await 语句: await ${objectName}.${propertyName}`);
        console.log(`对应的 require 路径: ${requirePath}`);
        
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