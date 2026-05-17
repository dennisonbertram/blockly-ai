import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Suppress Blockly SSR warnings — Blockly is loaded client-side only via next/dynamic
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent Blockly from being bundled server-side
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('blockly')
      }
    }
    return config
  },
}

export default nextConfig
