# Kurio — NFT Marketplace

Implementação do desafio front-end "NFT Marketplace": descoberta, compra e conta do colecionador, em desktop e mobile, com API REST e tempo real simulados na camada de rede (MSW). Não há backend: o build publicado carrega os mocks e funciona sozinho.

- **URL pública:** `<preencher após o deploy>`
- **Repositório:** `<preencher após o deploy>`
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](./ARCHITECTURE.md)

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Setup](#setup)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Comandos](#comandos)
- [Credenciais e cupons fictícios](#credenciais-e-cupons-fictícios)
- [Cenários de simulação](#cenários-de-simulação)
- [Como reproduzir os fluxos de falha](#como-reproduzir-os-fluxos-de-falha)
- [Testes E2E (Playwright)](#testes-e2e-playwright)
- [Auditoria Lighthouse](#auditoria-lighthouse)
- [Deploy na Vercel](#deploy-na-vercel)
- [Estrutura de pastas](#estrutura-de-pastas)

## Stack

| Responsabilidade      | Tecnologia                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| Interface e linguagem | React 19, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`)           |
| Build                 | Vite 8                                                                  |
| Roteamento            | TanStack Router (rotas por arquivo, search params validados com zod)    |
| Estado remoto         | TanStack Query v5                                                       |
| HTTP                  | Axios                                                                   |
| Tempo real            | socket.io-client 4                                                      |
| Estilo e componentes  | Tailwind CSS v4, shadcn/ui (sobre `radix-ui`), lucide-react, sonner     |
| Formulários           | react-hook-form + zod 4 (os mesmos schemas dos contratos)               |
| Valores em ETH        | strings decimais + decimal.js-light                                     |
| Mocks                 | MSW 2 (REST) + `@mswjs/socket.io-binding` (Socket.IO sobre WebSocket)   |
| Testes                | Playwright 1.63 (Chromium desktop e mobile, regressão visual)           |
| Auditoria             | Lighthouse 13 (script próprio) e `@lhci/cli` (configuração equivalente) |
| Fonte                 | Roboto Mono via `@fontsource/roboto-mono` (servida localmente, sem CDN) |

## Pré-requisitos

- Node.js **≥ 20.19** (exigência do Vite 8; `engines` no `package.json`). Desenvolvido e testado com Node 22.
- npm (o lockfile é `package-lock.json`).
- Para os testes E2E e o Lighthouse: Chromium do Playwright (veja [Testes E2E](#testes-e2e-playwright)).

Nenhum serviço externo é necessário: catálogo, contas, carrinho, pedidos, pagamentos e eventos em tempo real rodam no navegador, dentro do MSW.

## Setup

A partir de um checkout limpo:

```bash
npm ci
cp .env.example .env   # opcional: os valores padrão já são os mesmos do exemplo
npm run dev            # http://localhost:5173, com mocks ligados
```

O `public/mockServiceWorker.js` é versionado; não é preciso rodar `npx msw init`.

## Variáveis de ambiente

São lidas pelo Vite em tempo de build (`import.meta.env`) e centralizadas em `src/shared/config/env.ts`. Todas têm padrão, então o projeto roda sem `.env`.

| Variável             | Padrão                      | Descrição                                                                                                                        |
| -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS`  | `true`                      | Liga o MSW (REST + Socket.IO). Só desliga com o valor literal `false`. Mantenha ligado no build de demonstração.                 |
| `VITE_API_URL`       | `/api`                      | Base das chamadas REST do Axios. Com mocks, é o prefixo interceptado pelos handlers.                                             |
| `VITE_SOCKET_URL`    | `wss://realtime.kurio.test` | Endpoint do Socket.IO. Com mocks, a conexão WebSocket é interceptada pelo MSW (o host não existe).                               |
| `VITE_MOCK_SCENARIO` | `default`                   | Cenário inicial dos mocks quando não há `?scenario=` nem cenário salvo. Valores na [tabela de cenários](#cenários-de-simulação). |

Com `VITE_ENABLE_MOCKS=false` a aplicação passa a chamar `VITE_API_URL` e `VITE_SOCKET_URL` de verdade; como não existe backend real para este desafio, isso só faz sentido apontando para uma implementação dos contratos descritos em [ARCHITECTURE.md](./ARCHITECTURE.md#contratos-rest).

## Comandos

| Comando                   | O que faz                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Servidor de desenvolvimento (porta 5173) com mocks, painel "Simulação" e devtools do Query e do Router. |
| `npm run build`           | `tsc -b` (app, testes e configs) + `vite build` em `dist/`.                                             |
| `npm run preview`         | Serve o `dist/` na porta 4173 (`--strictPort`), com JS/CSS em Brotli como na Vercel.                    |
| `npm run typecheck`       | `tsc -b --noEmit`.                                                                                      |
| `npm run lint`            | `eslint .`.                                                                                             |
| `npm run format`          | `prettier --write .` (para só verificar: `npx prettier --check .`).                                     |
| `npm run test:e2e`        | Playwright: build + preview na 4173 e a suíte nos projetos desktop e mobile.                            |
| `npm run test:e2e:update` | Mesma suíte com `--update-snapshots` (regenera as baselines visuais).                                   |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução (`playwright-report/`).                                        |
| `npm run lighthouse`      | Build + preview + Lighthouse (3 execuções × início/detalhe × mobile/desktop).                           |

## Credenciais e cupons fictícios

| Conta              | Senha      | Usuário             | Situação no seed                                               |
| ------------------ | ---------- | ------------------- | -------------------------------------------------------------- |
| `ana@kurio.test`   | `Kurio123` | `ana.colecionadora` | Carteira principal e secundária cadastradas, 3 favoritos.      |
| `bruno@kurio.test` | `Kurio123` | `bruno.nft`         | Sem carteiras e sem favoritos (bom para cadastrar a primeira). |

As senhas são guardadas no banco simulado apenas como hash SHA-256 com salt (WebCrypto).

| Cupom          | Resultado                                                 |
| -------------- | --------------------------------------------------------- |
| `KURIO10`      | Válido: 10% sobre o subtotal.                             |
| `GENESIS`      | Válido: 0,05 ETH de desconto fixo (limitado ao subtotal). |
| `LANCAMENTO`   | Expirado: `422 COUPON_EXPIRED`.                           |
| qualquer outro | Inválido: `422 COUPON_INVALID`.                           |

Taxa de rede da cotação: Ethereum 0,016 ETH, Polygon 0,004 ETH, Solana 0,002 ETH (cobrada só quando há item comprável).

O catálogo tem 60 NFTs determinísticos em 9 categorias e 3 redes (preços de 0,02 a 12,30 ETH, edições 1/1, 1/10, 1/50 e aberta, alguns esgotados e alguns raros). O primeiro da ordenação padrão é `emerald-ape-042` (Emerald Ape #042, 1,19 ETH).

## Cenários de simulação

Um cenário define o seed do banco simulado, o perfil de rede (latência, offline, regras de erro HTTP), o TTL da sessão, o desfecho do pagamento e "pegadinhas" do servidor no checkout. Tudo é determinístico: a mesma sequência de ações produz o mesmo resultado.

### Como selecionar

Precedência: **`?scenario=<nome>` na URL** > cenário salvo no `localStorage` > `VITE_MOCK_SCENARIO`.

1. **URL:** abra qualquer rota com `?scenario=<nome>` (ex.: `/?scenario=slow-network`). O cenário é salvo e o parâmetro é removido da URL para não vazar para o roteador. Trocar de cenário pela URL **não** apaga o banco, exceto quando o seed muda (`empty-catalog` ↔ demais).
2. **Painel "Simulação":** botão flutuante no canto inferior esquerdo (carregado depois do `load`, também no build publicado). Seções: Cenário ("Aplicar e recarregar", "Resetar dados"), NFT no carrinho (alterar preço/disponibilidade, "Preço +10%", "Esgotar", "Duplicar último evento", "Enviar evento antigo"), Tempo real ("Derrubar conexão", "Pausar/Retomar tempo real"), Pagamento (desfecho: Confirmar, Recusar, Manter pendente; "Confirmar/Recusar pendentes") e Rede (latência e "Simular falta de conexão").
3. **Console:** `window.__kurio` (existe só com mocks ligados):

```js
__kurio.scenario() // cenário ativo
__kurio.setScenario('payment-rejected') // salva o cenário (seed novo só vale após recarregar)
await __kurio.reset() // restaura o seed do cenário atual
await __kurio.reset('default') // troca de cenário e restaura o seed dele
__kurio.network.set({ latency: 'slow' }) // 'none' | 'fast' | 'slow' | 'variable'
__kurio.network.set({ offline: true })
__kurio.realtime.updateNft({ nftId: 'emerald-ape-042', priceEth: '1.50' }) // grava no banco e emite nft.updated
__kurio.realtime.replayLast('emerald-ape-042') // mesmo eventId (duplicata)
__kurio.realtime.emitStale('emerald-ape-042') // versão antiga
__kurio.realtime.disconnect() // servidor derruba as conexões
__kurio.realtime.pause()
__kurio.realtime.resume() // recusa reconexões até resume()
__kurio.payments.setOutcome('hold') // 'confirm' | 'reject' | 'hold'
__kurio.payments.settle('confirm') // liquida pedidos pendentes
__kurio.payments.setDelay(5000)
__kurio.panel.hide()
__kurio.panel.show()
```

### Reset

`__kurio.reset()` e "Resetar dados" recriam o banco a partir do seed do cenário, cancelam pagamentos agendados, limpam o histórico de eventos e derrubam os sockets (os clientes reconectam e reconciliam com o REST). As sessões do banco somem junto, então quem estava logado é deslogado na próxima chamada autenticada. As "pegadinhas" de uso único (`price-change-on-checkout`, `sold-out-on-checkout`, `wallet-rejects`) voltam a valer depois de um reset.

Para zerar tudo, inclusive sessão, carrinho de visitante e rascunhos do cliente, limpe os dados do site (`localStorage`/`sessionStorage` com prefixos `kurio.` e `kurio:`).

### Cenários disponíveis

| Cenário                    | Nome no painel          | O que simula                                                                                                                                              |
| -------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`                  | Padrão                  | Seed completo, latência de 30–90 ms, sessão de 30 min, pagamento confirmado 2,5 s após o pedido.                                                          |
| `empty-catalog`            | Catálogo vazio          | Seed sem NFTs: estados vazios do catálogo, favoritos e carrinho. Muda o seed, exige recarregar.                                                           |
| `slow-network`             | Rede lenta              | Toda resposta REST leva de 1,5 s a 2,5 s (skeletons, `aria-busy`, atualização em segundo plano).                                                          |
| `variable-latency`         | Latência variável       | 80–1600 ms pseudoaleatórios por método + URL + número da chamada: respostas chegam fora de ordem de forma reprodutível.                                   |
| `offline`                  | Sem conexão             | Toda chamada REST falha com erro de rede e o servidor de tempo real recusa conexões.                                                                      |
| `server-error`             | Falha transitória       | `GET /api/nfts`, `/api/nfts/:id` e `/api/me/favorites` respondem 503 na primeira tentativa de cada URL; o retry automático recupera.                      |
| `favorites-failure`        | Favoritos indisponíveis | `PUT`/`DELETE /api/me/favorites/:nftId` sempre 503 (rollback da atualização otimista).                                                                    |
| `session-expiring`         | Sessão curta            | Sessões criadas a partir daí expiram em 20 s.                                                                                                             |
| `price-change-on-checkout` | Preço muda no checkout  | Na primeira criação de pedido, o servidor sobe 10% o preço do primeiro item do carrinho antes de validar a cotação: `409 QUOTE_OUTDATED` + `nft.updated`. |
| `sold-out-on-checkout`     | Esgota no checkout      | Igual ao anterior, mas a edição do primeiro item esgota.                                                                                                  |
| `order-timeout`            | Timeout do pedido       | `POST /api/orders` cria o pedido, mas a resposta leva 15 s; o cliente desiste em 8 s e repete com a mesma `Idempotency-Key`.                              |
| `payment-rejected`         | Pagamento recusado      | O pedido fica pendente e é recusado após 2,5 s.                                                                                                           |
| `wallet-rejects`           | Carteira recusa conexão | A primeira tentativa de conectar a carteira devolve `403 WALLET_REJECTED`.                                                                                |

## Como reproduzir os fluxos de falha

Pré-condição comum dos fluxos de compra: entrar como `ana@kurio.test` / `Kurio123` (já tem carteiras), adicionar um NFT ao carrinho (ex.: `/nft/emerald-ape-042` → "Comprar", que leva ao carrinho) e ir ao pagamento ("Conectar e finalizar" no carrinho). No pagamento: escolher a carteira, clicar em "Conectar com …" no painel da carteira, preencher os campos e clicar em "Confirmar compra"; abre o diálogo "Revise sua compra", onde o segundo "Confirmar compra" envia o pedido.

Os nomes de botão abaixo são os da interface. Os mesmos cenários estão cobertos pela suíte E2E (spec indicada entre parênteses).

**Latência e skeletons** (`12-carregamento-falhas`)

1. Abra `/?scenario=slow-network`.
2. Catálogo e destaque mostram skeletons com shimmer (sem shimmer com `prefers-reduced-motion`) e `aria-busy`; depois o conteúdo entra sem deslocamento.
3. Troque um filtro: a grade anterior fica esmaecida enquanto a nova página carrega. Abra um NFT para ver o skeleton do detalhe.
4. Para respostas fora de ordem: `/?scenario=variable-latency` e troque filtros/busca em sequência rápida; a grade sempre corresponde ao último estado da URL.

**Offline** (`12-carregamento-falhas`)

1. Abra `/?category=fotografia&scenario=offline`.
2. Depois das tentativas automáticas aparece "Não foi possível carregar o catálogo", informando que os filtros foram mantidos.
3. No painel, desmarque "Simular falta de conexão" (ou `__kurio.network.set({ offline: false })`) e clique em "Tentar novamente".

**Erro 5xx com retry** (`12-carregamento-falhas`)

1. `/?scenario=server-error`: o catálogo carrega normalmente; no DevTools (aba Network) aparece o 503 seguido do 200 do retry.
2. Para ver o erro e a recuperação manual, force três 503 seguidos no detalhe (1 tentativa + 2 retries):

   ```js
   __kurio.network.set({
     rules: [{ method: 'GET', path: '/api/nfts/:id', effect: 'status', status: 503, times: 3, perUrl: true }],
   })
   ```

3. Abra `/nft/emerald-ape-042`: aparece "Não foi possível carregar este NFT"; "Tentar novamente" faz a quarta chamada, que passa. Limpe as regras com `__kurio.network.set({ rules: [] })`.

**Sessão expirada durante a navegação e o checkout** (`03-conta`)

1. Abra `/?scenario=session-expiring` e entre como Ana (a sessão nova dura 20 s).
2. Navegação privada: vá para `/perfil` e espere ~20 s. O app consulta a sessão no vencimento, recebe `401 SESSION_EXPIRED` e leva ao login com o motivo. Ao entrar de novo, volta para `/perfil`.
3. Navegação pública: espere expirar em `/`. Aparece a faixa "Sua sessão expirou…" com "Entrar novamente"; a página continua utilizável.
4. Checkout: com itens no carrinho, preencha parte do formulário em `/pagamento` e espere expirar. Após o login você volta ao pagamento com o rascunho preenchido.

**Conflito de cadastro** (`03-conta`)

1. Em `/cadastro`, use o e-mail `ana@kurio.test` (ou o usuário `ana.colecionadora`) com uma senha válida.
2. A API responde `409 EMAIL_TAKEN` (ou `USERNAME_TAKEN`); a mensagem aparece no próprio campo, que recebe o foco.

**Cupom inválido ou expirado** (`05-carrinho`)

1. Em `/carrinho`, informe `QUALQUER` em "Código promocional" → "Cupom inválido".
2. Informe `LANCAMENTO` → "Este cupom expirou".
3. Informe `KURIO10` → desconto de 10% e total recalculado pela cotação.

**Preço alterado e edição esgotada durante a compra** (`09-tempo-real-checkout`)

- Pelo servidor no envio: `/?scenario=price-change-on-checkout` (ou `sold-out-on-checkout`), faça a pré-condição e confirme. O servidor altera o primeiro item, responde `409 QUOTE_OUTDATED` com a cotação nova e emite `nft.updated`. O diálogo passa a "Os valores mudaram", mostra antes/agora e só permite seguir com "Aceitar novos valores". No caso esgotado, não há o que confirmar e nenhum pedido é criado.
- Por evento durante a revisão: com o diálogo "Revise sua compra" aberto, use no painel "NFT no carrinho" → "Preço +10%" (ou "Esgotar"). O evento invalida a cotação, o hash muda e o botão de confirmar é trocado por "Aceitar novos valores".
- No carrinho: com `/carrinho` aberto, "Preço +10%" no painel. Surge o aviso "Preço alterado" (anunciado ao leitor de tela), o resumo é recalculado e "Aceitar novo preço" confirma o valor vigente.

**Timeout após criação do pedido** (`07-pagamento-falhas`)

1. `/?scenario=order-timeout`, faça a pré-condição e confirme.
2. O servidor cria o pedido e segura a resposta por 15 s; o Axios desiste em 8 s (`TIMEOUT`) e o checkout repete o `POST /api/orders` com a mesma `Idempotency-Key` e o mesmo corpo.
3. A repetição devolve `200` com o pedido já criado. No DevTools aparecem dois POSTs com a mesma chave e o resultado é um pedido só. Recarregar no meio do processo retoma com a mesma chave.

**Clique repetido** (`07-pagamento-falhas`): clique várias vezes em "Confirmar compra" no diálogo; o botão entra em carregamento e só um `POST /api/orders` sai.

**Pagamento recusado** (`07-pagamento-falhas`)

1. `/?scenario=payment-rejected` (ou painel → Pagamento → "Recusar"), faça a pré-condição e confirme.
2. Após "Aguardando confirmação da rede…" vem "Pagamento recusado"; os itens continuam no carrinho. "Tentar novamente" revalida a cotação e volta à revisão; confirmar de novo envia uma tentativa nova, com outra `Idempotency-Key`.

**Recusa de conexão da carteira**: `/?scenario=wallet-rejects`, no pagamento clique em "Conectar com …": a primeira tentativa é recusada ("Tentar de novo" conecta).

**Eventos duplicados ou antigos** (`10-tempo-real-resiliencia`)

1. Com `emerald-ape-042` no carrinho e `/carrinho` aberto, aplique um preço novo pelo painel (ex.: 1.60).
2. Use "Duplicar último evento" (mesmo `eventId`) e "Enviar evento antigo" (versão menor, preço dobrado). Nada muda na tela e nenhum aviso é repetido.

**Queda do socket e retomada de pedido pendente** (`10-tempo-real-resiliencia`)

1. No painel, Pagamento → "Manter pendente" (ou `__kurio.payments.setOutcome('hold')`). Faça a pré-condição e confirme: o diálogo fica em "Aguardando confirmação da rede…".
2. Recarregue a página: o pagamento volta ao mesmo pedido pendente, sem novo `POST`.
3. Painel → "Pausar tempo real" (o servidor derruba e recusa conexões), depois "Confirmar pendentes" e "Retomar tempo real".
4. Na reconexão o cliente reassina o pedido, recebe o estado atual e reconcilia com o REST: abre o recibo. Mesmo sem socket, o polling de 4 s do pedido pendente chegaria ao mesmo resultado.
5. Uma recusa posterior (`__kurio.payments.settle('reject')`) não altera o pedido confirmado: estados terminais não regridem.

Para perda de evento sem pedido: "Pausar tempo real", altere o preço de um NFT do carrinho e "Retomar tempo real"; o valor novo chega pela reconciliação REST feita na reconexão.

## Testes E2E (Playwright)

```bash
npx playwright install chromium        # uma vez por máquina (em Linux, se faltar biblioteca: --with-deps)
npm run test:e2e                       # build de demonstração + vite preview :4173 + suíte completa
npx playwright test 07-                # uma spec
npx playwright test --project=mobile-chromium
npm run test:e2e:update                # regenera baselines visuais
npm run test:e2e:report                # relatório HTML
```

- Se o Chromium já estiver instalado em outro diretório, exporte `PLAYWRIGHT_BROWSERS_PATH` (ex.: `export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) em vez de instalar de novo.
- Projetos: `desktop-chromium` (Desktop Chrome, 1440×900) e `mobile-chromium` (Pixel 7, 412×839, toque). Todos os fluxos rodam nos dois; 4 casos de teclado/foco que só existem em um dos layouts são pulados com motivo.
- A suíte tem 124 testes em 13 specs, um arquivo por área do enunciado (catálogo, detalhe, conta, favoritos, carrinho, compra, falhas de pagamento, perfil/carteiras, tempo real no checkout, resiliência do tempo real, acessibilidade, carregamento/falhas e regressão visual).
- Os testes rodam contra o mesmo artefato publicado (`npm run build` + `vite preview`). Fora de CI o `webServer` reaproveita um servidor que já esteja na 4173; confira se ele serve o build atual.
- Isolamento: cada teste começa com contexto de navegador novo (storage vazio, logo seed do cenário). REST passa pelos handlers do MSW e tempo real pelo socket.io-client real; não há `page.route`. Eventos, rede e pagamentos são controlados por `window.__kurio` (wrapper tipado em `tests/e2e/support/kurio.ts`); relógio por `page.clock` nos testes de expiração e timeout.
- Regressão visual: Início, Detalhe (`emerald-ape-042`), Carrinho e Pagamento, página inteira, nos dois projetos. Baselines em `tests/e2e/__screenshots__/<projeto>/` (versionadas), geradas em Chromium Linux. Em outro sistema operacional o antialiasing de fonte muda: rode `npm run test:e2e:update` antes de comparar.
- Artefatos: relatório HTML em `playwright-report/`; trace, vídeo e screenshot só das falhas em `test-results/` (`trace: 'retain-on-failure'`). Para abrir um trace: `npx playwright show-trace test-results/<teste>/trace.zip`. Em CI (`CI=1`): `retries: 1`, `workers: 2`, `forbidOnly`.

## Auditoria Lighthouse

```bash
npm run lighthouse                              # build + preview + 3 execuções por página e perfil
npm run lighthouse -- --skip-build              # reaproveita o dist/
npm run lighthouse -- --runs=1 --pages=home --profiles=mobile
npx lhci autorun                                # alternativa com @lhci/cli (lighthouserc.json, mobile)
npx lhci autorun --collect.settings.preset=desktop
```

- Páginas: Início (`/`) e Detalhe (`/nft/emerald-ape-042`), build de produção, mocks ligados, cenário `default`, perfil limpo em cada execução. Nada é desligado para a auditoria.
- O Chrome é procurado em `CHROME_PATH`, depois no diretório de navegadores do Playwright (`PLAYWRIGHT_BROWSERS_PATH`, padrão `/opt/pw-browsers`) e por fim na instalação do sistema. Porta: `LH_PORT` (padrão 4173).
- Saída: `lighthouse-reports/<data>/` e cópia em `lighthouse-reports/latest/` com os HTML/JSON de cada execução, `summary.json` e `summary.md` (versões, ambiente, carga da máquina, condições, medianas). `lighthouse-reports/baseline/` guarda a rodada anterior às otimizações. Só `latest/` e `baseline/` entram no repositório.

Resultado final (mediana de 3 execuções, 02/11/2026, Lighthouse 13.6.0, Chrome for Testing 153):

| Página  | Perfil  | Performance | Accessibility | Best Practices | SEO | LCP     | CLS   | TBT    |
| ------- | ------- | ----------- | ------------- | -------------- | --- | ------- | ----- | ------ |
| Início  | Mobile  | **68**      | 100           | 100            | 100 | 3884 ms | 0.000 | 871 ms |
| Início  | Desktop | 99          | 100           | 100            | 100 | 843 ms  | 0.000 | 44 ms  |
| Detalhe | Mobile  | **73**      | 96            | 100            | 100 | 3530 ms | 0.000 | 716 ms |
| Detalhe | Desktop | 99          | 100           | 100            | 100 | 856 ms  | 0.000 | 33 ms  |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90. Desktop bate todas; mobile bate todas exceto Performance. A análise das causas (MSW rodando na thread principal do cliente, LCP dependente da API simulada, CPU 4x numa máquina de 2 vCPUs compartilhada) e o que foi otimizado estão em [ARCHITECTURE.md → Performance](./ARCHITECTURE.md#performance).

## Deploy na Vercel

O `vercel.json` já define tudo que o deploy precisa:

- `buildCommand: npm run build` e `outputDirectory: dist` (framework Vite);
- **rewrite de SPA**: qualquer caminho que não seja `assets/`, `art/`, `mockServiceWorker.js`, `favicon.svg` ou `robots.txt` cai em `/index.html`, então acesso direto e refresh em `/nft/<id>`, `/perfil/carteiras`, `/pedido/<id>` etc. funcionam;
- cache imutável para `/assets/*`, 7 dias para `/art/*` e `no-cache` para o `mockServiceWorker.js` (o worker novo é pego a cada deploy).

Os mocks ficam ligados por padrão no build (`VITE_ENABLE_MOCKS` só desliga com `false`), então não há variável obrigatória.

Passo a passo:

1. Publique o repositório no GitHub (ou GitLab/Bitbucket).
2. Na Vercel: **Add New → Project**, importe o repositório. A Vercel detecta Vite; mantenha os comandos do `vercel.json`.
3. Node.js: a Vercel respeita o `engines.node` (`>=20.19`) do `package.json`; se o painel do projeto pedir uma versão, escolha 22.x.
4. Variáveis de ambiente: nenhuma é necessária. Para abrir a demo num cenário específico, defina `VITE_MOCK_SCENARIO` (vale para visitantes sem cenário salvo).
5. **Deploy**. Alternativa pela CLI: `npx vercel` (preview) e `npx vercel --prod`.
6. Verifique no domínio publicado: abrir `/nft/emerald-ape-042` direto, dar refresh em `/carrinho`, entrar como Ana e concluir uma compra até o recibo (confirma REST e Socket.IO simulados), e abrir `/?scenario=payment-rejected`.
7. Preencha "URL pública" e "Repositório" no topo deste README.

## Estrutura de pastas

```
src/
  main.tsx              bootstrap: sobe o MSW (quando ligado), sessão e render
  app/                  QueryClient, router, providers, ciclo de vida da sessão
  routes/               rotas por arquivo do TanStack Router
  shared/contracts/     schemas zod e tipos: fonte única entre API, mocks e UI
  shared/lib/           money (decimal), storage, announcer, ids
  api/                  Axios, erros normalizados, query keys, funções por recurso
  features/<domínio>/   hooks do TanStack Query e componentes de cada domínio
  components/           ui/ (shadcn), common/, layout/
  mocks/                MSW: handlers, banco simulado, cenários, rede, Socket.IO, painel
  styles/index.css      tokens do Figma (Tailwind v4)
tests/e2e/              specs Playwright, suporte e baselines visuais
scripts/lighthouse.mjs  auditoria Lighthouse
lighthouse-reports/     relatórios (latest/ e baseline/)
public/                 artes (webp), worker do MSW, favicon, robots.txt
```

A estrutura detalhada está em [ARCHITECTURE.md](./ARCHITECTURE.md#estrutura-de-pastas).
