# Tempo Payouts

Live stablecoin batch payouts app built on [Tempo](https://tempo.xyz) (Moderato testnet). Disburses instant payments to gig workers — eliminating T+1 ACH delays and bank account requirements.

**[Live demo →](https://tempo-payouts.vercel.app)**

---

## Real numbers

| Metric | Tempo (measured) | ACH | Domestic Wire |
|---|---|---|---|
| Avg settlement | **1.78s** | ~24 hrs | Same day / T+1 |
| Cost per tx | **$0** (gas sponsored) | $0.20–$1.50 | $15–$50 |
| Availability | **24/7** | Mon–Fri, 5pm ET cutoff | Mon–Fri, business hours |
| Finality | **Irreversible on-chain** | Reversible up to 60 days | Final once received |
| Requires bank account | **No** | Yes | Yes |

*50 concurrent payouts · Tempo Moderato testnet · ~48,500× faster than ACH*

---

## What it does

- **Single payout** — send stablecoins to any wallet with a memo for reconciliation
- **Batch CSV** — upload a CSV, fire up to 100 concurrent transfers, get per-row results + stats
- **Compare Rails** — live side-by-side of Tempo vs ACH vs wire; updates with real measured numbers after each batch run

## Stack

- Next.js 15 · TypeScript · Tailwind CSS
- [viem](https://viem.sh) + `viem/tempo` for Tempo chain interactions
- Vercel (hosting)
- Alchemy RPC (Tempo Moderato testnet)

## Run locally

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `OPERATOR_PRIVATE_KEY` | Private key of the wallet that sponsors gas and sends payouts |
| `NEXT_PUBLIC_RPC_URL` | Alchemy RPC endpoint for Tempo Moderato testnet |

### CSV format

```
to,amount,memo,token
0xRecipient,100.00,worker_001 · INV-2026-001,0x20c0000000000000000000000000000000000000
```

`token` is optional (defaults to pathUSD). `memo` is optional.

---

*Built as a hands-on exploration of Tempo's stablecoin payment rail.*
