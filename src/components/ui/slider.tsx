import { Slider as SliderPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  /** Um rótulo por thumb, ex.: ["Preço mínimo", "Preço máximo"]. */
  thumbLabels: readonly string[]
  /** Texto lido pelo leitor de tela para cada valor (ex.: "0,02 ether"). */
  formatValueText?: (value: number) => string
}

export function Slider({ className, thumbLabels, formatValueText, value, defaultValue, ...props }: SliderProps) {
  const values = value ?? defaultValue ?? [props.min ?? 0]

  return (
    <SliderPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      className={cn(
        'relative flex h-5 w-full touch-none items-center select-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-0.5 w-full grow overflow-hidden rounded-pill bg-primary/45">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={thumbLabels[index]}
          aria-valuetext={formatValueText?.(thumbValue)}
          className={cn(
            'block size-3.5 cursor-grab rounded-full border-2 border-ink bg-primary shadow-[0_0_0_1px_var(--color-primary)]',
            'transition-transform hover:scale-110 active:cursor-grabbing',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}
