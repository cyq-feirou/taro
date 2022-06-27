/**
 * @description build时，生成对应配置的函数
 */

// 类型定义
import { BuildConfig } from '../util/types'

export default ({
  sourceRoot = 'src',
  outputRoot = 'dist',
  publicPath = '/',
  staticDirectory = 'static',
  chunkDirectory = 'chunk',
  designWidth = 750,
  ...rest
}: BuildConfig): Partial<BuildConfig> => {
  return {
    sourceRoot,
    outputRoot,
    publicPath,
    staticDirectory,
    chunkDirectory,
    designWidth,
    ...rest
  }
}
