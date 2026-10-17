const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Dias desde epoch UTC para una fecha ISO AAAA-MM-DD valida; null si no es valida. */
export function diaNumero(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string') return null;
  const fecha = iso.slice(0, 10);
  if (!RE_FECHA.test(fecha)) return null;
  const t = Date.parse(`${fecha}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  // Rechaza fechas desbordadas como 2026-02-31
  if (new Date(t).toISOString().slice(0, 10) !== fecha) return null;
  return Math.floor(t / 86_400_000);
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}
