/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Appka je online-only a striktně dynamická (session + herní stav ze Supabase).
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
