import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { SpinnerIcon } from './spinner'

/** Toaster do sonner com a paleta do Kurio. No mobile sobe acima da bottom nav fixa. */
export function Toaster(props: ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      mobileOffset={{ bottom: 104 }}
      closeButton
      containerAriaLabel="Notificações"
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-4 text-success" />,
        error: <CircleAlert aria-hidden="true" className="size-4 text-danger" />,
        warning: <TriangleAlert aria-hidden="true" className="size-4 text-warning" />,
        info: <Info aria-hidden="true" className="size-4 text-text-accent" />,
        loading: <SpinnerIcon className="text-text-accent" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group relative flex w-full items-start gap-3 rounded-sm border border-border-soft border-l-4 border-l-primary bg-surface-card p-4 font-mono text-sm text-foreground shadow-card',
          title: 'font-bold leading-5',
          description: 'mt-0.5 text-[13px] leading-5 text-text-secondary',
          icon: 'mt-0.5 shrink-0',
          actionButton:
            'ml-auto shrink-0 cursor-pointer rounded-sm bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-text-accent',
          cancelButton:
            'shrink-0 cursor-pointer rounded-sm border border-border-soft px-3 py-1.5 text-xs text-text-secondary hover:text-foreground',
          closeButton:
            'absolute -top-2 -left-2 flex size-5 cursor-pointer items-center justify-center rounded-full border border-border-soft bg-surface-raised text-text-secondary hover:text-foreground',
          error: 'border-l-danger',
          success: 'border-l-success',
          warning: 'border-l-warning',
        },
      }}
      {...props}
    />
  )
}
