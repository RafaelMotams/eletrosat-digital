export type Coords = {
  latitude?: string | null;
  longitude?: string | null;
};

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversine(a: Coords, b: Coords): number {
  const R = 6371;
  const lat1 = parseFloat(a.latitude ?? "0");
  const lat2 = parseFloat(b.latitude ?? "0");
  const lng1 = parseFloat(a.longitude ?? "0");
  const lng2 = parseFloat(b.longitude ?? "0");
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

/**
 * Ordena por rota otimizada (vizinho mais próximo / nearest-neighbor TSP)
 * usando as coordenadas GPS. Itens sem coordenadas vão para o fim da lista.
 */
export function sortByRoute<T extends Coords>(list: T[]): T[] {
  if (!list || list.length === 0) return [];
  const withCoords = list.filter(e => e.latitude && e.longitude);
  const withoutCoords = list.filter(e => !e.latitude || !e.longitude);
  if (withCoords.length === 0) return list;
  const sorted: T[] = [];
  const remaining = [...withCoords];
  let current = remaining.splice(0, 1)[0];
  sorted.push(current);
  while (remaining.length > 0) {
    let ni = 0,
      nd = haversine(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < nd) {
        nd = d;
        ni = i;
      }
    }
    current = remaining.splice(ni, 1)[0];
    sorted.push(current);
  }
  return [...sorted, ...withoutCoords];
}
