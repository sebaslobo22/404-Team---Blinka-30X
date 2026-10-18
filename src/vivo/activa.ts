/** La lectura en vivo solo existe si el despliegue la activa a proposito y tiene clave. */
export function lecturaEnVivoActiva(env: Record<string, string | undefined> = process.env): boolean {
  return env['LECTURA_EN_VIVO'] === '1' && Boolean(env['OPENROUTER_API_KEY']);
}
