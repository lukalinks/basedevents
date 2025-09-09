import { getDefaultConfig } from '@wagmi/core'
import { base } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'

export const config = createConfig(
  getDefaultConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
  })
)
