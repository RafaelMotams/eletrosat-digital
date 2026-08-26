export type CidrInfo = {
  ip: string;
  prefix: number;
  netmask: string;
  network: string;
  broadcast: string;
  firstHost: string | null;
  lastHost: string | null;
  usableHosts: number;
};

function ipv4ToNumber(ip: string): number | null {
  const octets = ip.trim().split(".");
  if (octets.length !== 4) return null;
  const values = octets.map((octet) => Number(octet));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return (((values[0] << 24) >>> 0) + (values[1] << 16) + (values[2] << 8) + values[3]) >>> 0;
}

function numberToIpv4(value: number): string {
  const normalized = value >>> 0;
  return [
    (normalized >>> 24) & 255,
    (normalized >>> 16) & 255,
    (normalized >>> 8) & 255,
    normalized & 255,
  ].join(".");
}

export function calcularCidr(input: string): CidrInfo | null {
  const [rawIp, rawPrefix] = input.trim().split("/");
  const ipNumber = ipv4ToNumber(rawIp ?? "");
  const prefix = Number(rawPrefix);
  if (ipNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipNumber & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  const usableHosts = prefix >= 31 ? 0 : totalAddresses - 2;

  return {
    ip: numberToIpv4(ipNumber),
    prefix,
    netmask: numberToIpv4(mask),
    network: numberToIpv4(network),
    broadcast: numberToIpv4(broadcast),
    firstHost: usableHosts > 0 ? numberToIpv4(network + 1) : null,
    lastHost: usableHosts > 0 ? numberToIpv4(broadcast - 1) : null,
    usableHosts,
  };
}

export function calcularPoe(orçamentoWatts: number, consumoWatts: number) {
  const orçamento = Number.isFinite(orçamentoWatts) && orçamentoWatts >= 0 ? orçamentoWatts : 0;
  const consumo = Number.isFinite(consumoWatts) && consumoWatts >= 0 ? consumoWatts : 0;
  const restante = orçamento - consumo;
  return {
    orçamento,
    consumo,
    restante,
    percentual: orçamento > 0 ? Math.min(100, (consumo / orçamento) * 100) : 0,
    excedido: consumo > orçamento,
  };
}

export function dbmParaMilliwatts(dbm: number): number | null {
  if (!Number.isFinite(dbm)) return null;
  return 10 ** (dbm / 10);
}

export function milliwattsParaDbm(milliwatts: number): number | null {
  if (!Number.isFinite(milliwatts) || milliwatts <= 0) return null;
  return 10 * Math.log10(milliwatts);
}

export function calcularPerdaOptica(potenciaLancadaDbm: number, potenciaRecebidaDbm: number) {
  if (!Number.isFinite(potenciaLancadaDbm) || !Number.isFinite(potenciaRecebidaDbm)) return null;
  return potenciaLancadaDbm - potenciaRecebidaDbm;
}

export function estimarAutonomiaNobreak(cargaWatts: number, bateriaAh: number, tensaoVolts = 12, eficiencia = 0.8) {
  if (![cargaWatts, bateriaAh, tensaoVolts, eficiencia].every(Number.isFinite) || cargaWatts <= 0 || bateriaAh <= 0 || tensaoVolts <= 0 || eficiencia <= 0 || eficiencia > 1) return null;
  const energiaUtilWh = bateriaAh * tensaoVolts * eficiencia;
  const minutos = (energiaUtilWh / cargaWatts) * 60;
  return { energiaUtilWh, minutos };
}

export const PADROES_T568 = {
  A: ["Branco/Verde", "Verde", "Branco/Laranja", "Azul", "Branco/Azul", "Laranja", "Branco/Marrom", "Marrom"],
  B: ["Branco/Laranja", "Laranja", "Branco/Verde", "Azul", "Branco/Azul", "Verde", "Branco/Marrom", "Marrom"],
} as const;
