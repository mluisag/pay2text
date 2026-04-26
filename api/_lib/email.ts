import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export type SendMessageEmailInput = {
  toEmail: string
  recipientHandle: string
  intentLabel: string
  amountDisplay: string
  senderAddress: string
  messageText: string
}

/**
 * Sends the "new message" notification email via Resend.
 *
 * Returns { sent: false } and logs the reason if Resend isn't configured or
 * the request fails — never throws. Callers should treat email as a best-effort
 * side effect that must not block the message-save response.
 */
export async function sendMessageEmail(
  input: SendMessageEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  if (!resend) {
    console.warn(
      '[email] RESEND_API_KEY is not set in this environment — cannot send.',
    )
    return { sent: false, reason: 'resend_not_configured' }
  }

  const { toEmail, intentLabel, amountDisplay, senderAddress, messageText } = input
  const dashboardUrl = 'https://pay2text.xyz/dashboard'
  const senderShort =
    senderAddress.length > 14
      ? `${senderAddress.slice(0, 6)}…${senderAddress.slice(-4)}`
      : senderAddress

  const text = [
    `Someone paid ${amountDisplay} to send you a message.`,
    '',
    `Reason: ${intentLabel}`,
    '',
    `From: ${senderShort}`,
    '',
    messageText,
    '',
    `View in dashboard: ${dashboardUrl}`,
    '',
    '—',
    'Lumo',
  ].join('\n')

  const html = renderHtml({ intentLabel, amountDisplay, senderShort, messageText, dashboardUrl })

  try {
    console.log(`[email] calling Resend SDK for ${toEmail}…`)
    const { error, data } = await resend.emails.send({
      from: 'Lumo <onboarding@resend.dev>',
      to: toEmail,
      subject: 'Lumo let someone in: a new message for you',
      text,
      html,
    })
    if (error) {
      console.error('[email] Resend returned an error:', error)
      return { sent: false, reason: String(error.message ?? error) }
    }
    console.log(`[email] Resend accepted, id=${data?.id ?? 'unknown'}`)
    return { sent: true }
  } catch (err) {
    console.error('[email] Resend SDK threw:', err)
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown' }
  }
}

function renderHtml(args: {
  intentLabel: string
  amountDisplay: string
  senderShort: string
  messageText: string
  dashboardUrl: string
}): string {
  const escapedMessage = escapeHtml(args.messageText)
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px 16px;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;line-height:1.6;">
    <p style="margin:0 0 18px;font-size:16px;color:#222;">Someone paid <strong>${args.amountDisplay}</strong> to send you a message.</p>

    <p style="margin:0 0 4px;font-size:13px;color:#777;text-transform:none;">Reason</p>
    <p style="margin:0 0 16px;font-size:15px;color:#222;">${escapeHtml(args.intentLabel)}</p>

    <p style="margin:0 0 4px;font-size:13px;color:#777;">From</p>
    <p style="margin:0 0 16px;font-size:14px;color:#222;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(args.senderShort)}</p>

    <p style="margin:0 0 4px;font-size:13px;color:#777;">Message</p>
    <p style="margin:0 0 22px;padding:14px 16px;background:#f5f5f5;border-radius:10px;white-space:pre-wrap;font-size:15px;color:#222;">${escapedMessage}</p>

    <a href="${args.dashboardUrl}" style="display:inline-block;background:#111;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-size:14px;">View in dashboard</a>

    <p style="margin:28px 0 0;color:#999;font-size:13px;">—<br/>Lumo</p>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
