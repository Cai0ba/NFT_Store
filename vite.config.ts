import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { brotliCompressSync, constants as zlib } from 'node:zlib'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'

/**
 * Hints de carregamento que o Vite não gera sozinho: o chunk do MSW entra por import dinâmico (só
 * com mocks ligados) e as fontes só seriam descobertas depois do CSS aplicado e do primeiro render.
 */
/**
 * O `vite preview` só comprime com gzip; em produção a Vercel entrega Brotli. Para a auditoria local
 * medir o que o usuário recebe, o preview passa a responder JS/CSS em Brotli quando o navegador aceita.
 */
function previewBrotli(): Plugin {
  const cache = new Map<string, Buffer>()
  return {
    name: 'kurio:preview-brotli',
    configurePreviewServer(server) {
      const outDir = path.resolve(server.config.root, server.config.build.outDir)
      const assetsDir = path.join(outDir, 'assets')
      // Comprime tudo na subida: comprimir na primeira requisição somaria centenas de ms ao TTFB medido.
      if (existsSync(assetsDir)) {
        for (const name of readdirSync(assetsDir)) {
          if (!/\.(js|css)$/.test(name)) continue
          const file = path.join(assetsDir, name)
          cache.set(file, brotliCompressSync(readFileSync(file), { params: { [zlib.BROTLI_PARAM_QUALITY]: 11 } }))
        }
      }
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0] ?? ''
        const acceptsBrotli = /\bbr\b/.test(String(req.headers['accept-encoding'] ?? ''))
        if (!acceptsBrotli || !/^\/assets\/[\w.-]+\.(js|css)$/.test(pathname)) return next()
        const body = cache.get(path.join(outDir, pathname))
        if (!body) return next()
        res.setHeader('Content-Type', `${pathname.endsWith('.css') ? 'text/css' : 'text/javascript'}; charset=utf-8`)
        res.setHeader('Content-Encoding', 'br')
        res.setHeader('Content-Length', body.length)
        res.setHeader('Vary', 'Accept-Encoding')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        res.end(body)
      })
    },
  }
}

function criticalPreloads(): Plugin {
  return {
    name: 'kurio:critical-preloads',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return
        const tags: HtmlTagDescriptor[] = []
        const chunks = Object.values(bundle).filter((item) => item.type === 'chunk')
        const entry = chunks.find((chunk) => chunk.isEntry)
        const mocks = chunks.find((chunk) => chunk.facadeModuleId?.endsWith('/src/mocks/browser.ts'))
        if (entry && mocks) {
          const alreadyPreloaded = new Set([entry.fileName, ...entry.imports])
          for (const file of [mocks.fileName, ...mocks.imports]) {
            if (alreadyPreloaded.has(file)) continue
            tags.push({
              tag: 'link',
              attrs: { rel: 'modulepreload', crossorigin: true, href: `/${file}` },
              injectTo: 'head',
            })
          }
        }
        for (const asset of Object.values(bundle)) {
          if (asset.type !== 'asset' || !/roboto-mono-latin-(400|700)-normal-.*\.woff2$/.test(asset.fileName)) continue
          tags.push({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: `/${asset.fileName}` },
            injectTo: 'head',
          })
        }
        return tags
      },
    },
  }
}

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    criticalPreloads(),
    previewBrotli(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Veja o porquê em src/mocks/lib/tldts-lite.ts: só o tough-cookie (via MSW) importa o tldts.
      tldts: fileURLToPath(new URL('./src/mocks/lib/tldts-lite.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/msw/') || id.includes('@mswjs') || id.includes('@bundled-es-modules'))
              return 'mocks-vendor'
            if (id.includes('socket.io') || id.includes('engine.io')) return 'realtime'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react'
            if (id.includes('@tanstack')) return 'tanstack'
          }
          return undefined
        },
      },
    },
  },
})
