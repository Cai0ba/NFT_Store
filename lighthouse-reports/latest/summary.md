# Lighthouse — Kurio (2026-11-02T04:24:49.240Z)

Mediana de 3 execuções por página/perfil. Build de produção servido por `vite preview`, mocks (MSW + Socket.IO simulado) ligados, cenário `default`, perfil do navegador limpo a cada execução.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | SI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início (`/`) | Mobile | **68** ⚠ | 100 | 100 | 100 | 3884 ms | 0.000 | 871 ms | 778 ms | 1437 ms |
| Início (`/`) | Desktop | 99 | 100 | 100 | 100 | 843 ms | 0.000 | 44 ms | 232 ms | 619 ms |
| Detalhe do NFT (`/nft/emerald-ape-042`) | Mobile | **73** ⚠ | 96 | 100 | 100 | 3530 ms | 0.000 | 716 ms | 767 ms | 1799 ms |
| Detalhe do NFT (`/nft/emerald-ape-042`) | Desktop | 99 | 100 | 100 | 100 | 856 ms | 0.000 | 33 ms | 224 ms | 580 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. ⚠ = abaixo da meta.

## Execuções individuais

| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | Mobile | 1 | 63 | 100 | 100 | 100 | 3884 ms | 0.000 | 1420 ms | [html](./home-mobile-run1.report.html) · [json](./home-mobile-run1.report.json) |
| Início | Mobile | 2 | 69 | 100 | 100 | 100 | 3874 ms | 0.000 | 829 ms | [html](./home-mobile-run2.report.html) · [json](./home-mobile-run2.report.json) |
| Início | Mobile | 3 | 68 | 100 | 100 | 100 | 3911 ms | 0.000 | 871 ms | [html](./home-mobile-run3.report.html) · [json](./home-mobile-run3.report.json) |
| Início | Desktop | 1 | 100 | 100 | 100 | 100 | 768 ms | 0.000 | 11 ms | [html](./home-desktop-run1.report.html) · [json](./home-desktop-run1.report.json) |
| Início | Desktop | 2 | 99 | 100 | 100 | 100 | 870 ms | 0.000 | 44 ms | [html](./home-desktop-run2.report.html) · [json](./home-desktop-run2.report.json) |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 843 ms | 0.000 | 46 ms | [html](./home-desktop-run3.report.html) · [json](./home-desktop-run3.report.json) |
| Detalhe do NFT | Mobile | 1 | 72 | 96 | 100 | 100 | 3598 ms | 0.000 | 740 ms | [html](./detail-mobile-run1.report.html) · [json](./detail-mobile-run1.report.json) |
| Detalhe do NFT | Mobile | 2 | 73 | 96 | 100 | 100 | 3530 ms | 0.000 | 709 ms | [html](./detail-mobile-run2.report.html) · [json](./detail-mobile-run2.report.json) |
| Detalhe do NFT | Mobile | 3 | 73 | 96 | 100 | 100 | 3519 ms | 0.000 | 716 ms | [html](./detail-mobile-run3.report.html) · [json](./detail-mobile-run3.report.json) |
| Detalhe do NFT | Desktop | 1 | 99 | 100 | 100 | 100 | 838 ms | 0.000 | 74 ms | [html](./detail-desktop-run1.report.html) · [json](./detail-desktop-run1.report.json) |
| Detalhe do NFT | Desktop | 2 | 99 | 100 | 100 | 100 | 856 ms | 0.000 | 22 ms | [html](./detail-desktop-run2.report.html) · [json](./detail-desktop-run2.report.json) |
| Detalhe do NFT | Desktop | 3 | 99 | 100 | 100 | 100 | 943 ms | 0.000 | 33 ms | [html](./detail-desktop-run3.report.html) · [json](./detail-desktop-run3.report.json) |

## Ambiente

- Lighthouse 13.6.0 (API Node, chrome-launcher 0.13.4)
- Navegador: Google Chrome for Testing 153.0.8010.12 — flags `--headless=new --no-sandbox --disable-gpu`
- User agent do host: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36
- Node v22.23.4 · Linux 6.18.44-fc-v185 (x64) · CPU Intel(R) Xeon(R) Processor @ 2.10GHz (2 núcleos) · RAM 8 GB
- BenchmarkIndex do Lighthouse (mediana): 1861.5
- Carga média da máquina (1/5/15 min): início 1.89 / 2.14 / 2.55, fim 0.85 / 1.69 / 2.33
- Servidor: `vite preview` do build de produção, JS/CSS em Brotli (como a Vercel entrega); cada execução abre um Chrome com perfil limpo (visita fria, service worker do MSW registrado do zero)

## Condições

- **Mobile**: mobile, throttling simulate (RTT 150 ms, 1638.4 Kbps, CPU 4x), viewport 412x823 @1.75x (mobile)
- **Desktop**: desktop, throttling simulate (RTT 40 ms, 10240 Kbps, CPU 1x), viewport 1350x940 @1x
