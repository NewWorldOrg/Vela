export function velaVersion(): string {
  const declared: string | undefined = process.env.VELA_VERSION

  if (declared === undefined || declared.trim().length === 0) {
    throw new Error('This build was handed no version.')
  }

  return declared.trim()
}
