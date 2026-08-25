/**
 * OfflineSyncBanner — Indicador visual de status online/offline e fila de sincronização
 *
 * Exibe:
 *  - Banner vermelho "Offline" quando sem internet
 *  - Banner amarelo animado "Sincronizando X OS..." durante sync
 *  - Badge verde "X OS sincronizadas" por 5s após sync bem-sucedida
 *  - Nada quando online e sem pendentes
 */

import { useEffect, useState, useCallback } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { dbGetAllPendingOS } from "@/hooks/useOfflineDB";
import { useSyncOfflineOS } from "@/hooks/useSyncOfflineOS";
import { getOfflineBannerMode, type OfflineBannerMode } from "@/lib/offlineSyncGuard";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudOff, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function OfflineSyncBanner() {
  const isOnline = useOnlineStatus();
  const utils = trpc.useUtils();
  const [bannerState, setBannerState] = useState<OfflineBannerMode>("hidden");
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);

  const refreshPending = useCallback(async () => {
    const all = await dbGetAllPendingOS();
    const pending = all.filter(o => o.status === "pending" || o.status === "error" || o.status === "syncing");
    setPendingCount(pending.length);
    setFailedCount(all.filter(o => o.status === "error").length);
    return pending.length;
  }, []);

  const { syncState } = useSyncOfflineOS(() => {
    // Callback chamado quando sync termina com sucesso
    refreshPending().then(remaining => {
      if (remaining === 0) {
        setSyncedCount(prev => prev + 1);
        setBannerState("success");
        utils.tecnicoAuth.minhasEscolas.invalidate();
        utils.tecnicoAuth.minhasOrdens.invalidate();
        // Esconde o banner de sucesso após 5 segundos
        setTimeout(() => setBannerState("hidden"), 5000);
      }
    });
  });

  // Atualiza o estado do banner baseado no status de sync e conexão
  useEffect(() => {
    refreshPending().then(count => {
      setBannerState(prev => getOfflineBannerMode({
        isOnline,
        isSyncing: syncState.isSyncing,
        pendingCount: count,
        hasSyncError: Boolean(syncState.lastError),
        previousMode: prev,
      }));
    });
  }, [isOnline, syncState.isSyncing, syncState.lastError, refreshPending]);

  // Atualiza contagem de pendentes periodicamente
  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 10_000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  if (bannerState === "hidden") return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2
        px-4 py-2 text-sm font-medium transition-all duration-300
        ${bannerState === "offline" ? "bg-red-600 text-white" : ""}
        ${bannerState === "syncing" ? "bg-amber-500 text-white" : ""}
        ${bannerState === "success" ? "bg-emerald-600 text-white" : ""}
        ${bannerState === "error" ? "bg-orange-600 text-white" : ""}
      `}
      role="status"
      aria-live="polite"
    >
      {bannerState === "offline" && (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>
            Sem internet
            {pendingCount > 0
              ? ` — ${pendingCount} OS aguardando sincronização`
              : " — dados em cache"}
          </span>
        </>
      )}

      {bannerState === "syncing" && (
        <>
          <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin" />
          <span>
            {syncState.pendingCount > 0
              ? `Sincronizando ${syncState.pendingCount} OS...`
              : "Sincronizando..."}
          </span>
        </>
      )}

      {bannerState === "success" && (
        <>
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>OS sincronizadas com sucesso!</span>
        </>
      )}

      {bannerState === "error" && (
        <>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {failedCount > 0 ? `${failedCount} OS` : "Uma OS"} aguarda nova tentativa — fotos não foram descartadas
          </span>
        </>
      )}
    </div>
  );
}

/**
 * OfflineStatusDot — Pequeno indicador de status para usar no header
 * Exibe um ponto verde (online) ou vermelho (offline) com contagem de pendentes
 */
export function OfflineStatusDot() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      const all = await dbGetAllPendingOS();
      setPendingCount(all.filter(o => o.status === "pending" || o.status === "error").length);
    };
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline && pendingCount === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <Wifi className="h-3 w-3" />
      </span>
    );
  }

  if (!isOnline) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <CloudOff className="h-3 w-3" />
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">
            {pendingCount}
          </span>
        )}
      </span>
    );
  }

  // Online mas com pendentes (sincronizando)
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400">
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span className="bg-amber-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">
        {pendingCount}
      </span>
    </span>
  );
}
