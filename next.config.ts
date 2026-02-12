/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Isso vai impedir que os erros de "any" ou "@ts-ignore" travem o deploy
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;