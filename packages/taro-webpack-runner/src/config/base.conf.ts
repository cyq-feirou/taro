/**
 * @description 构建基础webpack配置的函数
 */
import * as path from 'path'
import * as Chain from 'webpack-chain'
// Taro 3 里的多端文件由 MultiPlatformPlugin 插件进行解析。
import { MultiPlatformPlugin } from '@tarojs/runner-utils'

import { getRootPath } from '../util'
import { BuildConfig } from '../util/types'

// webpack-chain是什麼：通过链式的方式修改webpack的配置。
// 參考資料：
// 1. https://zhuanlan.zhihu.com/p/379449467
// 2. https://github.com/neutrinojs/webpack-chain/tree/v5
export default (appPath: string, _config: Partial<BuildConfig>) => {
  const chain = new Chain()
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
  // .use 和 .tap??？
  chain.resolve
    .plugin('MultiPlatformPlugin')
    .use(MultiPlatformPlugin, ['described-resolve', 'resolve', {
      chain
    }])

  return chain
}
