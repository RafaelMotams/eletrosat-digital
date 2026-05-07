import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  MapPin, ChevronRight, CheckCircle, Clock, AlertCircle,
  Search, Zap, RefreshCw, Phone, Building2, WifiOff,
  TrendingUp, Navigation, LocateFixed, X, Wifi,
  Filter, Bell, ChevronDown
} from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { dbCacheEscolas, dbGetCachedEscolas, dbGetAllPendingOS } from "@/hooks/useOfflineDB";
import { useSyncOfflineOS } from "@/hooks/useSyncOfflineOS";

type Escola = {
  id: number;
  nome: string;
  inep: string;
  municipio?: string | null;
  endereco?: string | null;
  status: string;
  qtdAp?: number | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
  velocidadeOfertada?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  [key: string]: unknown;
};

function formatWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  // Se já começa com 55 (código do Brasil), usa direto
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Se tem DDD (10 ou 11 dígitos), adiciona código do Brasil
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Se tem apenas o número sem DDD (8 ou 9 dígitos), retorna como está
  return digits;
}

function haversine(a: Escola, b: Escola): number {
  const R = 6371;
  const lat1 = parseFloat(a.latitude ?? "0");
  const lat2 = parseFloat(b.latitude ?? "0");
  const lng1 = parseFloat(a.longitude ?? "0");
  const lng2 = parseFloat(b.longitude ?? "0");
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function sortByRoute(list: Escola[]): Escola[] {
  if (!list || list.length === 0) return [];
  const withCoords = list.filter(e => e.latitude && e.longitude);
  const withoutCoords = list.filter(e => !e.latitude || !e.longitude);
  if (withCoords.length === 0) return list;
  const sorted: Escola[] = [];
  const remaining = [...withCoords];
  let current = remaining.splice(0, 1)[0];
  sorted.push(current);
  while (remaining.length > 0) {
    let ni = 0, nd = haversine(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < nd) { nd = d; ni = i; }
    }
    current = remaining.splice(ni, 1)[0];
    sorted.push(current);
  }
  return [...sorted, ...withoutCoords];
}



const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  pendente:     { label: "Pendente",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)",  icon: AlertCircle },
  em_andamento: { label: "Em andamento", color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)",  icon: Clock },
  concluido:    { label: "Concluído",    color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)",  icon: CheckCircle },
  nao_instalada:{ label: "Não instalada",color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   icon: AlertCircle },
};

type FilterType = "todos" | "pendente" | "em_andamento" | "concluido" | "nao_instalada";

// Welcome modal — shows only on first login
function WelcomeModal({ nome, onClose }: { nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background: "linear-gradient(160deg, #0d1a35, #0a1225)", border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>
          <img src="/manus-storage/netvionis-logo_1c60afaf.webp" alt="Netvionis" className="w-full h-full object-cover" />
        </div>
        <div className="text-2xl mb-2">👋</div>
        <h2 className="text-xl font-black text-white mb-2">Bem-vindo, {nome.split(" ")[0]}!</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Você está na <span className="text-blue-400 font-semibold">Área do Técnico Netvionis</span>. Aqui você gerencia suas ordens de serviço, registra instalações e acompanha seu progresso.
        </p>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)", boxShadow: "0 8px 24px rgba(37,99,235,0.4)" }}>
          Começar agora
        </button>
      </div>
    </div>
  );
}

export default function TecnicoHome() {
  const [, navigate] = useLocation();
  const [tecnicoId, setTecnicoId] = useState(0);
  const [tecnicoNome, setTecnicoNome] = useState("Técnico");
  const [search, setSearch] = useState("");
  const [offlineEscolas, setOfflineEscolas] = useState<Escola[] | null>(null);
  const [searchFocus, setSearchFocus] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("todos");
  // Welcome modal removido conforme solicitado
  const [pendingOsCount, setPendingOsCount] = useState(0);
  const isOnline = useOnlineStatus();
  const { syncState } = useSyncOfflineOS();

  // Atualiza contagem de OS pendentes periodicamente
  useEffect(() => {
    const refresh = async () => {
      const all = await dbGetAllPendingOS();
      setPendingOsCount(all.filter(o => o.status === "pending" || o.status === "error").length);
    };
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem("tecnico_id");
    const nome = localStorage.getItem("tecnico_nome");
    if (!id) {
      const stored = localStorage.getItem("tecnico");
      if (!stored) { navigate("/tecnico/login"); return; }
      try {
        const t = JSON.parse(stored);
        localStorage.setItem("tecnico_id", String(t.id));
        localStorage.setItem("tecnico_nome", t.nome);
        localStorage.setItem("tecnico_email", t.email);
        setTecnicoId(t.id);
        setTecnicoNome(t.nome);
      } catch { navigate("/tecnico/login"); }
    } else {
      setTecnicoId(Number(id));
      setTecnicoNome(nome || "Técnico");
    }
    // Welcome modal removido — limpar chave antiga se existir
    localStorage.removeItem("tecnico_show_welcome");
  }, [navigate]);

  const { data: escolasOnline, isLoading, refetch } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    {
      enabled: !!tecnicoId && isOnline,
      // Polling a cada 2 minutos — suficiente para ver novas atribuições sem sobrecarregar
      refetchInterval: isOnline ? 2 * 60 * 1000 : false,
      // Dados válidos por 2 minutos antes de considerar desatualizado
      staleTime: 2 * 60 * 1000,
      // Não refaz ao voltar o foco (evita flash de loading ao sair do app de câmera)
      refetchOnWindowFocus: false,
      // Mantém dados anteriores enquanto refaz a busca (sem tela vazia)
      placeholderData: (prev) => prev,
      retry: 2,
    }
  );

  // Salva escolas no IndexedDB ao carregar online
  useEffect(() => {
    if (escolasOnline && tecnicoId) {
      dbCacheEscolas(tecnicoId, escolasOnline as unknown as Escola[]);
    }
  }, [escolasOnline, tecnicoId]);

  // Carrega escolas do IndexedDB quando offline
  useEffect(() => {
    if (!isOnline && tecnicoId) {
      dbGetCachedEscolas(tecnicoId).then((cached) => {
        if (cached) setOfflineEscolas(cached as Escola[]);
      });
    }
  }, [isOnline, tecnicoId]);

  const escolas = ((escolasOnline ?? offlineEscolas ?? []) as Escola[]);
  const sortedEscolas = sortByRoute(escolas);

  const routeEscolas = useCallback(() => {
    if (userLat !== null && userLng !== null && sortedEscolas.length > 0) {
      const withCoords = sortedEscolas.filter(e => e.latitude && e.longitude);
      const withoutCoords = sortedEscolas.filter(e => !e.latitude || !e.longitude);
      if (withCoords.length === 0) return sortedEscolas;
      const userPoint = { latitude: String(userLat), longitude: String(userLng) } as Escola;
      let ni = 0, nd = haversine(userPoint, withCoords[0]);
      for (let i = 1; i < withCoords.length; i++) {
        const d = haversine(userPoint, withCoords[i]);
        if (d < nd) { nd = d; ni = i; }
      }
      const remaining = [...withCoords];
      const first = remaining.splice(ni, 1)[0];
      const sorted: Escola[] = [first];
      let current = first;
      while (remaining.length > 0) {
        let bi = 0, bd = haversine(current, remaining[0]);
        for (let i = 1; i < remaining.length; i++) {
          const d = haversine(current, remaining[i]);
          if (d < bd) { bd = d; bi = i; }
        }
        current = remaining.splice(bi, 1)[0];
        sorted.push(current);
      }
      return [...sorted, ...withoutCoords];
    }
    return sortedEscolas;
  }, [sortedEscolas, userLat, userLng]);

  const finalSorted = routeEscolas();

  // Apply filter
  const filteredByStatus = activeFilter === "todos"
    ? finalSorted
    : finalSorted.filter(e => e.status === activeFilter);

  const filtered = filteredByStatus.filter(e =>
    !search || e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.inep.includes(search) || (e.municipio ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total = escolas.length;
  const concluidas = escolas.filter(e => e.status === "concluido").length;
  const emAndamento = escolas.filter(e => e.status === "em_andamento").length;
  const pendentes = escolas.filter(e => e.status === "pendente").length;
  const naoInstaladas = escolas.filter(e => e.status === "nao_instalada").length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  const totalAps = escolas.reduce((acc, e) => acc + (e.qtdAp ?? 0), 0);
  const apsInstalados = escolas.filter(e => e.status === "concluido").reduce((acc, e) => acc + (e.qtdAp ?? 0), 0);



  const getInitials = (nome: string) =>
    nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  function handleLocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  const filterTabs: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: "todos",        label: "Todos",       count: total,        color: "#94a3b8" },
    { key: "pendente",     label: "Pendentes",   count: pendentes,    color: "#f59e0b" },
    { key: "em_andamento", label: "Andamento",   count: emAndamento,  color: "#3b82f6" },
    { key: "concluido",    label: "Concluídos",  count: concluidas,   color: "#10b981" },
    { key: "nao_instalada",label: "Não inst.",   count: naoInstaladas,color: "#ef4444" },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-28"
      style={{ background: "linear-gradient(160deg, #050d1f 0%, #0a1930 60%, #050d1f 100%)" }}>

      {/* Welcome modal */}
      {/* WelcomeModal removido conforme solicitado */}

      {/* Indicador de status de sync */}
      {(!isOnline || syncState.isSyncing || pendingOsCount > 0) && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{
            background: !isOnline
              ? "rgba(245,158,11,0.1)"
              : syncState.isSyncing
              ? "rgba(59,130,246,0.1)"
              : "rgba(16,185,129,0.1)",
            borderBottom: `1px solid ${!isOnline ? "rgba(245,158,11,0.15)" : syncState.isSyncing ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)"}`,
            color: !isOnline ? "#fbbf24" : syncState.isSyncing ? "#60a5fa" : "#34d399",
          }}>
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              Modo offline{pendingOsCount > 0 ? ` — ${pendingOsCount} OS aguardando envio` : " — dados em cache"}
            </>
          ) : syncState.isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Sincronizando OS pendentes...
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5" />
              {pendingOsCount > 0 ? `${pendingOsCount} OS aguardando sincronização` : "Sincronizado"}
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
              style={{ boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
              <img src="/manus-storage/netvionis-logo_1c60afaf.webp" alt="Netvionis" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.6)" }}>{saudacao}</p>
              <h1 className="text-base font-black text-white leading-tight">{tecnicoNome.split(" ")[0]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline && (
              <button onClick={() => refetch()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} style={{ color: "rgba(148,163,184,0.6)" }} />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}>
                {getInitials(tecnicoNome)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress card */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(79,70,229,0.1))", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-slate-400 mb-0.5">Progresso do dia</p>
              <p className="text-2xl font-black text-white">{progresso}<span className="text-sm font-bold text-slate-400">%</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 mb-0.5">Escolas</p>
              <p className="text-lg font-black" style={{ color: "#3b82f6" }}>{concluidas}<span className="text-xs text-slate-400 font-medium">/{total}</span></p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progresso}%`, background: "linear-gradient(90deg, #2563eb, #4f46e5)" }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{concluidas} concluídas</span>
            <span className="text-xs text-slate-500">{total} total</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Pendentes", value: pendentes, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)" },
            { label: "Andamento", value: emAndamento, color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.15)" },
            { label: "Concluídas", value: concluidas, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>


      </div>

      {/* Search + Filter */}
      <div className="px-4 mb-3">
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: searchFocus ? "#3b82f6" : "rgba(100,116,139,0.5)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            placeholder="Buscar escola, INEP ou município..."
            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
            style={{
              background: searchFocus ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.05)",
              border: searchFocus ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.07)",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg"
              style={{ color: "rgba(100,116,139,0.6)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filterTabs.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95"
              style={{
                background: activeFilter === f.key ? `${f.color}20` : "rgba(255,255,255,0.04)",
                border: activeFilter === f.key ? `1px solid ${f.color}40` : "1px solid rgba(255,255,255,0.07)",
                color: activeFilter === f.key ? f.color : "rgba(100,116,139,0.7)",
              }}>
              {f.label}
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                style={{
                  background: activeFilter === f.key ? `${f.color}25` : "rgba(255,255,255,0.06)",
                  color: activeFilter === f.key ? f.color : "rgba(100,116,139,0.6)",
                }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Locate button */}
      {!userLat && (
        <div className="px-4 mb-3">
          <button onClick={handleLocate} disabled={locating}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(148,163,184,0.7)" }}>
            <LocateFixed className={`w-3.5 h-3.5 ${locating ? "animate-pulse" : ""}`} style={{ color: "#06b6d4" }} />
            {locating ? "Localizando..." : "Ordenar por proximidade"}
          </button>
        </div>
      )}

      {/* List header */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">
          {filtered.length} {filtered.length === 1 ? "escola" : "escolas"}
          {activeFilter !== "todos" && ` · ${filterTabs.find(f => f.key === activeFilter)?.label}`}
        </p>
        {userLat && (
          <button onClick={() => { setUserLat(null); setUserLng(null); }}
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: "#06b6d4" }}>
            <LocateFixed className="w-3 h-3" />
            Limpar GPS
          </button>
        )}
      </div>

      {/* OS List */}
      <div className="px-4 space-y-3">
        {isLoading && !offlineEscolas ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-28 animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Wifi className="w-7 h-7" style={{ color: "rgba(100,116,139,0.4)" }} />
            </div>
            <p className="text-sm font-semibold text-slate-400">Nenhuma escola encontrada</p>
            <p className="text-xs text-slate-600 mt-1">Tente outro filtro ou termo de busca</p>
          </div>
        ) : (
          filtered.map((escola, idx) => {
            const sc = STATUS_CONFIG[escola.status] ?? STATUS_CONFIG.pendente;
            const StatusIcon = sc.icon;
            const whatsNum = formatWhatsApp(escola.telefoneWhatsApp || escola.telefone);

            return (
              <div key={escola.id}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${sc.border}` }}>

                {/* Card body */}
                <button onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                  className="w-full text-left p-4 active:opacity-80 transition-opacity">
                  <div className="flex items-start gap-3">
                    {/* Avatar colorido com iniciais da escola */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-black text-white"
                      style={{
                        background: `linear-gradient(135deg, ${sc.color}30, ${sc.color}15)`,
                        border: `1px solid ${sc.color}35`,
                        color: sc.color,
                        letterSpacing: "-0.5px",
                      }}>
                      {escola.nome.split(" ").filter((w: string) => w.length > 2).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || escola.nome.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{escola.nome}</h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                          <StatusIcon className="w-2.5 h-2.5" style={{ color: sc.color }} />
                          <span className="text-[10px] font-bold" style={{ color: sc.color }}>{sc.label}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {escola.inep && (
                          <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(148,163,184,0.4)" }}>
                            #{escola.inep}
                          </span>
                        )}
                        {escola.municipio && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(148,163,184,0.35)" }} />
                            <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{escola.municipio}</span>
                          </div>
                        )}
                        {escola.velocidadeOfertada && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
                            <span className="text-[10px] font-semibold" style={{ color: "#fbbf24" }}>{escola.velocidadeOfertada} Mbps</span>
                          </div>
                        )}
                        {escola.qtdAp != null && escola.qtdAp > 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                            <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
                              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="#818cf8" stroke="none" />
                            </svg>
                            <span className="text-[10px] font-bold" style={{ color: "#818cf8" }}>{escola.qtdAp} AP{(escola.qtdAp as number) > 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>

                      {escola.endereco && (
                        <div className="flex items-start gap-1.5 mt-2 px-2.5 py-2 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "rgba(248,113,113,0.6)" }} />
                          <span className="text-xs font-medium leading-relaxed text-white" style={{ wordBreak: "break-word", opacity: 0.85 }}>{escola.endereco}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Action bar */}
                <div className="flex" style={{ borderTop: `1px solid ${sc.border}` }}>
                  {whatsNum ? (
                    <a href={`https://wa.me/${whatsNum}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all active:opacity-70"
                      style={{ color: "#25d366" }} onClick={e => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(escola.nome + " " + escola.inep + " telefone")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium"
                      style={{ color: "rgba(100,116,139,0.5)" }} onClick={e => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5" />
                      Buscar tel.
                    </a>
                  )}
                  <div style={{ width: "1px", background: sc.border }} />
                  {escola.latitude && escola.longitude && (
                    <>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${escola.latitude},${escola.longitude}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all active:opacity-70"
                        style={{ color: "#06b6d4" }} onClick={e => e.stopPropagation()}>
                        <Navigation className="w-3.5 h-3.5" />
                        Google Maps
                      </a>
                      <div style={{ width: "1px", background: sc.border }} />
                    </>
                  )}
                  <button onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all active:opacity-70"
                    style={{ color: sc.color }}>
                    Ver OS
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
