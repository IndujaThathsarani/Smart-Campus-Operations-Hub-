import { AlertTriangle, Check, Info, X } from 'lucide-react'

const VARIANT_STYLES = {
  success: {
    border: 'border-emerald-200',
    panel: 'bg-white',
    title: 'text-slate-900',
    message: 'text-slate-500',
    icon: Check,
    iconWrap: 'border-emerald-300 text-emerald-600 bg-emerald-50',
    button: 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-emerald-200',
  },
  error: {
    border: 'border-rose-200',
    panel: 'bg-white',
    title: 'text-slate-900',
    message: 'text-slate-500',
    icon: X,
    iconWrap: 'border-rose-300 text-rose-600 bg-rose-50',
    button: 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-200',
  },
  warning: {
    border: 'border-amber-200',
    panel: 'bg-white',
    title: 'text-slate-900',
    message: 'text-slate-500',
    icon: AlertTriangle,
    iconWrap: 'border-amber-300 text-amber-600 bg-amber-50',
    button: 'bg-amber-500 hover:bg-amber-400 focus-visible:ring-amber-200',
  },
  info: {
    border: 'border-sky-200',
    panel: 'bg-white',
    title: 'text-slate-900',
    message: 'text-slate-500',
    icon: Info,
    iconWrap: 'border-sky-300 text-sky-600 bg-sky-50',
    button: 'bg-sky-600 hover:bg-sky-500 focus-visible:ring-sky-200',
  },
}

export default function ActionToasts({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  const toast = toasts[0]
  const styles = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.success
  const Icon = styles.icon || Info

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`action-toast-title-${toast.id}`}
        aria-describedby={toast.message ? `action-toast-message-${toast.id}` : undefined}
        className={`toast-enter w-full max-w-md rounded-[2rem] border ${styles.border} ${styles.panel} px-6 py-8 text-center shadow-[0_28px_60px_rgba(15,23,42,0.22)] sm:px-8`}
      >
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 ${styles.iconWrap}`}
        >
          <Icon className="h-12 w-12" strokeWidth={2.5} />
        </div>
        <h2 id={`action-toast-title-${toast.id}`} className={`mt-6 text-4xl font-semibold ${styles.title}`}>
          {toast.title}
        </h2>
        {toast.message && (
          <p
            id={`action-toast-message-${toast.id}`}
            className={`mx-auto mt-4 max-w-sm text-lg leading-8 ${styles.message}`}
          >
            {toast.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => onDismiss?.(toast.id)}
          className={`mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-b-4 border-slate-900 px-5 text-xl font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 ${styles.button}`}
        >
          OK
        </button>
      </div>
    </div>
  )
}
