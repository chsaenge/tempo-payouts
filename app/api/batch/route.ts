if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'viem/tempo'
import { privateKeyToAccount } from 'viem/accounts'
import { parseUnits, toHex, http } from 'viem'
import { TOKENS } from '@/lib/constants'

type PayoutRow = {
  to: string
  amount: string
  memo?: string
  token?: string
}

type RowResult = {
  index: number
  to: string
  amount: string
  status: 'success' | 'error'
  hash?: string
  settlementMs?: number
  error?: string
}

export async function POST(req: NextRequest) {
  try {
    const { payouts, feeToken } = await req.json() as {
      payouts: PayoutRow[]
      feeToken?: string
    }

    if (!Array.isArray(payouts) || payouts.length === 0) {
      return NextResponse.json({ error: 'payouts must be a non-empty array' }, { status: 400 })
    }
    if (payouts.length > 100) {
      return NextResponse.json({ error: 'Max 100 payouts per batch' }, { status: 400 })
    }

    const account = privateKeyToAccount(
      process.env.OPERATOR_PRIVATE_KEY as `0x${string}`
    )

    const client = createClient({
      feeToken: (feeToken as `0x${string}`) ?? TOKENS.alphaUSD,
      testnet: true,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL),
    })

    const batchStart = Date.now()

    const settled = await Promise.allSettled(
      payouts.map(async (row, index): Promise<RowResult> => {
        const start = Date.now()
        const result = await (client.token as any).transferSync({
          account,
          to: row.to,
          amount: parseUnits(String(row.amount), 6),
          token: (row.token as `0x${string}`) ?? TOKENS.pathUSD,
          ...(row.memo ? { memo: toHex(row.memo) } : {}),
        })
        return {
          index,
          to: row.to,
          amount: row.amount,
          status: 'success',
          hash: result.receipt.transactionHash,
          settlementMs: Date.now() - start,
        }
      })
    )

    const results: RowResult[] = settled.map((s, index) => {
      if (s.status === 'fulfilled') return s.value
      return {
        index,
        to: payouts[index].to,
        amount: payouts[index].amount,
        status: 'error',
        error: s.reason?.message ?? 'Unknown error',
      }
    })

    const successes = results.filter(r => r.status === 'success')
    const failures = results.filter(r => r.status === 'error')
    const settlementTimes = successes.map(r => r.settlementMs!)

    const stats = {
      total: results.length,
      succeeded: successes.length,
      failed: failures.length,
      totalMs: Date.now() - batchStart,
      avgSettlementMs: settlementTimes.length
        ? Math.round(settlementTimes.reduce((a, b) => a + b, 0) / settlementTimes.length)
        : null,
      minSettlementMs: settlementTimes.length ? Math.min(...settlementTimes) : null,
      maxSettlementMs: settlementTimes.length ? Math.max(...settlementTimes) : null,
    }

    return NextResponse.json({ results, stats })
  } catch (err: any) {
    console.error('Batch error:', err)
    return NextResponse.json({ error: err.message ?? 'Batch failed' }, { status: 500 })
  }
}
