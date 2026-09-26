'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { className?: string }

/** Password field with a button to show or hide what the customer types. */
export function PasswordInput({ className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative block">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 mt-1.5 flex w-12 items-center justify-center rounded-r-xl text-piedra hover:text-ciruela"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </span>
  )
}
