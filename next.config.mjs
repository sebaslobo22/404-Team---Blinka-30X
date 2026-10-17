/** @type {import('next').NextConfig} */
// Las redirecciones de /equipo (nombre inicial de /team) viven en middleware.ts: asi, con
// MODO_PUBLICO=1, /equipo responde 404 en lugar de revelar que /team existe.
const nextConfig = {};
export default nextConfig;
