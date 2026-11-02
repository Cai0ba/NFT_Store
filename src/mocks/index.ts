/**
 * Ponto de entrada sem efeitos colaterais para quem só precisa de tipos e referências do seed
 * (ex.: testes E2E). Para ligar os mocks use `startMocks` de `./browser`.
 */
export type { KurioMockControl } from './control'
export type { NetworkConfig, NetworkRule, LatencyProfile, PaymentOutcome } from './config'
export type { NftChange } from './services/catalog'
export { SCENARIO_NAMES, type ScenarioName } from './scenario-names'
export { SEED_ACCOUNTS, SEED_COUPONS, SEED_NFTS, SEED_WALLETS } from './fixtures'
