import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type ProxyOptions } from 'vite'

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TOKEN_FILE = resolve(ROOT, '.agent-bridge/.bridge-token')

function readBridgeToken(): string {
  try {
    if (existsSync(TOKEN_FILE)) {
      return readFileSync(TOKEN_FILE, 'utf8').trim()
    }
  } catch {
    /* ignore */
  }
  return process.env.VITE_BRIDGE_TOKEN?.trim() || ''
}

function withBridgeAuth(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/(?:local|relay)/, '') || '/',
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq, req) => {
        // Only inject PC bridge token for local-api proxy
        if (req.url?.startsWith('/api/local') || proxyReq.path) {
          const token = readBridgeToken()
          if (token && !proxyReq.getHeader('authorization')) {
            proxyReq.setHeader('Authorization', `Bearer ${token}`)
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api/local': withBridgeAuth('http://127.0.0.1:17831'),
      '/api/relay': {
        target: 'http://127.0.0.1:17832',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/relay/, '') || '/',
      },
    },
  },
})
