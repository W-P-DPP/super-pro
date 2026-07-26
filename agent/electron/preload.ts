import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('env', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_VERSION: process.env.npm_package_version || '1.0.0',
  // 暴露自定义变量
  CUSTOM_VAR: process.env.CUSTOM_VAR || '默认值',
  ANTHROPIC_API_KEY:process.env["ANTHROPIC_API_KEY"]
})

// 通过 IPC 调用 main process，避免 preload 直接依赖 claude-agent-sdk
contextBridge.exposeInMainWorld('claude', {
  testSDK: () => ipcRenderer.invoke('test-sdk')
})
