/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Forza TypeScript checking rigoroso come Vercel
  typescript: {
    // Durante il build, fallisce se ci sono errori TypeScript
    ignoreBuildErrors: false,
  },
  // ESLint è ora gestito tramite next lint, non più tramite next.config.js
  // Rimossa configurazione eslint obsoleta (Next.js 16+)
}

module.exports = nextConfig
