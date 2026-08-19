export type AuthMethod = 'local' | 'oidc'

export const LOGIN_PATH = '/login'

export const SIGNED_OUT_PATH = '/logged-out'

export const RETURN_KEY = 'next'

export const SIGN_IN_ERROR_KEY = 'error'

export const IDENTITY_PROVIDER_FAILED = 'oidc'

export const SIGNED_OUT_METHOD_KEY = 'method'

const OIDC_START_PATH = '/api/auth/oidc/start'

const SIGN_IN_OPTIONS_ENDPOINT = '/api/auth/sign-in-options'

const LOGIN_ENDPOINT = '/api/auth/login'

const LOGOUT_ENDPOINT = '/api/auth/logout'

const HOME = '/'

const DEFAULT_PATIENCE_SECONDS = 60

export interface Credentials {
  username: string
  password: string
}

export interface IdentityProviderSignIn {
  providerName: string | null
  reachable: boolean
}

export type SignInOptions =
  | { state: 'local-only' }
  | ({ state: 'identity-provider' } & IdentityProviderSignIn)

export type SignInResult =
  | { state: 'signed-in' }
  | { state: 'refused' }
  | { state: 'rate-limited'; retryAfterSeconds: number }
  | { state: 'unavailable' }

const LOCAL_ONLY: SignInOptions = { state: 'local-only' }

export async function getSignInOptions(): Promise<SignInOptions> {
  const baseUrl: string | undefined = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    return LOCAL_ONLY
  }

  try {
    const response: Response = await fetch(
      new URL(SIGN_IN_OPTIONS_ENDPOINT, baseUrl),
      { headers: { accept: 'application/json' }, cache: 'no-store' },
    )

    if (!response.ok) {
      return LOCAL_ONLY
    }

    const body: unknown = await response.json()

    return offeredBy(body)
  } catch {
    return LOCAL_ONLY
  }
}

export async function signIn(credentials: Credentials): Promise<SignInResult> {
  let response: Response

  try {
    response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'same-origin',
    })
  } catch {
    return { state: 'unavailable' }
  }

  if (response.ok) {
    return { state: 'signed-in' }
  }

  if (response.status === 429) {
    return { state: 'rate-limited', retryAfterSeconds: patienceOf(response) }
  }

  return response.status === 401
    ? { state: 'refused' }
    : { state: 'unavailable' }
}

export async function signOut(): Promise<boolean> {
  try {
    const response = await fetch(LOGOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      credentials: 'same-origin',
    })

    return response.ok
  } catch {
    return false
  }
}

export function oidcStartHref(returnPath: string): string {
  return `${OIDC_START_PATH}?${RETURN_KEY}=${encodeURIComponent(returnPath)}`
}

export function returnPathWithin(target: string | undefined): string {
  if (
    target === undefined ||
    target.length === 0 ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('\\') ||
    carriesAControlCharacter(target) ||
    leadsBackToTheLoginScreen(target)
  ) {
    return HOME
  }

  return target
}

export function signedOutMethod(value: string | undefined): AuthMethod {
  return value === 'oidc' ? 'oidc' : 'local'
}

function offeredBy(body: unknown): SignInOptions {
  const data: unknown = fieldOf(body, 'data')

  if (fieldOf(data, 'identityProvider') !== true) {
    return LOCAL_ONLY
  }

  const providerName: unknown = fieldOf(data, 'providerName')

  return {
    state: 'identity-provider',
    providerName:
      typeof providerName === 'string' && providerName.length > 0
        ? providerName
        : null,
    reachable: fieldOf(data, 'reach') === 'reachable',
  }
}

function fieldOf(source: unknown, name: string): unknown {
  return typeof source === 'object' && source !== null && name in source
    ? Reflect.get(source, name)
    : undefined
}

function carriesAControlCharacter(target: string): boolean {
  for (const character of target) {
    const code: number = character.codePointAt(0) ?? 0

    if (code < 0x20 || code === 0x7f) {
      return true
    }
  }

  return false
}

function leadsBackToTheLoginScreen(target: string): boolean {
  const named: string = target.toLowerCase()

  return (
    named === LOGIN_PATH ||
    named.startsWith(`${LOGIN_PATH}?`) ||
    named.startsWith(`${LOGIN_PATH}/`)
  )
}

function patienceOf(response: Response): number {
  const asked: number = Number.parseInt(
    response.headers.get('retry-after') ?? '',
    10,
  )

  return Number.isFinite(asked) && asked > 0 ? asked : DEFAULT_PATIENCE_SECONDS
}
