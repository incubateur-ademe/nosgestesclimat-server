export const converIpToNumber = (ip: string) => {
  return ip
    .split('.')
    .reduce(
      (accumulator, octet) => (accumulator << 8) + Number.parseInt(octet, 10),
      0
    )
}
