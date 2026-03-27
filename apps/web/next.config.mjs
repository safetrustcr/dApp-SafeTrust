/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@safetrust/types', '@safetrust/graphql'],
};

export default nextConfig;
