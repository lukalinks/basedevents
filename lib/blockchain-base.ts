import { erc20Abi, createPublicClient, createWalletClient, http, Hex } from 'viem'
import { base } from 'viem/chains'

export const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const

export type PrepareUsdcTransferParams = {
	from: `0x${string}`
	to: `0x${string}`
	amountUSDC: number
}

export async function prepareUsdcTransfer({ from, to, amountUSDC }: PrepareUsdcTransferParams) {
	const publicClient = createPublicClient({ chain: base, transport: http() })

	const decimals = 6n
	const amount = BigInt(Math.round(amountUSDC * 10 ** Number(decimals)))

	const data = {
		address: BASE_USDC_ADDRESS as `0x${string}`,
		abi: erc20Abi,
		functionName: 'transfer',
		args: [to, amount] as const,
	} as const

	const gas = await publicClient.estimateGas({
		account: from,
		to: BASE_USDC_ADDRESS as `0x${string}`,
		data: await publicClient.encodeFunctionData(data),
	})

	return { data, gas }
}

export async function waitForTxReceipt(txHash: Hex) {
	const publicClient = createPublicClient({ chain: base, transport: http() })
	return publicClient.waitForTransactionReceipt({ hash: txHash })
}


