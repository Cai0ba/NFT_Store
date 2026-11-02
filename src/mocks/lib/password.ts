const encoder = new TextEncoder()

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export function randomSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function hashPassword(password: string, salt: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`))
  return bytesToHex(new Uint8Array(digest))
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await hashPassword(password, salt)
  if (actual.length !== expectedHash.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i)
  return diff === 0
}

export function randomToken() {
  return `kt_${bytesToHex(crypto.getRandomValues(new Uint8Array(24)))}`
}
