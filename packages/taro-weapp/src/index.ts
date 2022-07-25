import Weapp from './program'
import type { IPluginContext } from '@tarojs/service'

// 让其它平台插件可以继承此平台
export { Weapp }

export interface IOptions {
  enablekeyboardAccessory?: boolean
}

// 注册kernel插件
export default (ctx: IPluginContext, options: IOptions) => {
  ctx.registerPlatform({
    name: 'weapp',
    useConfigName: 'mini',
    async fn ({ config }) {
      // 核心点
      const program = new Weapp(ctx, config, options || {})
      await program.start()
    }
  })
}
