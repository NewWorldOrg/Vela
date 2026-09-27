export const CURTAIN_COOKIE = 'vela-curtain'

const ASKED = 'raise'

const ASK_LIVES_S = 300

export const CURTAIN_ASKING = `${CURTAIN_COOKIE}=${ASKED};path=/;max-age=${ASK_LIVES_S};SameSite=Lax`

export const CURTAIN_FORGETTING = `${CURTAIN_COOKIE}=;path=/;max-age=0;SameSite=Lax`

export function curtainAsked(said: string | undefined): boolean {
  return said === ASKED
}
