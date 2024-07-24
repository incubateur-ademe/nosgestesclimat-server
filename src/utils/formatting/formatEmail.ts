export function formatEmail(email: string | undefined): string {
  if (!email) {
    return ''
  }

  return email.toLowerCase().trim()
}
