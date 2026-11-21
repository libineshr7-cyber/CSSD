import React from 'react'
import { cn } from '../../lib/utils'

export interface FormFieldProps {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  helperText,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-[#F24E1E]">*</span>}
      </label>
      {children}
      {error ? (
        <span className="text-[11px] text-[#F24E1E] font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-[11px] text-slate-400">{helperText}</span>
      ) : null}
    </div>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 bg-white dark:bg-[#252525] border rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] focus:border-transparent transition-all',
            icon && 'pl-9',
            error
              ? 'border-[#F24E1E] focus:ring-[#F24E1E]'
              : 'border-[#E5E5E5] dark:border-[#383838]',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'
