## `patchMPPagesJsonPlugin`插件说明
参考uniapp源码`node_modules/@dcloudio/uni-mp-vite/dist/plugins/pagesJson.js`

uniapp封装了一个vite插件，name为`uni:mp-pages-json`，这个插件是会生成
- `app.json`
- 页面`json`
- 组件`json`

分包异步化组件需要添加`componentPlaceholder`属性

### 如何判断引用的组件是否是当前包内的组件