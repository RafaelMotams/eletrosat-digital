import { AlertTriangle, FileQuestion, Loader2, LockKeyhole, RefreshCw } from "lucide-react";

type StateKind = "loading" | "empty" | "error" | "forbidden";

const visualByKind: Record<StateKind, { icon: typeof Loader2; color: string }> = {
  loading: { icon: Loader2, color: "text-primary" },
  empty: { icon: FileQuestion, color: "text-muted-foreground" },
  error: { icon: AlertTriangle, color: "text-destructive" },
  forbidden: { icon: LockKeyhole, color: "text-amber-600" },
};

interface OperationStateProps {
  kind: StateKind;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function OperationState({ kind, title, description, actionLabel, onAction, compact = false }: OperationStateProps) {
  const { icon: Icon, color } = visualByKind[kind];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8 px-4" : "py-14 px-6"}`} role={kind === "error" || kind === "forbidden" ? "alert" : "status"}>
      <div className={`mb-3 rounded-2xl bg-muted p-3 ${color}`}>
        <Icon className={`h-6 w-6 ${kind === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {onAction && actionLabel && (
        <button type="button" onClick={onAction} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
