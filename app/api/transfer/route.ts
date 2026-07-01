// Required on Visa corporate network — proxy uses a custom CA cert Node doesn't trust by default
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'viem/tempo'
import { privateKeyToAccount } from 'viem/accounts'
import { parseUnits, toHex, http } from 'viem'
import { TOKENS } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const { to, amount, memo, token } = await req.json()

    if (!to || !amount) {
      return NextResponse.json({ error: 'Missing required fields: to, amount' }, { status: 400 })
    }

    const account = privateKeyToAccount(
      process.env.OPERATOR_PRIVATE_KEY as `0x${string}`
    )

    const client = createClient({
      feeToken: TOKENS.alphaUSD,
      testnet: true,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    })

    const start = Date.now()

    const result = await (client.token as any).transferSync({
      account,
      to,
      amount: parseUnits(String(amount), 6),
      token: token || TOKENS.pathUSD,
      ...(memo ? { memo: toHex(memo) } : {}),
    })

    const settlementMs = Date.now() - start

    return NextResponse.json({
      hash: result.receipt.transactionHash,
      from: result.from,
      to: result.to,
      amount: result.formatted ?? String(amount),
      settlementMs,
    })
  } catch (err: any) {
    console.error('Transfer error:', err)
    return NextResponse.json({ error: err.message ?? 'Transfer failed' }, { status: 500 })
  }
}
