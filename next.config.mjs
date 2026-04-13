/** @type {import('next').NextConfig} */
const configuracaoNext = {
  // Configurações do Next.js para o Clinio

  // Otimização de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  // Configuração experimental para Server Actions
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  // Redirecionamentos
  async redirects() {
    return [
      {
        source: '/',
        destination: '/painel',
        permanent: false,
      },
    ]
  },
}

export default configuracaoNext
