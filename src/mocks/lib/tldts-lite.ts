/*
 * Substituto do `tldts` no bundle do navegador (alias em vite.config.ts).
 *
 * O MSW usa o tough-cookie para guardar cookies vindos de `Set-Cookie` das respostas mockadas, e o
 * tough-cookie só precisa do tldts para descobrir o "domínio registrável" do host. A lista pública de
 * sufixos embutida no tldts pesa ~110 KB gzip, mais que o resto do MSW junto, e ficava no caminho
 * crítico do build de demonstração. Nossos handlers não emitem cookies (a sessão é por token), então
 * a regra simplificada abaixo (últimos dois rótulos; IP e host de um rótulo não têm domínio) basta.
 */
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

export function getDomain(hostname: string): string | null {
  const host = hostname.replace(/\.$/, '').toLowerCase()
  if (!host || host.includes(':') || IPV4.test(host)) return null
  const labels = host.split('.')
  if (labels.length < 2) return null
  return labels.slice(-2).join('.')
}
