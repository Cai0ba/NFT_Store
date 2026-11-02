/**
 * Configuração lida do ambiente do Vite. Os mocks ficam ligados por padrão porque o build de
 * demonstração (Vercel) precisa funcionar sem backend; só desligam com VITE_ENABLE_MOCKS=false.
 */
export const env = {
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS !== 'false',
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'wss://realtime.kurio.test',
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'default',
  isDev: import.meta.env.DEV,
} as const
