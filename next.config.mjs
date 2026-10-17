/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Lo interno vive en /team; /equipo fue el nombre inicial.
    return [
      { source: '/equipo', destination: '/team', permanent: true },
      { source: '/equipo/:path*', destination: '/team/:path*', permanent: true },
      { source: '/api/equipo/:path*', destination: '/api/team/:path*', permanent: false },
    ];
  },
};
export default nextConfig;
