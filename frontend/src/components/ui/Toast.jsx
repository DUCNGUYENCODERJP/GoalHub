// Toast wrapper component for consistent styling with shadcn/ui
// Using react-hot-toast which is already installed

import toast from 'react-hot-toast'

const toastOptions = {
  duration: 3500,
  style: {
    fontSize: '14px',
    borderRadius: 'var(--radius)',
    background: 'var(--background)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
  },
  success: {
    iconTheme: {
      primary: 'var(--primary)',
      secondary: 'var(--primary-foreground)',
    },
  },
  error: {
    iconTheme: {
      primary: 'var(--destructive)',
      secondary: 'var(--destructive-foreground)',
    },
  },
}

export const toastSuccess = (message) => toast.success(message, toastOptions)
export const toastError = (message) => toast.error(message, toastOptions)
export const toastInfo = (message) => toast(message, {
  ...toastOptions,
  icon: 'ℹ️',
})
export const toastWarning = (message) => toast(message, {
  ...toastOptions,
  icon: '⚠️',
  style: {
    ...toastOptions.style,
    background: 'var(--warning-bg, #fef3c7)',
    color: 'var(--warning-fg, #92400e)',
  },
})

export { toast }