import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { MapPin, Navigation, Route, CheckCircle, Clock, AlertCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { MapView } from "@/components/Map";

type Escola = {
  id: number;
  nome: string;
  inep: string;
  endereco: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string;
  qtdAp: number | null;
  telefoneWhatsApp: string | null;
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

export default function TecnicoMapa() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { data: escolas = [] } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId, refetchInterval: 30000 }
  );

  const escolasComCoordenadas = useMemo(
    () => escolas.filter((e: Escola) => e.latitude && e.longitude),
    [escolas]
  );

  const handleMapReady = (map: google.maps.Map) => {
    setMapInstance(map);
    setMapReady(true);

    if (escolasComCoordenadas.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

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
          scale: 10,
          fillColor: getStatusColor(escola.status),
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 8px; min-width: 180px;">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px;">${escola.nome}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">INEP: ${escola.inep}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${escola.qtdAp || 1} AP(s)</div>
            <div style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; background: ${getStatusColor(escola.status)}22; color: ${getStatusColor(escola.status)};">
              ${getStatusLabel(escola.status)}
            </div>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
        setSelectedEscola(escola);
      });
    });

    map.fitBounds(bounds);
  };

  const openRoute = () => {
    const pendentes = escolasComCoordenadas.filter((e: Escola) => e.status !== "concluido");
    if (pendentes.length === 0) return;
    const waypoints = pendentes.slice(1, -1).map((e: Escola) =>
      `${e.latitude},${e.longitude}`
    ).join("|");
    const origin = `${pendentes[0].latitude},${pendentes[0].longitude}`;
    const dest = `${pendentes[pendentes.length - 1].latitude},${pendentes[pendentes.length - 1].longitude}`;
    const url = waypoints
      ? `https://www.google.com/maps/dir/${origin}/${waypoints}/${dest}`
      : `https://www.google.com/maps/dir/${origin}/${dest}`;
    window.open(url, "_blank");
  };

  const stats = {
    total: escolas.length,
    concluidas: escolas.filter((e: Escola) => e.status === "concluido").length,
    pendentes: escolas.filter((e: Escola) => e.status === "pendente").length,
    emAndamento: escolas.filter((e: Escola) => e.status === "em_andamento").length,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0f1e" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3"
        style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(20px)" }}>
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
        <button
          onClick={openRoute}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs text-white"
          style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
        >
          <Route className="w-4 h-4" />
          Rota
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 px-4 py-2">
        {[
          { label: "Total", value: stats.total, color: "#3b82f6", icon: MapPin },
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
      <div className="flex gap-3 px-4 pb-2">
        {[
          { color: "#3b82f6", label: "Pendente" },
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
      <div className="flex-1 relative mx-4 mb-2 rounded-2xl overflow-hidden"
        style={{ minHeight: "340px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <MapView onMapReady={handleMapReady} />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,15,30,0.8)" }}>
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-white">Carregando mapa...</p>
            </div>
          </div>
        )}
      </div>

      {/* Escola selecionada */}
      {selectedEscola && (
        <div className="mx-4 mb-2 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm truncate">{selectedEscola.nome}</h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.7)" }}>INEP: {selectedEscola.inep}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-semibold ml-2 flex-shrink-0"
              style={{
                background: `${getStatusColor(selectedEscola.status)}20`,
                color: getStatusColor(selectedEscola.status)
              }}>
              {getStatusLabel(selectedEscola.status)}
            </span>
          </div>
          <div className="flex gap-2 mt-3">
            {selectedEscola.latitude && selectedEscola.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedEscola.latitude},${selectedEscola.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs text-white"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)" }}
              >
                <Navigation className="w-4 h-4" />
                Navegar
              </a>
            )}
            <button
              onClick={() => navigate(`/tecnico/os/${selectedEscola.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs text-white"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
            >
              <ExternalLink className="w-4 h-4" />
              Ver OS
            </button>
          </div>
        </div>
      )}

      {/* Lista rápida */}
      <div className="px-4 mb-20">
        <h3 className="text-xs font-semibold mb-2" style={{ color: "rgba(148,163,184,0.6)" }}>
          ESCOLAS SEM COORDENADAS ({escolas.length - escolasComCoordenadas.length})
        </h3>
        {escolas.filter((e: Escola) => !e.latitude || !e.longitude).map((escola: Escola) => (
          <div key={escola.id} className="flex items-center gap-3 py-2.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#f59e0b" }} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{escola.nome}</p>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Sem GPS</p>
            </div>
            <button onClick={() => navigate(`/tecnico/os/${escola.id}`)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.8)" }}>
              Ver
            </button>
          </div>
        ))}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
