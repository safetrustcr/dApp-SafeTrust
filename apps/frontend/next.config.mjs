/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@safetrust/types', '@safetrust/graphql'],
  // One network setting shared with apps/api (#550): the full Stellar network
  // passphrase. It is public information, so it is inlined into client code.
  env: {
    STELLAR_NETWORK_PASSPHRASE:
      process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'stellar.creit.tech',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
};

export default nextConfig;
