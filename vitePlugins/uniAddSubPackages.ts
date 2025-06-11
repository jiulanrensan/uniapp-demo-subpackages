import { PluginOption } from 'vite'
export function uniAddSubPackagesPlugin(): PluginOption {
  return {
    name: 'uni:add-sub-packages',
    enforce: 'pre',
    apply() {
      return ['mp-weixin'].includes(process.env.UNI_PLATFORM!)
    },
    configResolved(config) {
      // const { subPackages } = config.build
      // if (subPackages && Array.isArray(subPackages)) {
      //   subPackages.forEach((subPackage) => {
      //     if (subPackage.root) {
      //       // 记录绝对路径
      //       subPackage.root = subPackage.root.replace(/^\.\//, '')
      //     }
      //   })
      // }
    },
    transform(code, id) {
      console.log('Transforming:', id)
      // console.log('Code length:', code)
      return {
        code: code,
        map: { mappings: '' } // 如果需要source map，可以在这里生成
      }
    }
  }
}