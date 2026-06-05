import crypto from 'crypto'

const KEY = Buffer.from('1234567890abcdef', 'utf8')
const IV  = Buffer.from('abcdef1234567890', 'utf8')

export function encryptForEsp32(plaintext) {
  const cipher = crypto.createCipheriv('aes-128-cbc', KEY, IV)
  return cipher.update(plaintext, 'utf8', 'base64') + cipher.final('base64')
}
