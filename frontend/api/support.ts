import type { VercelRequest, VercelResponse } from '@vercel/node'

// In-memory rate limit store (resets on cold start, which is fine for basic protection)
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { txHash, message, walletAddress, network } = req.body || {}

  // Validate required fields
  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'TX Hash is required' })
  }

  if (!walletAddress || typeof walletAddress !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' })
  }

  // Validate tx hash format (0x + hex)
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return res.status(400).json({ error: 'Invalid TX Hash format' })
  }

  // Rate limit check
  const lastSubmit = rateLimitMap.get(walletAddress.toLowerCase())
  if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_MS) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastSubmit)) / 1000)
    return res.status(429).json({
      error: `Please wait ${remainingSeconds} seconds before submitting again`,
      remainingSeconds,
    })
  }

  // Get env vars
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  // Format message for Telegram
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB'

  // Determine explorer link based on network
  const explorerUrl = network === 'LiteForge'
    ? `https://liteforge.explorer.caldera.xyz/tx/${txHash}`
    : `https://sepolia.etherscan.io/tx/${txHash}`

  const telegramMessage = [
    '*Bridge Support Report*',
    '',
    `Wallet: \`${walletAddress}\``,
    `TX Hash: \`${txHash}\``,
    `Explorer: [View Transaction](${explorerUrl})`,
    network ? `Network: ${network}` : '',
    message ? `Message: ${message}` : '',
    '',
    `Time: ${timestamp}`,
  ].filter(Boolean).join('\n')

  try {
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramMessage,
          parse_mode: 'Markdown',
        }),
      }
    )

    if (!telegramRes.ok) {
      const errorData = await telegramRes.text()
      console.error('Telegram API error:', errorData)
      return res.status(500).json({ error: 'Failed to send report' })
    }

    // Update rate limit
    rateLimitMap.set(walletAddress.toLowerCase(), Date.now())

    return res.status(200).json({ success: true, message: 'Report submitted successfully' })
  } catch (error) {
    console.error('Error sending to Telegram:', error)
    return res.status(500).json({ error: 'Failed to send report' })
  }
}
