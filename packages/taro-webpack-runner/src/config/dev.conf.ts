/**
 * @description dev时，生成对应配置的函数
 */

import * as path from 'path'
import { get, mapValues, merge } from 'lodash'
import { addLeadingSlash, addTrailingSlash } from '../util'
import {
  getCopyWebpackPlugin,
  getDefinePlugin,
  getDevtool,
  getHtmlWebpackPlugin,
  getMiniCssExtractPlugin,
  getMainPlugin,
  getModule,
  getOutput,
  processEnvOption
} from '../util/chain'
import { BuildConfig } from '../util/types'
import getBaseChain from './base.conf'

const emptyObj = {}

export default function (appPath: string, config: Partial<BuildConfig>): any {
  // 获取基础webpack chain 配置实例
  const chain = getBaseChain(appPath, config)
  // 将用户自定义配置结构赋值
  const {
    alias = {},
    copy,
    entry = emptyObj,
    entryFileName = 'app',
    output = emptyObj,
    sourceRoot = 'src',
    outputRoot = 'dist',
    publicPath = '',
    staticDirectory = 'static',
    chunkDirectory = 'chunk',
    router = emptyObj,

    designWidth = 750,
    deviceRatio,
    enableSourceMap = true,
    sourceMapType,
    enableExtract = false,

    defineConstants = emptyObj,
    env = emptyObj,
    styleLoaderOption = emptyObj,
    cssLoaderOption = emptyObj,
    sassLoaderOption = emptyObj,
    lessLoaderOption = emptyObj,
    stylusLoaderOption = emptyObj,
    mediaUrlLoaderOption = emptyObj,
    fontUrlLoaderOption = emptyObj,
    imageUrlLoaderOption = emptyObj,

    miniCssExtractPluginOption = emptyObj,
    esnextModules = [],

    useHtmlComponents = false,

    postcss = emptyObj
  } = config
  const sourceDir = path.join(appPath, sourceRoot)
  const outputDir = path.join(appPath, outputRoot)
  const plugin = {} as any

  const isMultiRouterMode = get(router, 'mode') === 'multi'
  // 根据选择的语言框架（react/vue),获取对应的插件
  plugin.mainPlugin = getMainPlugin({
    framework: config.framework,
    entryFileName,
    sourceDir,
    outputDir,
    routerConfig: router,
    useHtmlComponents,
    designWidth,
    deviceRatio
  })

  if (enableExtract) {
    // 处理css样式，抽离样式到样式表的插件
    plugin.miniCssExtractPlugin = getMiniCssExtractPlugin([
      {
        filename: 'css/[name].css',
        chunkFilename: 'css/[name].css'
      },
      miniCssExtractPluginOption
    ])
  }
  // 复制插件添加
  if (copy) {
    plugin.copyWebpackPlugin = getCopyWebpackPlugin({ copy, appPath })
  }

  if (isMultiRouterMode) {
    merge(plugin, mapValues(entry, (_filePath, entryName) => {
      return getHtmlWebpackPlugin([{
        filename: `${entryName}.html`,
        template: path.join(appPath, sourceRoot, 'index.html'),
        chunks: [entryName]
      }])
    }))
  } else {
    plugin.htmlWebpackPlugin = getHtmlWebpackPlugin([{
      filename: 'index.html',
      template: path.join(appPath, sourceRoot, 'index.html')
    }])
  }
  plugin.definePlugin = getDefinePlugin([processEnvOption(env), defineConstants])

  const mode = 'development'

  chain.merge({
    mode,
    devtool: getDevtool({ enableSourceMap, sourceMapType }),
    entry,
    output: getOutput(appPath, [{
      outputRoot,
      publicPath: addLeadingSlash(addTrailingSlash(publicPath)),
      chunkDirectory
    }, output]),
    resolve: { alias },
    module: getModule(appPath, {
      designWidth,
      deviceRatio,
      enableExtract,
      enableSourceMap,

      styleLoaderOption,
      cssLoaderOption,
      lessLoaderOption,
      sassLoaderOption,
      stylusLoaderOption,
      fontUrlLoaderOption,
      imageUrlLoaderOption,
      mediaUrlLoaderOption,
      esnextModules,

      postcss,
      staticDirectory
    }),
    plugin,
    optimization: {
      noEmitOnErrors: true
    }
  })

  return chain
}
