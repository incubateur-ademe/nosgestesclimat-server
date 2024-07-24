export function formatEmail(email: unknown): string {
  return typeof email === 'string' ? email.toLowerCase().trim() : ''
}
