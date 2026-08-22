export const MAINTENANCE_BASE_VALUE = 200;
export const MAINTENANCE_KM_VALUE = 2.5;

export function calculateMaintenancePayment(kilometers: number | string | null | undefined) {
  const km = Number.isFinite(Number(kilometers)) ? Math.max(0, Number(kilometers)) : 0;
  const valueByKm = km * MAINTENANCE_KM_VALUE;
  return {
    kilometers: km,
    baseValue: MAINTENANCE_BASE_VALUE,
    valueByKm,
    totalValue: MAINTENANCE_BASE_VALUE + valueByKm,
  };
}

export type TechnicianPaymentRow = {
  technician: string;
  kilometers?: number | string | null;
  totalValue?: number | string | null;
};

export function summarizePaymentsByTechnician(rows: TechnicianPaymentRow[]) {
  return rows.reduce<Record<string, { technician: string; orders: number; kilometers: number; totalValue: number }>>((summary, row) => {
    const technician = row.technician || "Não atribuído";
    const current = summary[technician] ?? { technician, orders: 0, kilometers: 0, totalValue: 0 };
    current.orders += 1;
    current.kilometers += Number(row.kilometers ?? 0) || 0;
    current.totalValue += Number(row.totalValue ?? 0) || 0;
    summary[technician] = current;
    return summary;
  }, {});
}
