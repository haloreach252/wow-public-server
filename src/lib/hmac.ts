import { createHmac, timingSafeEqual } from 'crypto'

const HMAC_SECRET = process.env.PUBLIC_SITE_SERVICE_KEY
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export type SignedRequestHeaders = Record<string, string> & {
  'X-Service-Key': string
  'X-Timestamp': string
  'X-Signature': string
  'Content-Type': string
}

/**
 * Generate HMAC signature for a request to the admin panel.
 * This provides defense-in-depth security beyond just the service key.
 */
export function signRequest(
  method: string,
  path: string,
  body: object
): SignedRequestHeaders {
  if (!HMAC_SECRET) {
    throw new Error('PUBLIC_SITE_SERVICE_KEY not configured')
  }

  const timestamp = Date.now().toString()
  const bodyString = JSON.stringify(body)

  // Create signature from: method + path + timestamp + body
  const signaturePayload = `${method}:${path}:${timestamp}:${bodyString}`
  const signature = createHmac('sha256', HMAC_SECRET)
    .update(signaturePayload)
    .digest('hex')

  return {
    'X-Service-Key': HMAC_SECRET,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'Content-Type': 'application/json',
  }
}

/**
 * Verify HMAC signature from a request.
 * Note: This is provided for reference - actual verification happens on admin panel.
 */
export function verifySignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  signature: string,
  serviceKey: string
): { valid: boolean; error?: string } {
  if (!HMAC_SECRET) {
    return { valid: false, error: 'Service key not configured' }
  }

  // Verify service key first (constant-time)
  try {
    const keyBuffer = Buffer.from(serviceKey, 'utf8')
    const expectedBuffer = Buffer.from(HMAC_SECRET, 'utf8')
    if (keyBuffer.length !== expectedBuffer.length || !timingSafeEqual(keyBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid service key' }
    }
  } catch {
    return { valid: false, error: 'Invalid service key' }
  }

  // Verify timestamp is within allowed window
  const requestTime = parseInt(timestamp, 10)
  const now = Date.now()
  if (isNaN(requestTime) || Math.abs(now - requestTime) > REQUEST_TIMEOUT_MS) {
    return { valid: false, error: 'Request expired or invalid timestamp' }
  }

  // Verify signature
  const signaturePayload = `${method}:${path}:${timestamp}:${body}`
  const expectedSignature = createHmac('sha256', HMAC_SECRET)
    .update(signaturePayload)
    .digest('hex')

  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }
  } catch {
    return { valid: false, error: 'Invalid signature format' }
  }

  return { valid: true }
}
