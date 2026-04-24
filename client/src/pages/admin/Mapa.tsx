import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { School, MapPin } from "lucide-react";

const statusColors: Record<string, string> = {
  pendente: "#f59e0b",
  em_andamento: "#3b82f6",
  concluido: "#22c55e",
};
const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};

export default function AdminMapa() {
  const { data: escolas } = trpc.escolas.list.useQuery({});
  type EscolaItem = NonNullable<typeof escolas>[0];
  const [selectedEscola, setSelectedEscola] = useState<EscolaItem | null>(null);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      if (!escolas || escolas.length === 0) return;

      const bounds = new google.maps.LatLngBounds();
      let hasCoords = false;

      escolas.forEach((escola) => {
        const lat = parseFloat(String(escola.latitude ?? ""));
        const lng = parseFloat(String(escola.longitude ?? ""));
        if (isNaN(lat) || isNaN(lng)) return;

        hasCoords = true;
        bounds.extend({ lat, lng });

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: escola.nome,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: statusColors[escola.status] ?? "#6b7280",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: Inter, sans-serif; padding: 4px; max-width: 220px;">
              <p style="font-weight: 700; font-size: 13px; margin: 0 0 4px;">${escola.nome}</p>
              <p style="font-size: 11px; color: #6b7280; margin: 0 0 2px;">INEP: ${escola.inep}</p>
              <p style="font-size: 11px; color: #6b7280; margin: 0 0 4px;">${escola.endereco ?? ""}</p>
              <span style="display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: ${statusColors[escola.status]}22; color: ${statusColors[escola.status]}; border: 1px solid ${statusColors[escola.status]}44;">
                ${statusLabel[escola.status]}
              </span>
              <p style="font-size: 11px; margin: 4px 0 0; color: #374151;">${escola.qtdAp} AP(s) — ${escola.tipoConexao}</p>
              <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: none; display: block; margin-top: 6px;">📍 Abrir no Google Maps</a>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
          setSelectedEscola(escola as typeof selectedEscola);
        });
      });

      if (hasCoords) {
        map.fitBounds(bounds);
        if (escolas.length === 1) map.setZoom(14);
      } else {
        map.setCenter({ lat: -10.44, lng: -39.57 });
        map.setZoom(10);
      }
    },
    [escolas]
  );

  const stats = {
    total: escolas?.length ?? 0,
    pendentes: escolas?.filter(e => e.status === "pendente").length ?? 0,
    emAndamento: escolas?.filter(e => e.status === "em_andamento").length ?? 0,
    concluidas: escolas?.filter(e => e.status === "concluido").length ?? 0,
  };

  return (
    <AdminLayout title="Mapa de Escolas">
      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { status: "pendente", count: stats.pendentes },
          { status: "em_andamento", count: stats.emAndamento },
          { status: "concluido", count: stats.concluidas },
        ].map(({ status, count }) => (
          <div key={status} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[status] }} />
            <span className="text-sm text-muted-foreground">{statusLabel[status]}</span>
            <Badge variant="outline" className={`text-xs border ${statusClass[status]}`}>{count}</Badge>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total: {stats.total} escolas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Mapa */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden border bg-card" style={{ height: "520px" }}>
          <MapView onMapReady={handleMapReady} className="w-full h-full" />
        </div>

        {/* Lista lateral */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-sm font-medium flex items-center gap-2">
                <School className="w-4 h-4 text-primary" />
                Escolas ({stats.total})
              </p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "460px" }}>
              {escolas?.map((escola) => (
                <div
                  key={escola.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/40 transition-colors ${selectedEscola && (selectedEscola as typeof escola).id === escola.id ? "bg-primary/5" : ""}`}
                  onClick={() => setSelectedEscola(escola as typeof selectedEscola)}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: statusColors[escola.status] }} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{escola.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{escola.municipio}</p>
                      <p className="text-xs text-muted-foreground">{escola.qtdAp} AP(s)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
