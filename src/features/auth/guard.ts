import { redirect, type ParsedLocation } from '@tanstack/react-router'
import type { User } from '@/shared/contracts'
import type { AuthController } from './session'

interface GuardArgs {
  context: { auth: AuthController }
  location: ParsedLocation
}

/**
 * Para `beforeLoad` das rotas privadas. Durante o boot espera a validação do token, senão um refresh
 * em /perfil mandaria o usuário logado para o login.
 */
export async function requireAuth({ context, location }: GuardArgs): Promise<{ user: User }> {
  const session = await context.auth.whenReady()
  if (session.status !== 'authenticated' || !session.user) {
    throw redirect({ to: '/entrar', search: { redirect: location.href } })
  }
  return { user: session.user }
}
