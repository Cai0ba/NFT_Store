> **Linha de base (antes das otimizações de performance)**: mesmo código da entrega sem as mudanças descritas em `PERF`/README (sem bypass de assets no MSW, sem alias do tldts, sem preloads, `vite preview` só com gzip). Rodada com a máquina sob carga de outros processos (veja "Carga média").

# Lighthouse — Kurio (2026-10-30T16:12:27.917Z)

Mediana de 3 execuções por página/perfil. Build de produção servido por `vite preview`, mocks (MSW + Socket.IO simulado) ligados, cenário `default`, perfil do navegador limpo a cada execução.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | SI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início (`/`) | Mobile | **47** ⚠ | 100 | 100 | 100 | 6091 ms | 0.000 | 2792 ms | 1281 ms | 3396 ms |
| Início (`/`) | Desktop | **53** ⚠ | 100 | 100 | 100 | 2749 ms | 0.000 | 744 ms | 696 ms | 1918 ms |
| Detalhe do NFT (`/nft/emerald-ape-042`) | Mobile | **47** ⚠ | 96 | 100 | 100 | 5767 ms | 0.000 | 3810 ms | 1201 ms | 3720 ms |
| Detalhe do NFT (`/nft/emerald-ape-042`) | Desktop | **74** ⚠ | 100 | 100 | 100 | 2110 ms | 0.085 | 309 ms | 549 ms | 1325 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Execuções individuais

| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | Mobile | 1 | 48 | 100 | 100 | 100 | 6072 ms | 0.000 | 2792 ms | [html](./home-mobile-run1.report.html) · [json](./home-mobile-run1.report.json) |
| Início | Mobile | 2 | 46 | 100 | 100 | 100 | 6091 ms | 0.000 | 4681 ms | [html](./home-mobile-run2.report.html) · [json](./home-mobile-run2.report.json) |
| Início | Mobile | 3 | 47 | 100 | 100 | 100 | 6296 ms | 0.000 | 2680 ms | [html](./home-mobile-run3.report.html) · [json](./home-mobile-run3.report.json) |
| Início | Desktop | 1 | 53 | 100 | 100 | 100 | 2749 ms | 0.000 | 1004 ms | [html](./home-desktop-run1.report.html) · [json](./home-desktop-run1.report.json) |
| Início | Desktop | 2 | 77 | 100 | 100 | 100 | 2438 ms | 0.000 | 229 ms | [html](./home-desktop-run2.report.html) · [json](./home-desktop-run2.report.json) |
| Início | Desktop | 3 | 48 | 100 | 100 | 100 | 3832 ms | 0.000 | 744 ms | [html](./home-desktop-run3.report.html) · [json](./home-desktop-run3.report.json) |
| Detalhe do NFT | Mobile | 1 | 47 | 96 | 100 | 100 | 5767 ms | 0.000 | 3810 ms | [html](./detail-mobile-run1.report.html) · [json](./detail-mobile-run1.report.json) |
| Detalhe do NFT | Mobile | 2 | 43 | 96 | 100 | 100 | 7274 ms | 0.000 | 3826 ms | [html](./detail-mobile-run2.report.html) · [json](./detail-mobile-run2.report.json) |
| Detalhe do NFT | Mobile | 3 | 54 | 96 | 100 | 100 | 5128 ms | 0.000 | 1600 ms | [html](./detail-mobile-run3.report.html) · [json](./detail-mobile-run3.report.json) |
| Detalhe do NFT | Desktop | 1 | 78 | 100 | 100 | 100 | 1847 ms | 0.085 | 284 ms | [html](./detail-desktop-run1.report.html) · [json](./detail-desktop-run1.report.json) |
| Detalhe do NFT | Desktop | 2 | 50 | 100 | 100 | 100 | 4446 ms | 0.000 | 563 ms | [html](./detail-desktop-run2.report.html) · [json](./detail-desktop-run2.report.json) |
| Detalhe do NFT | Desktop | 3 | 74 | 100 | 100 | 100 | 2110 ms | 0.085 | 309 ms | [html](./detail-desktop-run3.report.html) · [json](./detail-desktop-run3.report.json) |

## Ambiente

- Lighthouse 13.6.0 (API Node, chrome-launcher 0.13.4)
- Navegador: Google Chrome for Testing 153.0.8010.12 — flags `--headless=new --no-sandbox --disable-gpu`
- User agent do host: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- Node v22.23.4 · Linux 6.18.44-fc-v185 (x64) · CPU Intel(R) Xeon(R) Processor @ 2.80GHz (2 núcleos) · RAM 8 GB
- BenchmarkIndex do Lighthouse (mediana): 1179.25
- Carga média da máquina (1/5/15 min): início 2.67 / 4.5 / 4.72, fim 6.89 / 5.27 / 4.95
- Servidor: `vite preview` do build de produção, JS/CSS em Brotli (como a Vercel entrega); cada execução abre um Chrome com perfil limpo (visita fria, service worker do MSW registrado do zero)

## Condições

- **Mobile**: mobile, throttling simulate (RTT 150 ms, 1638.4 Kbps, CPU 4x), viewport 412x823 @1.75x (mobile)
- **Desktop**: desktop, throttling simulate (RTT 40 ms, 10240 Kbps, CPU 1x), viewport 1350x940 @1x
