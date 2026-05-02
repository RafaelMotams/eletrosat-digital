import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  MapPin, ChevronRight, CheckCircle, Clock, AlertCircle,
  Search, Zap, RefreshCw, Phone, Building2, WifiOff,
  Sparkles, TrendingUp, Navigation, Route, LocateFixed
} from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cacheEscolas, getCachedEscolas } from "@/hooks/useOfflineQueue";

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
  let local = digits;
  if (local.startsWith("55")) local = local.slice(2);
  if (local.startsWith("75")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.length < 8 || local.length > 9) return null;
  return `5575${local}`;
}

// Haversine distance in km
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

// Nearest-neighbor TSP approximation
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

// Build Google Maps route URL with waypoints
function buildGoogleMapsRoute(escolas: Escola[]): string {
  const pending = escolas.filter(e => e.status === "pendente" || e.status === "em_andamento");
  const withCoords = pending.filter(e => e.latitude && e.longitude);
  if (withCoords.length === 0) return "";
  const sorted = sortByRoute(withCoords);
  if (sorted.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${sorted[0].latitude},${sorted[0].longitude}`;
  }
  const origin = `${sorted[0].latitude},${sorted[0].longitude}`;
  const destination = `${sorted[sorted.length - 1].latitude},${sorted[sorted.length - 1].longitude}`;
  const waypoints = sorted.slice(1, -1).map(e => `${e.latitude},${e.longitude}`).join("|");
  const base = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  return waypoints ? `${base}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving` : `${base}&travelmode=driving`;
}

const statusConfig: Record<string, {
  label: string; icon: typeof CheckCircle;
  gradient: string; glow: string;
  badgeBg: string; badgeText: string;
  cardBg: string; cardBorder: string;
  avatarGradient: string;
}> = {
  pendente: {
    label: "Pendente", icon: AlertCircle,
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    glow: "rgba(245,158,11,0.25)",
    badgeBg: "rgba(245,158,11,0.15)", badgeText: "#fbbf24",
    cardBg: "rgba(245,158,11,0.04)", cardBorder: "rgba(245,158,11,0.18)",
    avatarGradient: "linear-gradient(135deg, #92400e, #d97706)",
  },
  em_andamento: {
    label: "Em andamento", icon: Clock,
    gradient: "linear-gradient(135deg, #3b82f6, #6366f1)",
    glow: "rgba(99,102,241,0.25)",
    badgeBg: "rgba(99,102,241,0.15)", badgeText: "#818cf8",
    cardBg: "rgba(99,102,241,0.04)", cardBorder: "rgba(99,102,241,0.22)",
    avatarGradient: "linear-gradient(135deg, #1e1b4b, #4f46e5)",
  },
  concluido: {
    label: "Concluído", icon: CheckCircle,
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    glow: "rgba(16,185,129,0.25)",
    badgeBg: "rgba(16,185,129,0.15)", badgeText: "#34d399",
    cardBg: "rgba(16,185,129,0.04)", cardBorder: "rgba(16,185,129,0.22)",
    avatarGradient: "linear-gradient(135deg, #064e3b, #10b981)",
  },
  nao_instalada: {
    label: "Não instalada", icon: AlertCircle,
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    glow: "rgba(239,68,68,0.25)",
    badgeBg: "rgba(239,68,68,0.15)", badgeText: "#f87171",
    cardBg: "rgba(239,68,68,0.04)", cardBorder: "rgba(239,68,68,0.22)",
    avatarGradient: "linear-gradient(135deg, #7f1d1d, #dc2626)",
  },
};

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
  const isOnline = useOnlineStatus();

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
  }, [navigate]);

  const { data: escolasOnline, isLoading, refetch } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId && isOnline, refetchInterval: isOnline ? 30000 : false, staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    if (escolasOnline && tecnicoId) cacheEscolas(tecnicoId, escolasOnline as unknown as Escola[]);
  }, [escolasOnline, tecnicoId]);

  useEffect(() => {
    if (!isOnline && tecnicoId && !escolasOnline) {
      const cached = getCachedEscolas(tecnicoId);
      if (cached) setOfflineEscolas(cached as Escola[]);
    }
  }, [isOnline, tecnicoId, escolasOnline]);

  const escolas = ((escolasOnline ?? offlineEscolas ?? []) as Escola[]);

  // Sort all escolas by nearest-neighbor route
  const sortedEscolas = sortByRoute(escolas);

  // If user location is available, re-sort starting from nearest to user
  const routeEscolas = useCallback(() => {
    if (userLat !== null && userLng !== null && sortedEscolas.length > 0) {
      const withCoords = sortedEscolas.filter(e => e.latitude && e.longitude);
      const withoutCoords = sortedEscolas.filter(e => !e.latitude || !e.longitude);
      if (withCoords.length === 0) return sortedEscolas;
      // Find nearest to user as starting point
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

  const filtered = finalSorted.filter(e =>
    !search || e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.inep.includes(search) || (e.municipio ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total = escolas.length;
  const concluidas = escolas.filter(e => e.status === "concluido").length;
  const emAndamento = escolas.filter(e => e.status === "em_andamento").length;
  const pendentes = escolas.filter(e => e.status === "pendente").length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const routeUrl = buildGoogleMapsRoute(finalSorted);
  const pendingCount = escolas.filter(e => e.status === "pendente" || e.status === "em_andamento").length;

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

  return (
    <div className="min-h-screen flex flex-col pb-24"
      style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 60%, #060b18 100%)" }}>

      {/* Banner offline */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))", borderBottom: "1px solid rgba(245,158,11,0.25)" }}>
          <WifiOff className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
          <span style={{ color: "#fbbf24" }}>Modo offline — exibindo dados salvos</span>
        </div>
      )}

      {/* Header */}
      <header className="px-4 pt-safe pt-5 pb-4 sticky top-0 z-10"
        style={{ background: "rgba(6,11,24,0.95)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Saudação */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base text-white"
                style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
                {getInitials(tecnicoNome)}
              </div>
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                  style={{ background: "#10b981", borderColor: "#060b18" }} />
              )}
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.5)" }}>{saudacao},</p>
              <p className="text-white font-bold text-base leading-tight">{tecnicoNome.split(" ")[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Localizar-me */}
            <button onClick={handleLocate}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: userLat ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.12)",
                border: `1px solid ${userLat ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.2)"}`,
              }}
              title="Usar minha localização para ordenar rota">
              {locating
                ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#818cf8" }} />
                : <LocateFixed className="w-4 h-4" style={{ color: userLat ? "#34d399" : "#818cf8" }} />
              }
            </button>
            <button onClick={() => refetch()}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <RefreshCw className="w-4 h-4" style={{ color: "#818cf8" }} />
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Total", value: total, gradient: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(99,102,241,0.3)" },
            { label: "Pendentes", value: pendentes, gradient: "linear-gradient(135deg, #f59e0b, #d97706)", glow: "rgba(245,158,11,0.3)" },
            { label: "Andamento", value: emAndamento, gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)", glow: "rgba(139,92,246,0.3)" },
            { label: "Feitas", value: concluidas, gradient: "linear-gradient(135deg, #10b981, #059669)", glow: "rgba(16,185,129,0.3)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-2.5 text-center relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="absolute inset-0 opacity-5 rounded-2xl" style={{ background: s.gradient }} />
              <p className="text-lg font-black relative" style={{ background: s.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </p>
              <p className="text-xs relative" style={{ color: "rgba(148,163,184,0.5)", fontSize: "10px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div className="mb-3 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                <span className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.7)" }}>Progresso geral</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" style={{ color: "#fbbf24" }} />
                <span className="text-sm font-black" style={{ background: "linear-gradient(90deg, #10b981, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {progresso}%
                </span>
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${progresso}%`, background: "linear-gradient(90deg, #4f46e5, #10b981, #059669)" }}>
                <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
              </div>
            </div>
          </div>
        )}

        {/* Botão Rota Completa */}
        {routeUrl && pendingCount > 0 && (
          <a href={routeUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl mb-3 font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #1d4ed8, #4f46e5)",
              boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
              color: "white",
              textDecoration: "none",
            }}>
            <Route className="w-4 h-4" />
            Abrir Rota Completa no Maps
            <span className="px-2 py-0.5 rounded-full text-xs font-black"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              {pendingCount} escolas
            </span>
          </a>
        )}

        {/* Indicador de localização ativa */}
        {userLat && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Navigation className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
            <span className="text-xs font-medium" style={{ color: "#34d399" }}>
              Rota ordenada pela sua localização atual
            </span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors"
            style={{ color: searchFocus ? "#818cf8" : "rgba(100,116,139,0.5)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            placeholder="Buscar escola, INEP ou cidade..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-white transition-all duration-200"
            style={{
              background: searchFocus ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${searchFocus ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
              boxShadow: searchFocus ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
            }}
          />
        </div>
      </header>

      {/* Lista */}
      <div className="flex-1 px-4 py-4 space-y-3">

        {/* Cabeçalho da lista com info de rota */}
        {!isLoading && filtered.length > 0 && !search && (
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2">
              <Route className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
              <span className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.6)" }}>
                Ordenado por rota otimizada
              </span>
            </div>
            <span className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
              {filtered.length} escolas
            </span>
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-3xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <Search className="w-9 h-9" style={{ color: "rgba(129,140,248,0.5)" }} />
            </div>
            <div>
              <p className="text-white font-bold text-lg">
                {search ? "Nenhuma escola encontrada" : "Nenhuma escola atribuída"}
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>
                {search ? "Tente outro termo de busca" : "Aguarde o administrador atribuir escolas"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((escola, idx) => {
            const sc = statusConfig[escola.status] ?? statusConfig.pendente;
            const StatusIcon = sc.icon;
            const whatsNum = formatWhatsApp(escola.telefoneWhatsApp || escola.telefone);
            const routeIdx = idx + 1; // número na rota

            return (
              <div key={escola.id} className="rounded-3xl overflow-hidden transition-all duration-200 active:scale-[0.99]"
                style={{ background: sc.cardBg, border: `1px solid ${sc.cardBorder}`, boxShadow: `0 4px 24px ${sc.glow}` }}>

                {/* Conteúdo principal */}
                <button onClick={() => navigate(`/tecnico/os/${escola.id}`)} className="w-full p-4 text-left">
                  <div className="flex items-start gap-3">

                    {/* Número de ordem na rota */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white relative"
                        style={{ background: sc.avatarGradient, boxShadow: `0 4px 16px ${sc.glow}` }}>
                        {!search ? (
                          <span className="text-base font-black">{routeIdx}</span>
                        ) : (
                          getInitials(escola.nome)
                        )}
                      </div>
                      {!search && escola.latitude && escola.longitude && (
                        <div className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" style={{ color: "rgba(148,163,184,0.3)" }} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Nome da escola */}
                      <p className="text-white font-bold text-sm leading-tight mb-2">{escola.nome}</p>

                      {/* INEP em destaque grande */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl mb-2"
                        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                        <span className="text-xs font-semibold" style={{ color: "rgba(129,140,248,0.7)" }}>INEP</span>
                        <span className="text-base font-black tracking-wider" style={{
                          background: "linear-gradient(90deg, #818cf8, #a78bfa)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          letterSpacing: "0.08em",
                        }}>
                          {escola.inep}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {escola.municipio && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(148,163,184,0.4)" }} />
                            <span className="text-xs" style={{ color: "rgba(148,163,184,0.55)" }}>{escola.municipio}</span>
                          </div>
                        )}
                        {escola.velocidadeOfertada && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 flex-shrink-0" style={{ color: "#fbbf24" }} />
                            <span className="text-xs font-semibold" style={{ color: "#fbbf24" }}>{escola.velocidadeOfertada} Mbps</span>
                          </div>
                        )}
                      </div>

                      {escola.endereco && (
                        <div className="flex items-start gap-1 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }} />
                          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)", wordBreak: "break-word" }}>{escola.endereco}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: sc.badgeBg, color: sc.badgeText, border: `1px solid ${sc.badgeText}22` }}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{sc.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: "rgba(148,163,184,0.2)" }} />
                    </div>
                  </div>
                </button>

                {/* Barra de ações */}
                <div className="flex" style={{ borderTop: `1px solid ${sc.cardBorder}` }}>
                  {whatsNum ? (
                    <a href={`https://wa.me/${whatsNum}`} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all"
                      style={{ color: "#25d366" }} onClick={e => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  ) : (
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(escola.nome + " " + escola.inep + " telefone")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold"
                      style={{ color: "rgba(148,163,184,0.4)" }} onClick={e => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5" />
                      Buscar tel.
                    </a>
                  )}
                  <div style={{ width: "1px", background: sc.cardBorder }} />
                  {/* Ir até esta escola */}
                  {escola.latitude && escola.longitude && (
                    <>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${escola.latitude},${escola.longitude}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all"
                        style={{ color: "#60a5fa" }} onClick={e => e.stopPropagation()}>
                        <Navigation className="w-3.5 h-3.5" />
                        Ir até
                      </a>
                      <div style={{ width: "1px", background: sc.cardBorder }} />
                    </>
                  )}
                  <button onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-all"
                    style={{ color: sc.badgeText }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                    Ver OS
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
