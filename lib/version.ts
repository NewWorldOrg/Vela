export function velaVersion(): string | null {
  const declared: string | undefined = process.env.VELA_VERSION

  return declared !== undefined && declared.trim().length > 0
    ? declared.trim()
    : null
}
