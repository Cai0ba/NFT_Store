/** Regras de layout por rota, compartilhadas entre header, bottom nav e o __root. */

export const isMarketPath = (pathname: string) => /^\/(nft|carrinho|pagamento)(\/|$)/.test(pathname)

export const isPrivatePath = (pathname: string) => /^\/(perfil|pagamento|pedido)(\/|$)/.test(pathname)

export const isAuthPath = (pathname: string) => /^\/(entrar|cadastro)\/?$/.test(pathname)

/**
 * Telas mobile que o Figma desenha sem bottom nav nem rodapé: têm barra de ação própria no rodapé
 * (detalhe, carrinho, pagamento) ou ocupam a tela inteira (login e cadastro).
 */
export const isImmersiveOnMobile = (pathname: string) => /^\/(nft|carrinho|pagamento|entrar|cadastro)(\/|$)/.test(pathname)

/** Destino de "Entrar" que volta para onde o usuário estava; nas telas de login não há para onde voltar. */
export function loginRedirectFor(href: string): string | undefined {
  const pathname = href.split(/[?#]/)[0] ?? '/'
  if (isAuthPath(pathname) || href === '/') return undefined
  return href
}
