/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@safetrust/types', '@safetrust/graphql'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'stellar.creit.tech',
        pathname: '/wallet-icons/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
};

export default nextConfig;
