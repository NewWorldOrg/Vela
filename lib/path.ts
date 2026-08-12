export function isPathActive(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`)
}
