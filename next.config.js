/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Forza TypeScript checking rigoroso come Vercel
  typescript: {
    // Durante il build, fallisce se ci sono errori TypeScript
    ignoreBuildErrors: false,
  },
  // Forza ESLint checking rigoroso come Vercel
  eslint: {
    // Durante il build, fallisce se ci sono errori ESLint
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
