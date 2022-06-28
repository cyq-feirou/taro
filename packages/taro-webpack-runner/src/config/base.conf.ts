/**
 * @description 构建基础webpack配置的函数
 */
import * as path from 'path'
// 该模块导出了一个用于创建一个 webpack 配置 API 的单一构造函数。
import * as Chain from 'webpack-chain'
// Taro 3 里的多端文件由 MultiPlatformPlugin 插件进行解析。
import { MultiPlatformPlugin } from '@tarojs/runner-utils'
// 导入获取rootpath方法
import { getRootPath } from '../util'
// config类型定义
import { BuildConfig } from '../util/types'

// webpack-chain是什麼：通过链式的方式修改webpack的配置。
// 參考資料：
// 1. https://zhuanlan.zhihu.com/p/379449467
// 2. https://github.com/neutrinojs/webpack-chain/tree/v5
export default (appPath: string, _config: Partial<BuildConfig>) => {
  // 对该单一构造函数创建一个新的配置实例, 整个webpack 打包配置都是基于这个实例进行整合的
  const chain = new Chain()
  // 别名定义
  const alias: Record<string, string> = {
    '@tarojs/taro': '@tarojs/taro-h5'
  }
  // 合并webpack的配置
  chain.merge({
    resolve: {
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.vue'],
      mainFields: ['main:h5', 'browser', 'module', 'jsnext:main', 'main'],
      symlinks: true,
      modules: [path.join(appPath, 'node_modules'), 'node_modules'],
      alias
    },
    resolveLoader: {
      modules: [path.join(getRootPath(), 'node_modules'), 'node_modules']
    }
  })
  // 我们需要解析 NPM 包 described-resolve 里面的多端文件，可以利用 WebpackChain 为 MultiPlatformPlugin 插件添加 include 配置：
  // webpack-chain添加plugin: MultiPlatformPlugin, 用于解析多端文件
  chain.resolve
  // plugin('MultiPlatformPlugin') 这里的'MultiPlatformPlugin'，是webpack-chain里的key，就是要加入的插件在webpack-chain配置里的key
    .plugin('MultiPlatformPlugin')
  // MultiPlatformPlugin 使用的webpack插件名，在这里，可以直接使用插件，无需进行实例化，就是不需要new WebpackPlugin()
  // args 插件的参数信息。特别注意，args是一个数组，例如[{},{}]这种方式，可以配置多个插件实例。???
    .use(MultiPlatformPlugin, ['described-resolve', 'resolve', {
      chain
    }])

  return chain
}
