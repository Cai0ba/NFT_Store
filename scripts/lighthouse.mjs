#!/usr/bin/env node
/**
 * Auditoria Lighthouse do build de demonstração (mocks ligados, cenário padrão).
 *
 * Uso:
 *   npm run lighthouse                    # build + preview + 3 execuções por página/perfil
 *   npm run lighthouse -- --skip-build    # reaproveita o dist/ existente
 *   npm run lighthouse -- --runs=1 --pages=home --profiles=mobile
 *   npm run lighthouse -- --skip-build --dist=/tmp/outro-build   # audita outro diretório de build
 *   npm run lighthouse -- --cpu-multiplier=2   # complementar: CPU do perfil mobile calibrada para a máquina
 *
 * O resultado oficial é o padrão do Lighthouse (mobile com CPU 4x). `--cpu-multiplier` existe só para
 * a análise complementar recomendada pela documentação do Lighthouse quando o benchmarkIndex da máquina
 * fica fora da faixa de um desktop de referência; a saída vai para uma pasta própria (sufixo _cpuNx).
 *
 * Variáveis: CHROME_PATH (executável do Chrome/Chromium), LH_PORT (padrão 4173).
 * Saída: lighthouse-reports/<data>/ e uma cópia em lighthouse-reports/latest/.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = (await import('node:module')).createRequire(import.meta.url)

const PAGES = {
  home: { label: 'Início', path: '/' },
  detail: { label: 'Detalhe do NFT', path: '/nft/emerald-ape-042' },
}
const PROFILES = {
  mobile: { label: 'Mobile', config: undefined },
  desktop: { label: 'Desktop', config: desktopConfig },
}
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const METRICS = {
  'largest-contentful-paint': { label: 'LCP', unit: 'ms' },
  'cumulative-layout-shift': { label: 'CLS', unit: '' },
  'total-blocking-time': { label: 'TBT', unit: 'ms' },
  'first-contentful-paint': { label: 'FCP', unit: 'ms' },
  'speed-index': { label: 'SI', unit: 'ms' },
}

function parseArgs(argv) {
  const opts = {
    skipBuild: false,
    dist: 'dist',
    cpuMultiplier: null,
    runs: 3,
    pages: Object.keys(PAGES),
    profiles: Object.keys(PROFILES),
  }
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=')
    if (key === 'skip-build') opts.skipBuild = true
    else if (key === 'dist') opts.dist = value
    else if (key === 'cpu-multiplier') opts.cpuMultiplier = Number(value)
    else if (key === 'runs') opts.runs = Math.max(1, Number(value) || 3)
    else if (key === 'pages') opts.pages = value.split(',').filter((p) => p in PAGES)
    else if (key === 'profiles') opts.profiles = value.split(',').filter((p) => p in PROFILES)
    else throw new Error(`Opção desconhecida: ${arg}`)
  }
  return opts
}

/** Playwright instala o Chromium com a revisão no nome da pasta; pega a mais recente. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'
  if (existsSync(base)) {
    const dirs = readdirSync(base)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    for (const dir of dirs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const candidate = path.join(base, dir, sub)
        if (existsSync(candidate)) return candidate
      }
    }
  }
  // Sem Playwright: deixa o chrome-launcher procurar uma instalação do sistema.
  return undefined
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit' })
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} saiu com ${code}`)),
    )
  })
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Servidor de preview não respondeu em ${url}`)
}

function median(values) {
  const sorted = values.filter((v) => typeof v === 'number').sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function stamp(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}`
}

function formatMetric(id, value) {
  if (value == null) return '—'
  if (id === 'cumulative-layout-shift') return value.toFixed(3)
  return `${Math.round(value)} ms`
}

function chromeVersion(chromePath) {
  if (!chromePath) return null
  try {
    return execFileSync(chromePath, ['--version'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

function describeConditions(settings) {
  const t = settings.throttling
  const s = settings.screenEmulation
  return {
    formFactor: settings.formFactor,
    throttlingMethod: settings.throttlingMethod,
    rttMs: t.rttMs,
    throughputKbps: t.throughputKbps,
    cpuSlowdownMultiplier: t.cpuSlowdownMultiplier,
    viewport: s.disabled
      ? 'sem emulação'
      : `${s.width}x${s.height} @${s.deviceScaleFactor}x${s.mobile ? ' (mobile)' : ''}`,
    userAgent: settings.emulatedUserAgent,
  }
}

function toMarkdown(summary) {
  const lines = []
  lines.push(`# Lighthouse — Kurio (${summary.generatedAt})`, '')
  lines.push(
    `Mediana de ${summary.runsPerPage} execuções por página/perfil. Build de produção servido por \`vite preview\`, mocks (MSW + Socket.IO simulado) ligados, cenário \`${summary.mockScenario}\`, perfil do navegador limpo a cada execução.`,
    '',
  )
  if (summary.calibration) lines.push(`> ${summary.calibration}`, '')
  lines.push('| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | SI |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const r of summary.results) {
    const cat = CATEGORIES.map((c) => {
      const v = r.median.categories[c]
      return v == null ? '—' : v >= TARGETS[c] ? `${v}` : `**${v}** ⚠`
    })
    const met = Object.keys(METRICS).map((m) => formatMetric(m, r.median.metrics[m]))
    lines.push(
      `| ${PAGES[r.page].label} (\`${r.url.replace(summary.baseUrl, '')}\`) | ${PROFILES[r.profile].label} | ${cat.join(' | ')} | ${met.join(' | ')} |`,
    )
  }
  lines.push(
    '',
    `Metas: Performance ≥ ${TARGETS.performance}, Accessibility ≥ ${TARGETS.accessibility}, Best Practices ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo}. ⚠ = abaixo da meta.`,
    '',
  )
  lines.push('## Execuções individuais', '')
  lines.push('| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const r of summary.results) {
    for (const run of r.runs) {
      lines.push(
        `| ${PAGES[r.page].label} | ${PROFILES[r.profile].label} | ${run.run} | ${CATEGORIES.map((c) => run.categories[c]).join(' | ')} | ${formatMetric('largest-contentful-paint', run.metrics['largest-contentful-paint'])} | ${formatMetric('cumulative-layout-shift', run.metrics['cumulative-layout-shift'])} | ${formatMetric('total-blocking-time', run.metrics['total-blocking-time'])} | [html](./${run.report}.report.html) · [json](./${run.report}.report.json) |`,
      )
    }
  }
  const e = summary.environment
  lines.push('', '## Ambiente', '')
  lines.push(`- Lighthouse ${e.lighthouse} (API Node, chrome-launcher ${e.chromeLauncher})`)
  lines.push(`- Navegador: ${e.browser ?? 'desconhecido'} — flags \`${e.chromeFlags.join(' ')}\``)
  lines.push(`- User agent do host: ${e.hostUserAgent}`)
  lines.push(`- Node ${e.node} · ${e.os} · CPU ${e.cpu} (${e.cpuCount} núcleos) · RAM ${e.memoryGb} GB`)
  lines.push(`- BenchmarkIndex do Lighthouse (mediana): ${e.benchmarkIndex}`)
  lines.push(
    `- Carga média da máquina (1/5/15 min): início ${e.loadAverage.start.join(' / ')}, fim ${e.loadAverage.end.join(' / ')}`,
  )
  lines.push(
    '- Servidor: `vite preview` do build de produção, JS/CSS em Brotli (como a Vercel entrega); cada execução abre um Chrome com perfil limpo (visita fria, service worker do MSW registrado do zero)',
  )
  lines.push('', '## Condições', '')
  for (const [profile, c] of Object.entries(summary.conditions)) {
    lines.push(
      `- **${PROFILES[profile].label}**: ${c.formFactor}, throttling ${c.throttlingMethod} (RTT ${c.rttMs} ms, ${c.throughputKbps} Kbps, CPU ${c.cpuSlowdownMultiplier}x), viewport ${c.viewport}`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const port = Number(process.env.LH_PORT ?? 4173)
  const baseUrl = `http://localhost:${port}`
  const chromePath = findChrome()
  const chromeFlags = ['--headless=new', '--no-sandbox', '--disable-gpu']

  const distDir = path.resolve(root, opts.dist)
  if (!opts.skipBuild) await run('npm', ['run', 'build', '--', '--outDir', distDir, '--emptyOutDir'])
  if (!existsSync(path.join(distDir, 'index.html')))
    throw new Error(`${distDir}/index.html não encontrado; rode sem --skip-build`)

  const startedAt = new Date()
  const loadAtStart = os.loadavg()
  const suffix = opts.cpuMultiplier ? `_cpu${opts.cpuMultiplier}x` : ''
  const outDir = path.join(root, 'lighthouse-reports', `${stamp(startedAt)}${suffix}`)
  await mkdir(outDir, { recursive: true })

  const vite = path.join(root, 'node_modules/vite/bin/vite.js')
  const preview = spawn(
    process.execPath,
    [vite, 'preview', '--port', String(port), '--strictPort', '--outDir', distDir],
    {
      cwd: root,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  const previewExited = new Promise((_, reject) =>
    preview.once('exit', (code) =>
      reject(new Error(`vite preview encerrou (código ${code}); a porta ${port} está livre? Use LH_PORT.`)),
    ),
  )
  previewExited.catch(() => undefined)
  const stopPreview = () => preview.exitCode == null && preview.kill('SIGTERM')
  process.on('exit', stopPreview)

  const results = []
  const conditions = {}
  const benchmarks = []
  let hostUserAgent = ''
  try {
    // Sem isso, com a porta ocupada por outro servidor, auditaríamos a aplicação errada.
    await Promise.race([waitForServer(baseUrl), previewExited])
    await new Promise((r) => setTimeout(r, 500))
    if (preview.exitCode != null) await previewExited
    for (const pageKey of opts.pages) {
      for (const profileKey of opts.profiles) {
        const url = `${baseUrl}${PAGES[pageKey].path}`
        const runs = []
        for (let i = 1; i <= opts.runs; i++) {
          // Chrome novo por execução: perfil limpo, sem service worker nem cache da rodada anterior.
          const chrome = await chromeLauncher.launch({ chromePath, chromeFlags })
          try {
            const result = await lighthouse(
              url,
              { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
              PROFILES[profileKey].config,
            )
            if (!result) throw new Error('Lighthouse não retornou resultado')
            const { lhr, report } = result
            if (lhr.runtimeError) throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`)
            const name = `${pageKey}-${profileKey}-run${i}`
            await writeFile(path.join(outDir, `${name}.report.html`), report[0])
            await writeFile(path.join(outDir, `${name}.report.json`), report[1])
            const categories = Object.fromEntries(
              CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]),
            )
            const metrics = Object.fromEntries(
              Object.keys(METRICS).map((m) => [m, lhr.audits[m]?.numericValue ?? null]),
            )
            runs.push({ run: i, report: name, categories, metrics, warnings: lhr.runWarnings })
            conditions[profileKey] ??= describeConditions(lhr.configSettings)
            benchmarks.push(lhr.environment.benchmarkIndex)
            hostUserAgent = lhr.environment.hostUserAgent
            console.log(
              `${name}: ${CATEGORIES.map((c) => `${c}=${categories[c]}`).join(' ')} LCP=${formatMetric('largest-contentful-paint', metrics['largest-contentful-paint'])} CLS=${formatMetric('cumulative-layout-shift', metrics['cumulative-layout-shift'])} TBT=${formatMetric('total-blocking-time', metrics['total-blocking-time'])}`,
            )
          } finally {
            await chrome.kill()
          }
        }
        results.push({
          page: pageKey,
          profile: profileKey,
          url,
          runs,
          median: {
            categories: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.categories[c]))])),
            metrics: Object.fromEntries(Object.keys(METRICS).map((m) => [m, median(runs.map((r) => r.metrics[m]))])),
          },
        })
      }
    }
  } finally {
    stopPreview()
  }

  const cpus = os.cpus()
  const summary = {
    generatedAt: startedAt.toISOString(),
    baseUrl,
    runsPerPage: opts.runs,
    calibration: opts.cpuMultiplier
      ? `Complementar: CPU do perfil mobile em ${opts.cpuMultiplier}x (padrão do Lighthouse: 4x). Não substitui o resultado oficial.`
      : null,
    mockScenario: process.env.VITE_MOCK_SCENARIO ?? 'default',
    targets: TARGETS,
    environment: {
      node: process.version,
      lighthouse: require('lighthouse/package.json').version,
      chromeLauncher: require('chrome-launcher/package.json').version,
      browser: chromeVersion(chromePath) ?? hostUserAgent,
      chromePath: chromePath ?? '(detectado pelo chrome-launcher)',
      chromeFlags,
      hostUserAgent,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: cpus[0]?.model ?? 'desconhecida',
      cpuCount: cpus.length,
      memoryGb: Math.round(os.totalmem() / 1024 ** 3),
      // Carga da máquina (1/5/15 min) no início e no fim: em máquina compartilhada explica a variação do TBT.
      loadAverage: { start: loadAtStart.map((v) => +v.toFixed(2)), end: os.loadavg().map((v) => +v.toFixed(2)) },
      benchmarkIndex: median(benchmarks),
    },
    conditions,
    results,
    belowTarget: results.flatMap((r) =>
      CATEGORIES.filter((c) => r.median.categories[c] < TARGETS[c]).map((c) => ({
        page: r.page,
        profile: r.profile,
        category: c,
        median: r.median.categories[c],
      })),
    ),
  }
  await writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(path.join(outDir, 'summary.md'), toMarkdown(summary))

  const latest = path.join(root, `lighthouse-reports/latest${suffix}`)
  await rm(latest, { recursive: true, force: true })
  await cp(outDir, latest, { recursive: true })

  console.log(`\nRelatórios em ${path.relative(root, outDir)} (cópia em ${path.relative(root, latest)})`)
  for (const r of results) {
    console.log(`${r.page}/${r.profile}: ${CATEGORIES.map((c) => `${c}=${r.median.categories[c]}`).join(' ')}`)
  }
  if (summary.belowTarget.length)
    console.log(
      `Abaixo da meta: ${summary.belowTarget.map((b) => `${b.page}/${b.profile}/${b.category}=${b.median}`).join(', ')}`,
    )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
