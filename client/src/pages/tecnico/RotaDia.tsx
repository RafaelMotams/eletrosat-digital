import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Route, CheckCircle, Circle, Share2, MessageCircle,
  MapPin, Wifi, ChevronLeft, Search, Navigation,
  ListChecks, Trash2, ArrowUp, ArrowDown
} from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { dbGetCachedEscolas } from "@/hooks/useOfflineDB";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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

const ROTA_DIA_KEY = "tecnico_rota_dia";

export default function RotaDia() {
  const [, navigate] = useLocation();
  const isOnline = useOnlineStatus();
  const [tecnicoId, setTecnicoId] = useState<number | null>(null);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [busca, setBusca] = useState("");
  const [ordenarPorRota, setOrdenarPorRota] = useState(false);

  // Carregar tecnicoId
  useEffect(() => {
    const id = localStorage.getItem("tecnico_id");
    if (id) setTecnicoId(parseInt(id));
  }, []);

  // Carregar seleção salva do dia
  useEffect(() => {
    const saved = localStorage.getItem(ROTA_DIA_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Só restaura se for do mesmo dia
        if (parsed.data === new Date().toDateString()) {
          setSelecionadas(parsed.ids ?? []);
        }
      } catch {}
    }
  }, []);

  // Salvar seleção no localStorage
  useEffect(() => {
    localStorage.setItem(ROTA_DIA_KEY, JSON.stringify({
      ids: selecionadas,
      data: new Date().toDateString()
    }));
  }, [selecionadas]);

  // Query online
  const { data: minhasEscolas } = trpc.tecnicoAuth.minhasEscolas.useQuery(
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

  function toggleEscola(id: number) {
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
  }

  function limparRota() {
    setSelecionadas([]);
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
      return `${i + 1}. *${e.nome}*${ap}${end}${maps}`;
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

          <div className="flex gap-2">
            {/* Ordenar por rota */}
            <button
              onClick={() => setOrdenarPorRota(v => !v)}
              style={{
                flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: ordenarPorRota ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${ordenarPorRota ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: ordenarPorRota ? "#22d3ee" : "rgba(148,163,184,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4
              }}>
              <Navigation className="w-3.5 h-3.5" />
              {ordenarPorRota ? "Rota otimizada" : "Otimizar rota"}
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
            <button
              key={escola.id}
              onClick={() => toggleEscola(escola.id)}
              style={{
                width: "100%", textAlign: "left",
                background: isSelecionada ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isSelecionada ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 12, padding: "12px 14px", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s ease"
              }}>
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: isSelecionada ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.05)",
                border: `2px solid ${isSelecionada ? "#6366f1" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {isSelecionada && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <p style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {escola.nome}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: "rgba(148,163,184,0.5)", fontSize: 11 }}>{escola.inep}</span>
                  {escola.municipio && (
                    <span style={{ color: "rgba(148,163,184,0.4)", fontSize: 11 }}>
                      <MapPin className="w-3 h-3 inline mr-0.5" />{escola.municipio}
                    </span>
                  )}
                  {escola.qtdAp && (
                    <span style={{ color: "#818cf8", fontSize: 11, fontWeight: 600 }}>
                      <Wifi className="w-3 h-3 inline mr-0.5" />{escola.qtdAp} AP{escola.qtdAp > 1 ? "s" : ""}
                    </span>
                  )}
                  <span style={{ color: cor, fontSize: 11, fontWeight: 600 }}>
                    {escola.status === "em_andamento" ? "Em andamento" : escola.status === "pendente" ? "Pendente" : escola.status}
                  </span>
                </div>
              </div>
            </button>
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
