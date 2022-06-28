import { chalk } from '@tarojs/helper'
import * as ora from 'ora'
import { partial, pipe } from 'lodash/fp'
import * as formatMessages from 'webpack-format-messages'

// const syntaxErrorLabel = 'Syntax error:';

const getServeSpinner = (() => {
  let spinner
  return () => {
    if (!spinner) spinner = ora('Starting development server, please wait~')
    return spinner
  }
})()

const printCompiling = () => {
  getServeSpinner().text = 'Compiling...'
  getServeSpinner().start()
}
// 打印build错误日志
const printBuildError = (err: Error): void => {
  const message = err.message
  const stack = err.stack
  if (stack && message.indexOf('from UglifyJs') !== -1) {
    try {
      const matched = /(.+)\[(.+):(.+),(.+)\]\[.+\]/.exec(stack)
      if (!matched) {
        throw new Error('Using errors for control flow is bad.')
      }
      const problemPath = matched[2]
      const line = matched[3]
      const column = matched[4]
      console.log('Failed to minify the code from this file: \n\n', chalk.yellow(`\t${problemPath}:${line}${column !== '0' ? ':' + column : ''}`), '\n')
    } catch (ignored) {
      console.log('Failed to minify the bundle.', err)
    }
  } else {
    console.log((message || err) + '\n')
  }
  console.log()
}

const printSuccess = () => {
  getServeSpinner().stopAndPersist({
    symbol: '✅ ',
    text: chalk.green('Compiled successfully!\n')
  })
}

const printWarning = () => {
  getServeSpinner().stopAndPersist({
    symbol: '⚠️ ',
    text: chalk.yellow('Compiled with warnings.\n')
  })
}

const printFailed = () => {
  getServeSpinner().stopAndPersist({
    symbol: '🙅  ',
    text: chalk.red('Failed to compile.\n')
  })
}
// 编译前打印
const printWhenBeforeCompile = compiler => {
  compiler.hooks.beforeCompile.tap('taroBeforeCompile', () => {
    printCompiling()
  })
  return compiler
}

const printWhenInvalid = compiler => {
  compiler.hooks.invalid.tap('taroInvalid', () => {
    printCompiling()
  })
  return compiler
}

const printWhenFailed = compiler => {
  compiler.hooks.failed.tap('taroFailed', error => {
    printBuildError(error)
  })
  return compiler
}

let isFirst = true
const printWhenFirstDone = (devUrl, compiler) => {
  compiler.hooks.done.tap('taroDone', () => {
    if (isFirst) {
      isFirst = false
      getServeSpinner().clear()
      console.log()
      console.log(chalk.cyan(`ℹ️  Listening at ${devUrl}`))
      console.log(chalk.gray('\n监听文件修改中...\n'))
    }
  })
  return compiler
}

const _printWhenDone = ({ verbose = false }, compiler) => {
  compiler.hooks.done.tap('taroDone', stats => {
    const { errors, warnings } = formatMessages(stats)

    if (!stats.hasErrors() && !stats.hasWarnings()) {
      printSuccess()
    }

    if (stats.hasErrors()) {
      printFailed()
      errors.forEach(e => console.log(e + '\n'))
      verbose && process.exit(1)
      return
    }

    if (stats.hasWarnings()) {
      printWarning()
      warnings.forEach(w => console.log(w + '\n'))
    }

    verbose &&
      console.log(
        stats.toString({
          colors: true,
          modules: false,
          children: false,
          chunks: false,
          chunkModules: false,
          warnings: verbose
        }) + '\n'
      )
  })
  return compiler
}
// partial创建一个函数。 该函数调用 _printWhenDone，并传入预设的参数{ verbose: false }。 这个方法类似 _.bind，除了它不会绑定 this。 这个 _.partial.placeholder 的值，默认是以 _ 作为附加部分参数的占位符。

const printWhenDone = partial(_printWhenDone, [{ verbose: false }])

const printWhenDoneVerbosely = partial(_printWhenDone, [{ verbose: true }])

const bindDevLogger = (devUrl, compiler) => {
  console.log()
  pipe(
    printWhenBeforeCompile,
    partial(printWhenFirstDone, [devUrl]),
    printWhenDone,
    printWhenFailed,
    printWhenInvalid
  )(compiler)
  return compiler
}

const bindProdLogger = compiler => {
  console.log()
  // 管道函数， 按顺序执行；
  pipe(
    printWhenBeforeCompile,
    printWhenDoneVerbosely,
    printWhenFailed
  )(compiler)
  return compiler
}

export { printBuildError, printCompiling, getServeSpinner, bindDevLogger, bindProdLogger }
