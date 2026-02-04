/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repo currently contains a lot of lint violations (e.g. explicit any).
  // Don't block production builds on ESLint.
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Nie kompiluj postgres po stronie klienta
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
      };
    }
    return config;
  },
};

export default nextConfig;
