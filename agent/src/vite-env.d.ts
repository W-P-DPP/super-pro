/// <reference types="vite/client" />

declare global {
  interface Window {
    claude: {
      testSDK: () => Promise<string[]>
    }
    env: {
      NODE_ENV: string
      APP_VERSION: string
      CUSTOM_VAR: string
      ANTHROPIC_API_KEY: string
    }
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void
      off: (channel: string, listener: (...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

export {}
