import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function normalizeBasePath(value, fallback) {
    const trimmed = value?.trim()

    if (!trimmed) {
        return fallback
    }

    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '')
    const devPort = Number(env.VITE_DEV_PORT)
    const basePath = normalizeBasePath(env.VITE_APP_BASE_PATH || env.VITE_APP_BASE, '/resume/')

    return {
        base: basePath,
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
