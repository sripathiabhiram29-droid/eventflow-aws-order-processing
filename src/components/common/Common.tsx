import { AlertTriangle, CheckCircle2, Copy, Inbox, LoaderCircle, X, XCircle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { classForStatus, statusLabel } from "../../utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${classForStatus(status)}`}>
      <span className="status-dot" />
      {statusLabel(status)}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: ReactNode;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {trend && <span className="metric-trend">{trend}</span>}
      </div>
    </article>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-label="Loading content" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton" key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="state-panel">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-panel error">
      <XCircle size={30} />
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={`modal-icon ${danger ? "danger" : "warning"}`}>
          {danger ? <AlertTriangle /> : <CheckCircle2 />}
        </div>
        <h2 id="modal-title">{title}</h2>
        <p>{description}</p>
        {children}
        <div className="modal-actions">
          <button ref={cancelRef} className="button secondary" onClick={onClose}>
            Go back
          </button>
          <button className={`button ${danger ? "danger" : "primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ToastRegion({
  toasts,
  dismiss,
}: {
  toasts: { id: string; tone: "success" | "error" | "info"; message: string }[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast ${toast.tone}`} key={toast.id}>
          {toast.tone === "success" ? (
            <CheckCircle2 />
          ) : toast.tone === "error" ? (
            <XCircle />
          ) : (
            <LoaderCircle />
          )}
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CopyButton({ value }: { value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
  };
  return (
    <button className="icon-text-button" onClick={() => void copy()}>
      <Copy size={14} /> Copy JSON
    </button>
  );
}
