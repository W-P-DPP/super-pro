import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '')
    const devPort = Number(env.VITE_DEV_PORT)

    return {
        base: env.VITE_APP_BASE || '/resume/',
        plugins: [vue()],
        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: ["mixed-decls", "color-functions", "global-builtin", "import"],
                },
            },
        },
        server: {
            host: '0.0.0.0',
            port: Number.isFinite(devPort) && devPort > 0 ? devPort : 19697,
            allowedHosts: ['localhost', '127.0.0.1'],
            proxy: {
                '/api': {
                    target: env.VITE_GENERAL_SERVER_PROXY_TARGET || 'http://127.0.0.1:31010',
                    changeOrigin: true,
                },
            },
        },
    }
})
