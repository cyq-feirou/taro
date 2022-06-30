/**
 * @description prod build 的配置文件
 */
import * as path from 'path'
import { get, mapValues, merge } from 'lodash'
import { addTrailingSlash, emptyObj } from '../util'
import {
  getCopyWebpackPlugin,
  getCssoWebpackPlugin,
  getDefinePlugin,
  getDevtool,
  getHtmlWebpackPlugin,
  getMiniCssExtractPlugin,
  getMainPlugin,
  getModule,
  getOutput,
  getTerserPlugin,
  processEnvOption
} from '../util/chain'
import { BuildConfig } from '../util/types'
import getBaseChain from './base.conf'

export default function (appPath: string, config: Partial<BuildConfig>): any {
  // 获取 webpack chain 配置实例
  const chain = getBaseChain(appPath, config)
  const {
    alias = emptyObj,
    copy,
    entry = emptyObj,
    entryFileName = 'app',
    output = emptyObj,
    sourceRoot = '',
    outputRoot = 'dist',
    publicPath = '',
    staticDirectory = 'static',
    chunkDirectory = 'chunk',
    router = emptyObj,

    designWidth = 750,
    deviceRatio,
    enableSourceMap = false,
    sourceMapType,
    enableExtract = true,

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

    postcss,
    csso,
    uglify,
    terser
  } = config
  const sourceDir = path.join(appPath, sourceRoot)
  const outputDir = path.join(appPath, outputRoot)
  // 【判断路由模式是否是multi
  const isMultiRouterMode = get(router, 'mode') === 'multi'

  const plugin: any = {}
  // 根据选择的语言框架（react/vue),获取对应的插件
  // getMainPlugin 得到的数据结构如下；getMiniCssExtractPlugin，getCopyWebpackPlugin，
  // return {
  //   plugin: MainPlugin,
  //   args: [{
  //   framework: config.framework,
  //   entryFileName,
  //   sourceDir,
  //   outputDir,
  //   routerConfig: router,
  //   useHtmlComponents,
  //   designWidth,
  //   deviceRatio
  // }]
  // }
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
    // 获取将css提前到css样式表的插件及其args
    plugin.miniCssExtractPlugin = getMiniCssExtractPlugin([
      {
        filename: 'css/[name].css',
        chunkFilename: 'css/[name].css'
      },
      miniCssExtractPluginOption
    ])
  }
  // appPath是 根目录??
  if (copy) {
    plugin.copyWebpackPlugin = getCopyWebpackPlugin({ copy, appPath })
  }
  // isMultiRouterMode 是否是多页面应用： 'multi' 对应多页面应用路由模式
  if (isMultiRouterMode) {
    // 根据entry的配置，生成 打包多页面应用 的 htmlWebpackPlugin 配置，合并到plugin上面
    merge(plugin, mapValues(entry, (_filePath, entryName) => {
      return getHtmlWebpackPlugin([{
        filename: `${entryName}.html`,
        template: path.join(appPath, sourceRoot, 'index.html'),
        chunks: [entryName]
      }])
    }))
  } else {
    // 获取HtmlWebpackPlugin及其ptions配置信息， 收集到plugin里面
    plugin.htmlWebpackPlugin = getHtmlWebpackPlugin([{
      filename: 'index.html',
      template: path.join(appPath, sourceRoot, 'index.html')
    }])
  }
  // 获取webpack.DefinePlugin 及其options配置信息，收集到plugin里面
  plugin.definePlugin = getDefinePlugin([processEnvOption(env), defineConstants])

  const isCssoEnabled = !(csso && csso.enable === false)
  // 获取CssoWebpackPlugin 及其options配置信息，收集到plugin里面
  if (isCssoEnabled) {
    plugin.cssoWebpackPlugin = getCssoWebpackPlugin([csso ? csso.config : {}])
  }

  const mode = 'production'

  const minimizer: any[] = []
  const uglifyConfig = uglify || terser
  const isUglifyEnabled = !(uglifyConfig && uglifyConfig.enable === false)

  if (isUglifyEnabled) {
  // 根据传递的参数，实例化一个TerserPlugin插件实例，配置到optimization.minimizer选项里面，优化打包产物
    minimizer.push(getTerserPlugin([
      enableSourceMap,
      uglifyConfig ? uglifyConfig.config : {}
    ]))
  }

  chain.merge({
    mode,
    devtool: getDevtool({ enableSourceMap, sourceMapType }), // 获取devtool配置值
    entry,
    output: getOutput(appPath, [{ //
      outputRoot,
      publicPath: addTrailingSlash(publicPath),
      chunkDirectory
    }, output]),
    resolve: { alias },
    module: getModule(appPath, { // 根据options的配置，获取css、style、url、less、sass等这些模块loader的配置
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
      minimizer,
      splitChunks: {
        name: false
      }
    }
  })

  return chain
}
