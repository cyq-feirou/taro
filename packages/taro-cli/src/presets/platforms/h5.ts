import * as path from 'path'
import { merge, get } from 'lodash'
import { IPluginContext } from '@tarojs/service'
import { getPkgVersion } from '../../util'

export default (ctx: IPluginContext) => {
  // 先registerPlatform注册平台为h5的指令参数，在回调fn中获取config文件中的用户配置的属性，将h5自定入口参数和默认的入口参数进行合并
  ctx.registerPlatform({
    name: 'h5',
    useConfigName: 'h5',
    async fn ({ config }) {
      const { appPath, outputPath, sourcePath } = ctx.paths
      const { initialConfig } = ctx
      const { port } = ctx.runOpts
      const { emptyDirectory, recursiveMerge, npm, ENTRY, SOURCE_DIR, OUTPUT_DIR } = ctx.helper
      emptyDirectory(outputPath)
      const entryFileName = `${ENTRY}.config`
      const entryFile = path.basename(entryFileName)
      const defaultEntry = {
        [ENTRY]: [path.join(sourcePath, entryFile)]
      }
      const customEntry = get(initialConfig, 'h5.entry')
      const h5RunnerOpts = recursiveMerge(Object.assign({}, config), {
        entryFileName: ENTRY,
        env: {
          TARO_ENV: JSON.stringify('h5'),
          FRAMEWORK: JSON.stringify(config.framework),
          TARO_VERSION: JSON.stringify(getPkgVersion())
        },
        port,
        sourceRoot: config.sourceRoot || SOURCE_DIR,
        outputRoot: config.outputRoot || OUTPUT_DIR
      })
      h5RunnerOpts.entry = merge(defaultEntry, customEntry)
      // 通过@tarojs/helper的npm自定的方法，去请求获取@tarojs/webpack-runner插件
      const webpackRunner = await npm.getNpmPkg('@tarojs/webpack-runner', appPath)
      webpackRunner(appPath, h5RunnerOpts)
    }
  })
}
