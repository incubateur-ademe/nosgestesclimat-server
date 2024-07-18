// Create a validation function that checks if an email is valid
// and that it does not contain any spaces.

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
