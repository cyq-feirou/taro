import * as detectPort from 'detect-port'
import * as path from 'path'
import { format as formatUrl } from 'url'
import * as webpack from 'webpack'
import * as WebpackDevServer from 'webpack-dev-server'
import { recursiveMerge } from '@tarojs/helper'

import buildConf from './config/build.conf'
import devConf from './config/dev.conf'
import baseDevServerOption from './config/devServer.conf'
import prodConf from './config/prod.conf'
import { addLeadingSlash, addTrailingSlash, formatOpenHost } from './util'
import { bindDevLogger, bindProdLogger, printBuildError } from './util/logHelper'
import { BuildConfig, Func } from './util/types'
import { makeConfig } from './util/chain'
import type { Compiler } from 'webpack'

// 修改 webpackChain 配置
export const customizeChain = async (chain, modifyWebpackChainFunc: Func, customizeFunc?: Func) => {
  if (modifyWebpackChainFunc instanceof Function) {
    await modifyWebpackChainFunc(chain, webpack)
  }
  if (customizeFunc instanceof Function) {
    customizeFunc(chain, webpack)
  }
}
// build打包编译
const buildProd = async (appPath: string, config: BuildConfig): Promise<void> => {
  // 获取 webpack chain 配置实例： 将用户配置的属性和默认值属性进行合并（简单配置和插件的整合）
  const webpackChain = prodConf(appPath, config)
  // 修改 webpackChain 配置
  await customizeChain(webpackChain, config.modifyWebpackChain, config.webpackChain)
  // 通知 webpack配置 已经整合完成, commond==='inspect' 才用到
  if (typeof config.onWebpackChainReady === 'function') {
    config.onWebpackChainReady(webpackChain)
  }
  // 导出这个修改完成的要被 webpack 使用的配置对象
  const webpackConfig = webpackChain.toConfig()
  // webpack根据webpackConfig配置 实例化一个 compiler 对象
  const compiler = webpack(webpackConfig)
  // buildFinish 监听函数
  const onBuildFinish = config.onBuildFinish
  // compiler 的生命周期中 emit钩子： 生成资源到 output 目录之前。
  // 在这个钩子上注册 一个name=taroBuildDone 插件，fn：通过 config.modifyBuildAssets 修改编译后的结果
  compiler.hooks.emit.tapAsync('taroBuildDone', async (compilation, callback) => {
    if (typeof config.modifyBuildAssets === 'function') {
      // 通过config.modifyBuildAssets 处理 compilation.assets 产物（修改编译后的结果）
      await config.modifyBuildAssets(compilation.assets)
    }
    callback()
  })
  // 返回promise
  return new Promise((resolve, reject) => {
    // 在compiler编译生命周期的某些钩子添加输出日志插件
    bindProdLogger(compiler)
    // 执行compiler.run 进行编译
    compiler.run((err, stats) => {
      // 判断是否报错
      if (err) {
        // 打印build错误日志
        printBuildError(err)
        if (typeof onBuildFinish === 'function') {
          // 执行config配置的onBuildFinish
          onBuildFinish({
            error: err,
            stats: null,
            isWatch: false
          })
        }
        return reject(err)
      }
      // 编译完成
      if (typeof onBuildFinish === 'function') {
        // 执行config配置的onBuildFinish
        onBuildFinish({
          error: err,
          stats,
          isWatch: false
        })
      }
      resolve()
    })
  })
}
// dev开发编译
const buildDev = async (appPath: string, config: BuildConfig): Promise<any> => {
  // 获取 用户配置的属性
  const conf = buildConf(config)
  // 获取build需要的router配置
  const routerConfig = config.router || {}
  const routerMode = routerConfig.mode || 'hash'
  const routerBasename = routerConfig.basename || '/'
  // 处理publicPath的前后'/'
  const publicPath = conf.publicPath ? addLeadingSlash(addTrailingSlash(conf.publicPath)) : '/'
  const outputPath = path.join(appPath, conf.outputRoot as string)
  const customDevServerOption = config.devServer || {}
  // 获取 webpack chain 配置实例： 将用户配置的属性和默认值属性进行合并，（简单配置和插件的整合）
  const webpackChain = devConf(appPath, config)
  // 打包finish后的监听
  const onBuildFinish = config.onBuildFinish
  // 修改 webpackChain 配置
  await customizeChain(webpackChain, config.modifyWebpackChain, config.webpackChain)
  // 通知 webpack配置 已经整合完成, commond==='inspect' 才用到
  if (typeof config.onWebpackChainReady === 'function') {
    config.onWebpackChainReady(webpackChain)
  }
  // web服务器启动参数
  const devServerOptions = recursiveMerge<WebpackDevServer.Configuration>(
    {
      publicPath,
      contentBase: outputPath,
      historyApiFallback: {
        rewrites: [{
          from: /./,
          to: publicPath
        }]
      }
    },
    baseDevServerOption,
    customDevServerOption
  )
  // 判断是否指定we服务启动的host为localhost
  if (devServerOptions.host === 'localhost') {
    devServerOptions.useLocalIp = false
  }
  // we服务 端口号
  const originalPort = devServerOptions.port
  // 用 JavaScript 实现的端口检测器。availablePort是得到的可用的端口号，可能与 port 不一致
  const availablePort = await detectPort(originalPort)

  if (availablePort !== originalPort) {
    console.log()
    console.log(`预览端口 ${originalPort} 被占用, 自动切换到空闲端口 ${availablePort}`)
    devServerOptions.port = availablePort
  }
  // 判断路由模式，确定pathname
  let pathname

  if (routerMode === 'multi') {
    pathname = '/'
  } else if (routerMode === 'browser') {
    pathname = routerBasename
  } else {
    pathname = '/'
  }
  // 将一个解析后的URL对象、转成、一个格式化的URL字符串。
  // 解析文章：http://www.zzvips.com/article/162535.html
  const devUrl = formatUrl({
    protocol: devServerOptions.https ? 'https' : 'http',
    hostname: devServerOptions.host,
    port: devServerOptions.port,
    pathname
  })
  // 导出这个修改完成的要被 webpack 使用的配置对象
  const webpackConfig = webpackChain.toConfig()
  // 想要启用 HMR，还需要修改 webpack 配置对象，使其包含 HMR 入口起点。webpack-dev-server package 中具有一个叫做 addDevServerEntrypoints 的方法，你可以通过使用这个方法来实现。
  WebpackDevServer.addDevServerEntrypoints(webpackConfig, devServerOptions)
  // webpack根据webpackConfig配置 实例化一个 compiler 对象
  const compiler = webpack(webpackConfig) as Compiler
  // 在compiler编译生命周期的某些钩子添加输出日志插件
  bindDevLogger(devUrl, compiler)
  // 当使用 webpack dev server 和 Node.js API 时，不要将 dev server 选项放在 webpack 配置对象(webpack config object)中。而是，在创建选项时，将其作为第二个参数devServerOptions传递。
  const server = new WebpackDevServer(compiler, devServerOptions)
  // compiler 的生命周期中 emit钩子： 生成资源到 output 目录之前。
  // 在这个钩子上注册 一个taroBuildDone 插件，通过 config.modifyBuildAssets 修改编译后的结果
  compiler.hooks.emit.tapAsync('taroBuildDone', async (compilation, callback) => {
    if (typeof config.modifyBuildAssets === 'function') {
      // 通过config.modifyBuildAssets 处理 compilation.assets 产物（修改编译后的结果）
      await config.modifyBuildAssets(compilation.assets)
    }
    callback()
  })
  // compiler 的生命周期中 done钩子： 编译(compilation)完成。
  // 在这个钩子上注册 一个taroBuildDone 插件，执行 onBuildFinish
  compiler.hooks.done.tap('taroBuildDone', stats => {
    if (typeof onBuildFinish === 'function') {
      // 执行编译完成回调
      onBuildFinish({
        error: null,
        stats,
        isWatch: true
      })
    }
  })
  // compiler 的生命周期中 failed钩子： 编译(compilation)失败。
  // 在这个钩子上注册 一个taroBuildDone 插件，执行 onBuildFinish
  compiler.hooks.failed.tap('taroBuildDone', error => {
    if (typeof onBuildFinish === 'function') {
      onBuildFinish({
        error,
        stats: null,
        isWatch: true
      })
    }
  })
  // 返回一个promise
  return new Promise<void>((resolve, reject) => {
    // 启动web server ,添加端口监听
    server.listen(devServerOptions.port, (devServerOptions.host as string), err => {
      if (err) {
        reject(err)
        return console.log(err)
      }
      resolve()

      /* 补充处理devServer.open配置 */
      // 在DevServer启动且第一次构建完时，自动用我 们的系统的默认浏览器去打开要开发的网页
      if (devServerOptions.open) {
        const openUrl = formatUrl({
          protocol: devServerOptions.https ? 'https' : 'http',
          hostname: formatOpenHost(devServerOptions.host),
          port: devServerOptions.port,
          pathname
        })
        console.log(openUrl)
      }
    })
  })
}

export default async (appPath: string, config: BuildConfig): Promise<void> => {
  // Merged sass loader option.
  const newConfig: BuildConfig = await makeConfig(config)
  // 是否是监听状态
  if (newConfig.isWatch) {
    try {
      // 执行dev编译
      await buildDev(appPath, newConfig)
    } catch (e) {
      console.error(e)
    }
  } else {
    try {
      // 执行prod编译
      await buildProd(appPath, newConfig)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  }
}
// buildDev 与 buildProd的区别
