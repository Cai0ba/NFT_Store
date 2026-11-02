import { useNavigate } from '@tanstack/react-router'
import { isPrivatePath } from '@/components/layout/route-chrome'
import { useIsDesktop } from '@/components/layout/use-media-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { HomePage } from '@/features/catalog/components/HomePage'
import { AUTH_COPY, AuthTabs, type AuthMode } from './AuthParts'
import { LoginForm, RegisterForm } from './AuthForms'

/**
 * Desktop: modal sobre a Início, como no Figma. Mobile: tela cheia. A escolha é por media query em JS
 * porque o Dialog do Radix prende o foco e esconde o resto da página; escondê-lo só com CSS deixaria
 * o foco preso num modal invisível.
 */
export function AuthScreen({ mode, redirect }: { mode: AuthMode; redirect: string | undefined }) {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const copy = AUTH_COPY[mode]
  const Form = mode === 'login' ? LoginForm : RegisterForm

  // Fechar sem entrar: voltar para uma rota privada só traria o login de novo.
  const close = () => {
    const pathname = redirect?.split(/[?#]/)[0] ?? '/'
    void navigate({ href: redirect && !isPrivatePath(pathname) ? redirect : '/', replace: true })
  }

  if (!isDesktop) {
    return (
      <section aria-labelledby="auth-titulo" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-24 pb-10">
        <p aria-hidden="true" className="text-center text-[32px] leading-10 font-bold tracking-[0.1em] text-foreground">
          KURIO
        </p>
        <h1 id="auth-titulo" className="mt-16 text-center text-xl leading-7 font-bold text-foreground">
          {copy.mobileTitle}
        </h1>
        <p className="sr-only">{copy.description}</p>
        <div className="mt-8">
          <Form redirect={redirect} variant="screen" />
        </div>
      </section>
    )
  }

  return (
    <>
      {/* inert: além de sumir da árvore de acessibilidade, os links do fundo deixam de receber foco. */}
      <div inert>
        <HomePage search={{}} />
      </div>
      <Dialog open onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent
          accentEdge
          closeLabel="Fechar e voltar"
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="max-w-[520px] gap-0 px-6 pt-10 pb-9 sm:px-[84px]"
        >
          <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}</DialogTitle>
          <AuthTabs mode={mode} redirect={redirect} />
          <DialogDescription className="mt-6 text-center text-[13px] leading-5 text-foreground">{copy.description}</DialogDescription>
          <div className="mt-6">
            <Form redirect={redirect} variant="dialog" autoFocus />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
