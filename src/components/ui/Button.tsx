import React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-[#0D99FF] hover:bg-[#007BE5] text-white shadow-xs focus:ring-[#0D99FF]/40',
      secondary: 'bg-white dark:bg-[#2C2C2C] hover:bg-slate-50 dark:hover:bg-[#383838] text-slate-700 dark:text-slate-200 border border-[#E5E5E5] dark:border-[#383838] shadow-xs',
      outline: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 border border-[#E5E5E5] dark:border-[#383838]',
      ghost: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300',
      danger: 'bg-[#F24E1E] hover:bg-red-700 text-white shadow-xs focus:ring-red-500/40',
    }

    const sizeStyles = {
      sm: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
      md: 'px-3.5 py-1.5 text-xs font-semibold rounded-lg gap-2',
      lg: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        <span>{children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
