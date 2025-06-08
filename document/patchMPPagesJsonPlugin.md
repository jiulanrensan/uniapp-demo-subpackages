## `patchMPPagesJsonPlugin`插件说明
参考uniapp源码`node_modules/@dcloudio/uni-mp-vite/dist/plugins/pagesJson.js`

uniapp封装了一个vite插件，name为`uni:mp-pages-json`，这个插件是会生成
- `app.json`
- 页面`json`
- 组件`json`

分包异步化组件需要添加`componentPlaceholder`属性

### 什么情况需要添加`componentPlaceholder`属性
同时满足以下两个条件：

1. 引入的组件是分包组件
2. 当前组件/页面与引入的组件不属于一个包

#### 判断引入的组件是分包组件
记录主包路径，非主包路径即分包组件

#### 判断引用的组件是否是当前包内的组件
```shell
# 当前是分包
# subA/first/index
# 引入主包组件
# ../../pages/components/bbb/index
```
先排除引入主包组件的情况

```shell
# 当前是主包页面
# pages/index/index
# 引入的分包组件路径
# ../../subA/first/index
```
```shell
# 当前是主包组件
# pages/components/hello/index
# 引入的分包组件路径
# ../../../subA/third/index
```

```shell
# 当前是分包A
# subA/second/index
# 引入分包A组件
# ../aaa/empty
```
```shell
# 当前是分包B
# subB/share/index
# 引入分包A组件
# ../../subA/aaa/empty
```
