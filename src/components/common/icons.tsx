import type { SVGProps } from 'react'

/*
 * Marcas que o lucide deixou de distribuir (Google, Facebook, LinkedIn, X) e a ilustração do envelope
 * da confirmação. Todos decorativos por padrão; quem usa fornece o texto acessível ao lado.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps): IconProps => ({
  'aria-hidden': true,
  focusable: false,
  ...props,
})

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base(props)}>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  )
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} {...base(props)}>
      <path
        fill="#3B5998"
        d="M13.4 24V13.05h3.68l.55-4.27H13.4V6.06c0-1.24.34-2.08 2.12-2.08h2.26V.17A30.3 30.3 0 0 0 14.48 0C11.22 0 9 1.99 9 5.64v3.14H5.3v4.27H9V24h4.4Z"
      />
    </svg>
  )
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" {...base(props)}>
      <path d="M5.34 7.5H.6V24h4.74V7.5ZM2.97 0a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5ZM24 14.67c0-4.44-.96-7.53-6.14-7.53-2.49 0-4.16 1.37-4.84 2.66h-.07V7.5H8.4V24h4.73v-8.16c0-2.15.41-4.24 3.08-4.24 2.63 0 2.67 2.46 2.67 4.38V24H24v-9.33Z" />
    </svg>
  )
}

export function XBrandIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" {...base(props)}>
      <path d="M18.24 2.25h3.31l-7.23 8.26L22.82 21.75h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  )
}

/** Envelope "THANK YOU" do modal de confirmação, em traço laranja como no Figma. */
export function ThankYouEnvelopeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 56" width={64} height={56} fill="none" {...base(props)}>
      <g stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round">
        <path d="M6 24 32 5l26 19v27a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V24Z" />
        <path d="M12 28V9h40v19" />
        <path d="m6 24 26 17 26-17M6 51l20-14M58 51 38 37" />
      </g>
      <text
        x="32"
        y="19"
        textAnchor="middle"
        fill="var(--color-primary)"
        fontFamily="Roboto Mono, monospace"
        fontSize="7.5"
        fontWeight={700}
      >
        THANK
      </text>
      <text
        x="32"
        y="27"
        textAnchor="middle"
        fill="var(--color-primary)"
        fontFamily="Roboto Mono, monospace"
        fontSize="7.5"
        fontWeight={700}
      >
        YOU
      </text>
    </svg>
  )
}

/** Versão monocromática (currentColor) para a lista de redes sociais do rodapé. */
export function FacebookGlyphIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" {...base(props)}>
      <path d="M13.4 24V13.05h3.68l.55-4.27H13.4V6.06c0-1.24.34-2.08 2.12-2.08h2.26V.17A30.3 30.3 0 0 0 14.48 0C11.22 0 9 1.99 9 5.64v3.14H5.3v4.27H9V24h4.4Z" />
    </svg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} {...base(props)}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" {...base(props)}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  )
}
