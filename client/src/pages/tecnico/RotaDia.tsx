import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Route, CheckCircle, Circle, Share2, MessageCircle,
  MapPin, Wifi, ChevronLeft, Search, Navigation,
  ListChecks, Trash2, ArrowUp, ArrowDown, Play, CalendarDays, Clock
} from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { dbGetCachedEscolas } from "@/hooks/useOfflineDB";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { filtrarAtividadesSemanais, organizarRotaSemanal, type FiltroRotaSemanal } from "@shared/rotaSemanal";
import { chaveTecnicoLocal, criarEscopoTecnicoLocal } from "@shared/tecnicoLocalState";

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
  dataConclusao?: Date | string | null;
  [key: string]: unknown;
};

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

const statusSemanal = {
  concluido: { label: "Concluída", color: "#6ee7b7", background: "rgba(16,185,129,0.12)", border: "rgba(52,211,153,0.25)", icon: CheckCircle },
  em_andamento: { label: "Em andamento", color: "#a5b4fc", background: "rgba(99,102,241,0.12)", border: "rgba(129,140,248,0.25)", icon: Play },
  pendente: { label: "Pendente", color: "#fcd34d", background: "rgba(245,158,11,0.12)", border: "rgba(252,211,77,0.23)", icon: Clock },
} as const;

export default function RotaDia() {
  const [, navigate] = useLocation();
  const isOnline = useOnlineStatus();
  const [tecnicoId, setTecnicoId] = useState<number | null>(null);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [sessaoLocalCarregada, setSessaoLocalCarregada] = useState(false);
  const [rotaLocalCarregada, setRotaLocalCarregada] = useState(false);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [busca, setBusca] = useState("");
  const [ordenarPorRota, setOrdenarPorRota] = useState(false);
  const [rotaConfirmada, setRotaConfirmada] = useState(false);
  const [filtroSemanal, setFiltroSemanal] = useState<FiltroRotaSemanal>("todas");

  // Carregar tecnicoId
  useEffect(() => {
    const id = localStorage.getItem("tecnico_id");
    const tenant = localStorage.getItem("tecnico_tenant_id");
    if (id) setTecnicoId(parseInt(id));
    if (tenant) setTenantId(parseInt(tenant));
    setSessaoLocalCarregada(true);
  }, []);

  const { isLoading: verificandoSessao, error: erroSessao } = trpc.tecnicoAuth.me.useQuery(
    { tecnicoId: tecnicoId ?? 0 },
    { enabled: sessaoLocalCarregada && !!tecnicoId && isOnline, retry: false, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!sessaoLocalCarregada) return;
    const sessaoInvalida = erroSessao?.data?.code === "UNAUTHORIZED" || erroSessao?.data?.code === "FORBIDDEN";
    if (tecnicoId && !sessaoInvalida) return;
    if (tecnicoId && !isOnline) return;

    ["tecnico_id", "tecnico_tenant_id", "tecnico_nome", "tecnico_email", "tecnico"].forEach(chave => localStorage.removeItem(chave));
    navigate("/tecnico/login", { replace: true });
  }, [erroSessao, isOnline, navigate, sessaoLocalCarregada, tecnicoId]);

  const rotaDiaStorageKey = useMemo(() => {
    const escopo = criarEscopoTecnicoLocal(tenantId ?? 0, tecnicoId ?? 0);
    return escopo ? chaveTecnicoLocal(escopo, "rota-dia") : null;
  }, [tecnicoId, tenantId]);

  // Carregar seleção salva do dia
  useEffect(() => {
    if (!rotaDiaStorageKey) return;
    const saved = localStorage.getItem(rotaDiaStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Só restaura se for do mesmo dia
        if (parsed.data === new Date().toDateString()) {
          setSelecionadas(parsed.ids ?? []);
          setRotaConfirmada(Boolean(parsed.confirmada));
        }
      } catch {}
    }
    setRotaLocalCarregada(true);
  }, [rotaDiaStorageKey]);

  // Salvar seleção no localStorage
  useEffect(() => {
    if (!rotaDiaStorageKey || !rotaLocalCarregada) return;
    localStorage.setItem(rotaDiaStorageKey, JSON.stringify({
      ids: selecionadas,
      data: new Date().toDateString(),
      confirmada: rotaConfirmada,
    }));
  }, [selecionadas, rotaConfirmada, rotaDiaStorageKey, rotaLocalCarregada]);

  // Query online
  const { data: minhasEscolas, isLoading: carregandoEscolas } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId: tecnicoId! },
    { enabled: !!tecnicoId && isOnline }
  );

  // Carregar escolas (online ou cache)
  useEffect(() => {
    if (minhasEscolas && minhasEscolas.length > 0) {
      setEscolas(minhasEscolas as Escola[]);
    } else if (!isOnline && tecnicoId) {
      dbGetCachedEscolas(tecnicoId).then(cached => {
        if (cached && cached.length > 0) setEscolas(cached as Escola[]);
      });
    }
  }, [minhasEscolas, isOnline, tecnicoId]);

  // Escolas filtradas por busca (apenas pendentes e em_andamento)
  const escolasFiltradas = useMemo(() => {
    const ativas = escolas.filter(e => e.status === "pendente" || e.status === "em_andamento");
    if (!busca.trim()) return ativas;
    const b = busca.toLowerCase();
    return ativas.filter(e =>
      e.nome.toLowerCase().includes(b) ||
      e.inep.includes(b) ||
      (e.municipio ?? "").toLowerCase().includes(b)
    );
  }, [escolas, busca]);

  // Escolas selecionadas para a rota, ordenadas por proximidade se solicitado
  const rotaOrdenada = useMemo(() => {
    const sel = escolas.filter(e => selecionadas.includes(e.id));
    return ordenarPorRota ? sortByRoute(sel) : sel;
  }, [escolas, selecionadas, ordenarPorRota]);

  const totalAps = useMemo(() =>
    rotaOrdenada.reduce((acc, e) => acc + (e.qtdAp ?? 0), 0),
    [rotaOrdenada]
  );

  const resumoSemanal = useMemo(() => organizarRotaSemanal(escolas), [escolas]);
  const atividadesSemanais = useMemo(
    () => filtrarAtividadesSemanais(resumoSemanal, filtroSemanal),
    [resumoSemanal, filtroSemanal],
  );

  function toggleEscola(id: number) {
    setRotaConfirmada(false);
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function moverEscola(idx: number, dir: -1 | 1) {
    const nova = [...rotaOrdenada];
    const novoIdx = idx + dir;
    if (novoIdx < 0 || novoIdx >= nova.length) return;
    [nova[idx], nova[novoIdx]] = [nova[novoIdx], nova[idx]];
    // Reordenar selecionadas conforme nova ordem
    setSelecionadas(nova.map(e => e.id));
    setRotaConfirmada(false);
  }

  function aplicarSugestaoDeRota() {
    const sugestao = sortByRoute(escolas.filter(e => selecionadas.includes(e.id)));
    setSelecionadas(sugestao.map(e => e.id));
    setOrdenarPorRota(false);
    setRotaConfirmada(false);
  }

  function limparRota() {
    setSelecionadas([]);
    setRotaConfirmada(false);
  }

  function compartilharWhatsApp() {
    if (rotaOrdenada.length === 0) return;
    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    const linhas = rotaOrdenada.map((e, i) => {
      const ap = e.qtdAp ? ` | ${e.qtdAp} AP${e.qtdAp > 1 ? "s" : ""}` : "";
      const end = e.endereco ? `\n   📍 ${e.endereco}${e.municipio ? `, ${e.municipio}` : ""}` : "";
      const maps = e.latitude && e.longitude
        ? `\n   🗺 https://maps.google.com/?q=${e.latitude},${e.longitude}`
        : "";
      const inep = e.inep ? `\n   🏫 INEP: ${e.inep}` : "";
      return `${i + 1}. *${e.nome}*${ap}${inep}${end}${maps}`;
    });
    const msg = `📋 *Rota do Dia — ${hoje}*\n\n${linhas.join("\n\n")}\n\n✅ Total: ${rotaOrdenada.length} escola${rotaOrdenada.length > 1 ? "s" : ""} | ${totalAps} AP${totalAps !== 1 ? "s" : ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  const statusColor: Record<string, string> = {
    pendente: "#f59e0b",
    em_andamento: "#3b82f6",
    concluido: "#10b981",
  };

  if (!sessaoLocalCarregada || (isOnline && !!tecnicoId && verificandoSessao)) {
    return <div className="grid min-h-screen place-items-center" style={{ background: "#040a16", color: "rgba(148,163,184,0.72)", fontSize: 13 }}>Validando acesso seguro...</div>;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#040a16 0%,#0a1628 50%,#040a16 100%)", paddingBottom: "90px" }}>
      {/* Header */}
      <div style={{ background: "rgba(4,10,22,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 16px 12px" }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/tecnico")} style={{ color: "rgba(148,163,184,0.7)", padding: "4px" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Route className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 style={{ color: "#f1f5f9", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Rota do Dia</h1>
              <p style={{ color: "rgba(148,163,184,0.6)", fontSize: 11 }}>
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            </div>
          </div>
          {selecionadas.length > 0 && (
            <button onClick={limparRota} style={{ color: "#ef4444", fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <Trash2 className="w-3.5 h-3.5 inline mr-1" />
              Limpar
            </button>
          )}
        </div>

        {/* Busca */}
        <div style={{ position: "relative" }}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(148,163,184,0.4)" }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar escola..."
            style={{
              width: "100%", padding: "8px 12px 8px 36px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#f1f5f9", fontSize: 13, outline: "none"
            }}
          />
        </div>
      </div>

      {/* Visão semanal de execução */}
      <div style={{ margin: "12px 16px 0", background: "linear-gradient(135deg,rgba(16,185,129,0.13),rgba(6,78,59,0.16))", border: "1px solid rgba(52,211,153,0.22)", borderRadius: 12, padding: "12px 14px" }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: "#6ee7b7" }} />
            <div><p style={{ color: "#d1fae5", fontSize: 13, fontWeight: 700 }}>Plano da semana</p><p style={{ color: "rgba(167,243,208,0.62)", fontSize: 10 }}>{resumoSemanal.inicioSemana.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — {resumoSemanal.fimSemana.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p></div>
          </div>
          <span style={{ color: "#6ee7b7", fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.12)", borderRadius: 999, padding: "4px 8px" }}>Dados reais</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Concluídas", value: resumoSemanal.concluidas.length, color: "#6ee7b7" },
            { label: "Em aberto", value: resumoSemanal.pendentes.length + resumoSemanal.emAndamento.length, color: "#fcd34d" },
            { label: "APs feitos", value: resumoSemanal.apsConcluidos, color: "#a5b4fc" },
          ].map(item => <div key={item.label} style={{ background: "rgba(255,255,255,0.045)", borderRadius: 9, padding: "9px 7px", textAlign: "center" }}><p style={{ color: item.color, fontSize: 18, fontWeight: 800 }}>{item.value}</p><p style={{ color: "rgba(148,163,184,0.62)", fontSize: 9, fontWeight: 600, marginTop: 2 }}>{item.label}</p></div>)}
        </div>

        <div style={{ marginTop: 12, padding: "9px", borderRadius: 10, background: "rgba(2,6,23,0.2)", border: "1px solid rgba(167,243,208,0.1)" }}>
          <div className="flex items-center justify-between mb-2"><span style={{ color: "rgba(209,250,229,0.76)", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" }}>EXECUÇÃO DIÁRIA</span><span style={{ color: "rgba(167,243,208,0.5)", fontSize: 9 }}>Concluídas no período</span></div>
          <div className="grid grid-cols-7 gap-1.5">
            {resumoSemanal.dias.map(dia => <div key={dia.data.toISOString()} style={{ minWidth: 0, borderRadius: 8, padding: "6px 2px", textAlign: "center", background: dia.hoje ? "rgba(110,231,183,0.14)" : dia.concluidas > 0 ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)", border: dia.hoje ? "1px solid rgba(110,231,183,0.28)" : "1px solid transparent" }}><p style={{ color: dia.hoje ? "#a7f3d0" : "rgba(167,243,208,0.48)", fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>{dia.dia}</p><p style={{ color: dia.hoje ? "#f0fdf4" : "rgba(226,232,240,0.78)", fontSize: 11, fontWeight: 800, marginTop: 2 }}>{dia.numero}</p><span style={{ display: "inline-grid", placeItems: "center", minWidth: 14, height: 14, marginTop: 3, borderRadius: 999, padding: "0 3px", background: dia.concluidas > 0 ? "rgba(52,211,153,0.19)" : "rgba(148,163,184,0.08)", color: dia.concluidas > 0 ? "#6ee7b7" : "rgba(148,163,184,0.5)", fontSize: 8, fontWeight: 800 }}>{dia.concluidas}</span></div>)}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 12, paddingBottom: 2 }} aria-label="Filtrar atividades da semana">
          {[
            { value: "todas", label: "Todas", total: resumoSemanal.atividades.length },
            { value: "concluido", label: "Concluídas", total: resumoSemanal.concluidas.length },
            { value: "em_andamento", label: "Em andamento", total: resumoSemanal.emAndamento.length },
            { value: "pendente", label: "Pendentes", total: resumoSemanal.pendentes.length },
          ].map(opcao => {
            const ativo = filtroSemanal === opcao.value;
            return <button
              key={opcao.value}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltroSemanal(opcao.value as FiltroRotaSemanal)}
              style={{ whiteSpace: "nowrap", flexShrink: 0, borderRadius: 999, padding: "6px 9px", fontSize: 10, fontWeight: 700, color: ativo ? "#04130d" : "rgba(209,250,229,0.72)", background: ativo ? "#6ee7b7" : "rgba(255,255,255,0.055)", border: ativo ? "1px solid #6ee7b7" : "1px solid rgba(167,243,208,0.14)" }}>
              {opcao.label} · {opcao.total}
            </button>;
          })}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 7 }} aria-live="polite">
          {carregandoEscolas ? (
            [0, 1].map(item => <div key={item} style={{ height: 54, borderRadius: 9, background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />)
          ) : atividadesSemanais.length === 0 ? (
            <div style={{ borderRadius: 9, padding: "11px", textAlign: "center", color: "rgba(167,243,208,0.6)", fontSize: 11, background: "rgba(255,255,255,0.035)" }}>
              Não há atividades com este status nesta semana.
            </div>
          ) : atividadesSemanais.map(atividade => {
            const detalhe = statusSemanal[atividade.status as keyof typeof statusSemanal];
            if (!detalhe) return null;
            const Icon = detalhe.icon;
            return <button
              type="button"
              key={atividade.id}
              onClick={() => navigate(`/tecnico/os/${atividade.id}`)}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, background: "rgba(255,255,255,0.035)", border: `1px solid ${detalhe.border}` }}>
              <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, display: "grid", placeItems: "center", background: detalhe.background }}><Icon className="w-3.5 h-3.5" style={{ color: detalhe.color }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", color: "#f1f5f9", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{atividade.nome}</span><span style={{ display: "block", marginTop: 2, color: "rgba(167,243,208,0.54)", fontSize: 10 }}>{atividade.municipio ?? "Local não informado"}{atividade.qtdAp ? ` · ${atividade.qtdAp} AP${atividade.qtdAp > 1 ? "s" : ""}` : ""}</span></span>
              <span style={{ color: detalhe.color, fontSize: 9, fontWeight: 700 }}>{detalhe.label}</span>
            </button>;
          })}
        </div>
      </div>

      {/* Resumo da rota selecionada */}
      {selecionadas.length > 0 && (
        <div style={{ margin: "12px 16px 0", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "12px 14px" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" style={{ color: "#818cf8" }} />
              <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 700 }}>
                {selecionadas.length} escola{selecionadas.length > 1 ? "s" : ""} selecionada{selecionadas.length > 1 ? "s" : ""}
              </span>
            </div>
            <span style={{ color: "rgba(148,163,184,0.7)", fontSize: 12 }}>
              {totalAps} AP{totalAps !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Botão Iniciar Rota */}
          <button
            onClick={() => {
              if (rotaOrdenada.length > 0) {
                if (!rotaConfirmada) {
                  window.alert("Revise e confirme a sequência da rota antes de iniciar. Você pode aceitar a sugestão ou reorganizar manualmente.");
                  return;
                }
                navigate(`/tecnico/os/${rotaOrdenada[0].id}`);
              }
            }}
            style={{
              width: "100%", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
              marginBottom: 8
            }}>
            <Play className="w-4 h-4" />
            {rotaConfirmada ? "Iniciar rota confirmada" : `Confirmar sequência (${rotaOrdenada.length})`}
          </button>

          {!rotaConfirmada && (
            <button
              onClick={() => setRotaConfirmada(true)}
              style={{
                width: "100%", padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)", color: "#6ee7b7",
                marginBottom: 8
              }}>
              Confirmar sequência revisada
            </button>
          )}
          {rotaConfirmada && <p style={{ color: "#6ee7b7", fontSize: 11, textAlign: "center", marginBottom: 8 }}>Sequência confirmada por você. Alterações exigem nova confirmação.</p>}

          <div className="flex gap-2">
            {/* Ordenar por rota */}
            <button
              onClick={() => ordenarPorRota ? aplicarSugestaoDeRota() : setOrdenarPorRota(true)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: ordenarPorRota ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${ordenarPorRota ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: ordenarPorRota ? "#22d3ee" : "rgba(148,163,184,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4
              }}>
              <Navigation className="w-3.5 h-3.5" />
              {ordenarPorRota ? "Aplicar sugestão GPS" : "Ver sugestão GPS"}
            </button>

            {/* Compartilhar WhatsApp */}
            <button
              onClick={compartilharWhatsApp}
              style={{
                flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                border: "none", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                boxShadow: "0 4px 16px rgba(34,197,94,0.3)"
              }}>
              <MessageCircle className="w-3.5 h-3.5" />
              Compartilhar
            </button>
          </div>
        </div>
      )}

      {/* Lista de escolas selecionadas (rota ordenada) */}
      {rotaOrdenada.length > 0 && (
        <div style={{ margin: "12px 16px 0" }}>
          <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Ordem da rota
          </p>
          {rotaOrdenada.map((escola, idx) => (
            <div key={escola.id} style={{
              background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: 10, padding: "10px 12px", marginBottom: 6,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 800, minWidth: 20, textAlign: "center" }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{escola.nome}</p>
                <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 11 }}>{escola.municipio ?? ""}{escola.qtdAp ? ` · ${escola.qtdAp} APs` : ""}</p>
              </div>
              {!ordenarPorRota && (
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moverEscola(idx, -1)} disabled={idx === 0} style={{ color: idx === 0 ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.6)", padding: 2 }}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moverEscola(idx, 1)} disabled={idx === rotaOrdenada.length - 1} style={{ color: idx === rotaOrdenada.length - 1 ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.6)", padding: 2 }}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button onClick={() => toggleEscola(escola.id)} style={{ color: "#ef4444", padding: 4 }}>
                <Circle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lista de escolas disponíveis */}
      <div style={{ margin: "16px 16px 0" }}>
        <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          {busca ? `Resultados (${escolasFiltradas.length})` : `Escolas disponíveis (${escolasFiltradas.length})`}
        </p>

        {escolasFiltradas.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(148,163,184,0.4)" }}>
            <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p style={{ fontSize: 14 }}>Nenhuma escola encontrada</p>
          </div>
        )}

        {escolasFiltradas.map(escola => {
          const isSelecionada = selecionadas.includes(escola.id);
          const cor = statusColor[escola.status] ?? "#94a3b8";
          return (
            <div
              key={escola.id}
              style={{
                background: isSelecionada ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isSelecionada ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                display: "flex", alignItems: "flex-start", gap: 12,
                transition: "all 0.15s ease"
              }}>
              {/* Checkbox */}
              <button
                onClick={() => toggleEscola(escola.id)}
                style={{ flexShrink: 0, marginTop: 2, padding: 0, background: "none", border: "none" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: isSelecionada ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${isSelecionada ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {isSelecionada && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>

              {/* Info — clicar abre OS */}
              <button
                onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0 }}>
                <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 700, marginBottom: 3, lineHeight: 1.3 }}>
                  {escola.nome}
                </p>
                {escola.inep && (
                  <p style={{ color: "rgba(148,163,184,0.5)", fontSize: 11, marginBottom: 2 }}>INEP: {escola.inep}</p>
                )}
                {(escola.endereco || escola.municipio) && (
                  <p style={{ color: "rgba(148,163,184,0.6)", fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
                    <MapPin className="w-3 h-3 inline mr-0.5" style={{ verticalAlign: "middle" }} />
                    {[escola.endereco, escola.municipio].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {escola.qtdAp && (
                    <span style={{ color: "#818cf8", fontSize: 11, fontWeight: 600 }}>
                      <Wifi className="w-3 h-3 inline mr-0.5" />{escola.qtdAp} AP{escola.qtdAp > 1 ? "s" : ""}
                    </span>
                  )}
                  <span style={{ color: cor, fontSize: 11, fontWeight: 600 }}>
                    {escola.status === "em_andamento" ? "Em andamento" : escola.status === "pendente" ? "Pendente" : escola.status}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Botão flutuante de compartilhar (quando há seleção) */}
      {selecionadas.length > 0 && (
        <div style={{ position: "fixed", bottom: 90, right: 16, zIndex: 100 }}>
          <button
            onClick={compartilharWhatsApp}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg,#16a34a,#22c55e)",
              border: "none", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(34,197,94,0.4)",
              fontSize: 22
            }}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      )}

      <TecnicoBottomNav />
    </div>
  );
}
