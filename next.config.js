/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 在构建过程中忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
