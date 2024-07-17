export function formatEmail(email: string): string {
  if (!email) {
    return ''
  }

  return email.toLowerCase().trim()
}
