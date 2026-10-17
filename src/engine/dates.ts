const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?$/;

function partes(iso: unknown): { fecha: string; t: number } | null {
  if (typeof iso !== 'string') return null;
  const m = RE_FECHA.exec(iso);
  if (!m) return null;
  const fecha = `${m[1]}-${m[2]}-${m[3]}`;
  const t = Date.parse(`${fecha}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  // Rechaza fechas desbordadas como 2026-02-31
  if (new Date(t).toISOString().slice(0, 10) !== fecha) return null;
  if (m[4] !== undefined) {
    if (Number(m[4]) > 23 || Number(m[5]) > 59 || Number(m[6] ?? 0) > 59) return null;
    const tt = Date.parse(iso);
    if (Number.isNaN(tt)) return null;
    return { fecha, t: tt };
  }
  return { fecha, t };
}

/** Dias desde epoch UTC para una fecha ISO (AAAA-MM-DD, con hora opcional) valida; null si no es valida. */
export function diaNumero(iso: string | null | undefined): number | null {
  const p = partes(iso);
  return p === null ? null : Math.floor(Date.parse(`${p.fecha}T00:00:00Z`) / 86_400_000);
}

/** Milisegundos UTC de una fecha (00:00Z) o fecha con hora ISO valida; null si no es valida. */
export function instanteMs(iso: string | null | undefined): number | null {
  const p = partes(iso);
  return p === null ? null : p.t;
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7);
}
