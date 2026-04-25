import {
  FaCircleCheck,
  FaCircleExclamation,
  FaCircleInfo,
  FaCircleXmark,
  FaXmark,
} from 'react-icons/fa6'

const VARIANT_STYLES = {
  success: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    title: 'text-emerald-950',
    message: 'text-emerald-800',
    icon: FaCircleCheck,
    iconWrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  },
  error: {
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    title: 'text-rose-950',
    message: 'text-rose-800',
    icon: FaCircleXmark,
    iconWrap: 'bg-rose-100 text-rose-700 ring-rose-200',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    title: 'text-amber-950',
    message: 'text-amber-800',
    icon: FaCircleExclamation,
    iconWrap: 'bg-amber-100 text-amber-700 ring-amber-200',
  },
  info: {
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    title: 'text-sky-950',
    message: 'text-sky-800',
    icon: FaCircleInfo,
    iconWrap: 'bg-sky-100 text-sky-700 ring-sky-200',
  },
}

export default function ActionToasts({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const styles = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.success
        const Icon = styles.icon || FaCircleInfo
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            className={`pointer-events-auto toast-enter rounded-2xl border ${styles.border} ${styles.bg} px-4 py-3 text-left shadow-[0_18px_36px_rgba(15,23,42,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,23,42,0.2)]`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.iconWrap}`}
              >
                <Icon className="text-lg" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`m-0 text-sm font-semibold ${styles.title}`}>{toast.title}</p>
                {toast.message && (
                  <p className={`mt-1 m-0 text-sm leading-5 ${styles.message}`}>{toast.message}</p>
                )}
              </div>
              <span className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition group-hover:text-slate-700">
                <FaXmark className="text-sm" />
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
