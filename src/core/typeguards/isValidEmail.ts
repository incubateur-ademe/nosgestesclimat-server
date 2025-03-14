export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export const isValidEmail = (email: unknown): email is string =>
  typeof email === 'string' && EMAIL_REGEX.test(email.toLocaleLowerCase())
