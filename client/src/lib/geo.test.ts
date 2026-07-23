import { describe, it, expect } from "vitest";
import { haversine, sortByRoute, type Coords } from "./geo";

describe("haversine", () => {
  it("retorna 0 para o mesmo ponto", () => {
    const p: Coords = { latitude: "-12.9714", longitude: "-38.5014" };
    expect(haversine(p, p)).toBeCloseTo(0, 6);
  });

  it("trata coordenadas ausentes como (0,0)", () => {
    expect(haversine({}, {})).toBe(0);
  });

  it("calcula a distância aproximada em km entre dois pontos", () => {
    // Salvador -> Feira de Santana (~100 km)
    const a: Coords = { latitude: "-12.9714", longitude: "-38.5014" };
    const b: Coords = { latitude: "-12.2664", longitude: "-38.9663" };
    expect(haversine(a, b)).toBeGreaterThan(80);
    expect(haversine(a, b)).toBeLessThan(120);
  });
});

describe("sortByRoute", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(sortByRoute([])).toEqual([]);
  });

  it("mantém a lista quando nenhum item tem coordenadas", () => {
    const list = [{ latitude: null, longitude: null, id: 1 }];
    expect(sortByRoute(list)).toEqual(list);
  });

  it("ordena por vizinho mais próximo e joga itens sem coordenadas para o fim", () => {
    const items = [
      { id: "start", latitude: "0", longitude: "0" },
      { id: "far", latitude: "0", longitude: "10" },
      { id: "near", latitude: "0", longitude: "1" },
      { id: "nocoords", latitude: null, longitude: null },
    ];
    const sorted = sortByRoute(items);
    expect(sorted.map(i => i.id)).toEqual(["start", "near", "far", "nocoords"]);
  });
});
