/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    'antd',
    '@ant-design/icons',
    '@ant-design/icons-svg',
  'rc-tree',
  'rc-input',
  'rc-picker',
  'rc-table',
    'rc-util',
    'rc-field-form',
    'rc-select',
    'rc-textarea',
    'rc-trigger',
    'rc-tooltip',
    'rc-pagination'
  ],
  experimental: {
    esmExternals: 'loose'
  }
}

module.exports = nextConfig
