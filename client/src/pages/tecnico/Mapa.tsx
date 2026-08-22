import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import {
  MapPin, Navigation, CheckCircle, Clock, AlertCircle,
  ExternalLink, ArrowLeft, Phone, X, Building2
} from "lucide-react";
import { MapView } from "@/components/Map";

type Escola = {
  id: number;
  nome: string;
  inep: string;
  municipio?: string | null;
  endereco?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  status: string;
  qtdAp?: number | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
  [key: string]: unknown;
};

function getStatusColor(status: string) {
  if (status === "concluido") return "#10b981";
  if (status === "em_andamento") return "#f59e0b";
  return "#3b82f6";
}

function getStatusLabel(status: string) {
  if (status === "concluido") return "Concluído";
  if (status === "em_andamento") return "Em andamento";
  return "Pendente";
}

/** Formata número para WhatsApp: sempre 5575 + 8 ou 9 dígitos locais */
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

export default function TecnicoMapa() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const { data: escolas = [] } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    {
      enabled: !!tecnicoId,
      refetchInterval: 2 * 60 * 1000, // 2 minutos
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
      retry: 1,
    }
  );

  const escolasComCoordenadas = useMemo(
    () => escolas.filter((e: Escola) => e.latitude && e.longitude),
    [escolas]
  );

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);

    if (escolasComCoordenadas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    infoWindowRef.current = new google.maps.InfoWindow();

    escolasComCoordenadas.forEach((escola: Escola) => {
      const lat = parseFloat(escola.latitude!);
      const lng = parseFloat(escola.longitude!);
      const pos = { lat, lng };
      bounds.extend(pos);

      const marker = new google.maps.Marker({
        position: pos,
        map,
        title: escola.nome,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: getStatusColor(escola.status),
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2.5,
        },
      });

      markersRef.current.set(escola.id, marker);

      marker.addListener("click", () => {
        setSelectedEscola(escola);
        // Fecha info window anterior e abre nova com dados completos
        if (infoWindowRef.current) {
          const whatsNum = formatWhatsApp(escola.telefoneWhatsApp || escola.telefone);
          const whatsBtn = whatsNum
            ? `<a href="https://wa.me/${whatsNum}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:4px 10px;background:#25d366;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">📱 WhatsApp</a>`
            : `<a href="https://www.google.com/search?q=${encodeURIComponent(escola.nome + ' ' + escola.inep + ' telefone')}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:4px 10px;background:#4285f4;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">🔍 Buscar telefone</a>`;

          infoWindowRef.current.setContent(`
            <div style="font-family: -apple-system, sans-serif; padding: 10px; min-width: 220px; max-width: 280px;">
              <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 6px; line-height: 1.3;">${escola.nome}</div>
              <div style="display:flex;flex-direction:column;gap:3px;">
                <div style="font-size: 11px; color: #475569;"><strong>INEP:</strong> ${escola.inep}</div>
                ${escola.municipio ? `<div style="font-size: 11px; color: #475569;"><strong>Cidade:</strong> ${escola.municipio}</div>` : ""}
                ${escola.endereco ? `<div style="font-size: 11px; color: #475569;"><strong>Endereço:</strong> ${escola.endereco}</div>` : ""}
                <div style="font-size: 11px; color: #475569;"><strong>APs:</strong> ${escola.qtdAp || 1}</div>
              </div>
              <div style="margin-top:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:${getStatusColor(escola.status)}22;color:${getStatusColor(escola.status)};">
                  ${getStatusLabel(escola.status)}
                </span>
                ${whatsBtn}
              </div>
              <div style="margin-top:8px;display:flex;gap:6px;">
                <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving" target="_blank"
                  style="flex:1;text-align:center;padding:6px;background:#1d4ed8;color:#fff;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;">
                  🧭 Navegar
                </a>
              </div>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });
    });

    map.fitBounds(bounds);
  };

  // Quando escola é selecionada na lista, centraliza o mapa nela
  const focusEscola = (escola: Escola) => {
    setSelectedEscola(escola);
    if (mapRef.current && escola.latitude && escola.longitude) {
      mapRef.current.panTo({ lat: parseFloat(escola.latitude), lng: parseFloat(escola.longitude) });
      mapRef.current.setZoom(15);
      const marker = markersRef.current.get(escola.id);
      if (marker) google.maps.event.trigger(marker, "click");
    }
  };

  /** Algoritmo nearest-neighbor: ordena escolas por proximidade geográfica */
  function sortByProximity(schools: Escola[]): Escola[] {
    if (schools.length <= 1) return schools;
    const result: Escola[] = [];
    const remaining = [...schools];
    // Começa pela primeira escola (ou pela mais ao norte)
    let current = remaining.splice(0, 1)[0];
    result.push(current);
    while (remaining.length > 0) {
      const curLat = parseFloat(current.latitude!);
      const curLng = parseFloat(current.longitude!);
      let minDist = Infinity;
      let minIdx = 0;
      remaining.forEach((e, i) => {
        const dLat = parseFloat(e.latitude!) - curLat;
        const dLng = parseFloat(e.longitude!) - curLng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < minDist) { minDist = dist; minIdx = i; }
      });
      current = remaining.splice(minIdx, 1)[0];
      result.push(current);
    }
    return result;
  }


  const stats = {
    total: escolas.length,
    concluidas: escolas.filter((e: Escola) => e.status === "concluido").length,
    pendentes: escolas.filter((e: Escola) => e.status !== "concluido").length,
  };

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#0a0f1e" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 sticky top-0 z-10"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/tecnico")} className="p-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <h1 className="text-white font-bold text-base">Mapa de Escolas</h1>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>
            {escolasComCoordenadas.length} escolas no mapa
          </p>
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Stats */}
      <div className="flex gap-2 px-4 py-2">
        {[
          { label: "Total", value: stats.total, color: "#06b6d4", icon: MapPin },
          { label: "Pendentes", value: stats.pendentes, color: "#f59e0b", icon: Clock },
          { label: "Concluídas", value: stats.concluidas, color: "#10b981", icon: CheckCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex-1 rounded-xl p-2.5 flex items-center gap-2"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <div>
              <div className="text-white font-bold text-sm leading-none">{value}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 px-4 pb-2">
        {[
          { color: "#06b6d4", label: "Pendente" },
          { color: "#f59e0b", label: "Em andamento" },
          { color: "#10b981", label: "Concluído" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-xs" style={{ color: "rgba(148,163,184,0.7)" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="relative mx-4 mb-2 rounded-2xl overflow-hidden"
        style={{ height: "340px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <MapView onMapReady={handleMapReady} />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,15,30,0.85)" }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-white">Carregando mapa...</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel da escola selecionada */}
      {selectedEscola && (
        <div className="mx-4 mb-3 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-white font-bold text-sm leading-tight">{selectedEscola.nome}</h3>
              <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                INEP: <span className="font-mono">{selectedEscola.inep}</span>
              </p>
              {selectedEscola.municipio && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                  <Building2 className="w-3 h-3" /> {selectedEscola.municipio}
                </p>
              )}
              {selectedEscola.endereco && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                  <MapPin className="w-3 h-3" /> {selectedEscola.endereco}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{
                  background: `${getStatusColor(selectedEscola.status)}20`,
                  color: getStatusColor(selectedEscola.status)
                }}>
                {getStatusLabel(selectedEscola.status)}
              </span>
              <button onClick={() => setSelectedEscola(null)}
                className="p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
                <X className="w-3.5 h-3.5 text-white opacity-60" />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Navegar */}
            {selectedEscola.latitude && selectedEscola.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEscola.latitude},${selectedEscola.longitude}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs text-white"
                style={{ background: "linear-gradient(135deg, #0f766e, #06b6d4)" }}
              >
                <Navigation className="w-3.5 h-3.5" />
                Navegar
              </a>
            )}

            {/* WhatsApp ou busca */}
            {(() => {
              const num = formatWhatsApp(selectedEscola.telefoneWhatsApp as string || selectedEscola.telefone as string);
              if (num) {
                return (
                  <a
                    href={`https://wa.me/${num}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs text-white"
                    style={{ background: "linear-gradient(135deg, #128c7e, #25d366)" }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                );
              }
              return (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(selectedEscola.nome + " " + selectedEscola.inep + " telefone")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Buscar tel.
                </a>
              );
            })()}

            {/* Ver OS */}
            <button
              onClick={() => navigate(`/tecnico/os/${selectedEscola.id}`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs text-white"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver OS
            </button>
          </div>
        </div>
      )}

      {/* Lista de escolas */}
      <div className="px-4 mb-2">
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider"
          style={{ color: "rgba(148,163,184,0.5)" }}>
          Todas as escolas ({escolas.length})
        </h3>
        <div className="space-y-2">
          {escolas.map((escola: Escola) => (
            <button
              key={escola.id}
              onClick={() => focusEscola(escola)}
              className="w-full flex items-start gap-3 py-3 px-3 rounded-xl text-left transition-all"
              style={{
                background: selectedEscola?.id === escola.id ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedEscola?.id === escola.id ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: getStatusColor(escola.status) }} />
              <div className="flex-1">
                {/* Nome completo — sem truncar */}
                <p className="text-white text-xs font-bold leading-snug">{escola.nome}</p>
                {/* INEP em destaque */}
                <p className="text-xs font-mono mt-0.5" style={{ color: "#3b82f6" }}>
                  INEP: {escola.inep}
                </p>
                {/* Cidade */}
                {escola.municipio && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                    📍 {escola.municipio}
                  </p>
                )}
                {/* Endereço completo — sem truncar */}
                {escola.endereco && (
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: "rgba(148,163,184,0.5)" }}>
                    {escola.endereco}
                  </p>
                )}
                {!escola.latitude && (
                  <p className="text-xs mt-0.5" style={{ color: "rgba(239,68,68,0.6)" }}>Sem GPS</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs font-bold" style={{ color: getStatusColor(escola.status) }}>
                  {escola.qtdAp || 1} AP
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{
                  background: `${getStatusColor(escola.status)}20`,
                  color: getStatusColor(escola.status),
                  fontSize: "9px",
                  fontWeight: 600,
                }}>
                  {getStatusLabel(escola.status)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
