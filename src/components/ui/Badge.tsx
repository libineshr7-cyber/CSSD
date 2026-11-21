import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  dot?: boolean
}

export function Badge({
  className,
  variant = 'gray',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const styles = {
    blue: 'bg-[#0D99FF]/10 text-[#0D99FF] border-[#0D99FF]/20',
    green: 'bg-[#0ACF83]/10 text-[#0ACF83] border-[#0ACF83]/20',
    yellow: 'bg-[#FFC700]/15 text-amber-700 dark:text-[#FFC700] border-[#FFC700]/25',
    red: 'bg-[#F24E1E]/10 text-[#F24E1E] border-[#F24E1E]/20',
    purple: 'bg-[#A259FF]/10 text-[#A259FF] border-[#A259FF]/20',
    gray: 'bg-slate-100 dark:bg-[#333333] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  }

  const dotColors = {
    blue: 'bg-[#0D99FF]',
    green: 'bg-[#0ACF83]',
    yellow: 'bg-[#FFC700]',
    red: 'bg-[#F24E1E]',
    purple: 'bg-[#A259FF]',
    gray: 'bg-slate-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight',
        styles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}

export default Badge
