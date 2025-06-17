## 记录
### 直接在vue文件中引入分包的组件，生成的index.json会自动处理路径，我需要处理componentPlaceholder
1. 如何判断这是一个分包异步组件
2. 如何在编译阶段拿到编译后的index.json

### 引用分包组件情况
#### 主包页面引入分包组件
```shell
# subA/first
- index.vue
- utils.ts
```
在`index.vue`中引用了`utils.ts`，编译后目录结构和文件：
```js
// subA/first/index
const index = require("../../index.js");
wx.createPage(index._sfc_main);

// subA/first/utils
function print() {
  console.log("first print");
}
exports.print = print;

// /index
// 直接引入分包的utils
const subA_first_utils = require("./subA/first/utils.js");
const common_vendor = require("./common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    common_vendor.onMounted(() => {
      subA_first_utils.print();
    });
    return (_ctx, _cache) => {
      return {};
    };
  }
};
exports._sfc_main = _sfc_main;
```

#### 分包组件引主包组件
略

#### 分包组件引分包组件
可以正常打包，也类似主包引分包，会在主包有这样的引入:
```js
// 直接引入分包的utils
const subA_first_utils = require("./subA/first/utils.js");
```

#### 主包组件引分包组件
需要在主包组件上加`componentPlaceholder`

### 分包里的哪些文件会被uniapp过滤掉？
在pages.json声明了分包
```json
{
  "root" : "subB",
  "pages" : []
}
```
但`pages`是空，此时如果该分包组件有在主包被引用，那么这个分包里的组件文件就会被打包到。
如果js文件也被主包引用，那么分包里的这个js文件也会被打包到


## 参考文章
https://juejin.cn/post/7343811070694047798
https://juejin.cn/post/7315670922291953704