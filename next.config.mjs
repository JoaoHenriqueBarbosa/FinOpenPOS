/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para mejorar el hot-reload y evitar problemas de cache
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Mejorar el hot-reload con polling
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
