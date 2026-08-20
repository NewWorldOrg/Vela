'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  OidcConfig,
  OidcConfigChange,
  OidcSaveResult,
} from '@/repository/oidc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { InlineAlert } from '@/components/vela/banner'
import { Field, FieldHint, FieldLabel } from '@/components/vela/field'
import { KeyIcon, SuccessIcon } from '@/components/vela/icons'
import { RedirectUri } from '@/components/authentication/redirect-uri'

/**
 * The identity provider is optional, so this form is allowed to be empty. The
 * client secret is write-only — the API answers whether it holds one and never
 * what it is — so the field starts blank and is sent only when something was
 * typed into it.
 */
export function OidcSettings({
  config,
  onSave,
}: {
  config: OidcConfig
  onSave: (change: OidcConfigChange) => Promise<OidcSaveResult>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [saved, setSaved] = useState(false)
  const [discoveryUrl, setDiscoveryUrl] = useState(config.discoveryUrl)
  const [clientId, setClientId] = useState(config.clientId)
  const [clientSecret, setClientSecret] = useState('')
  const [groups, setGroups] = useState(config.allowedGroups.join('\n'))
  const [domains, setDomains] = useState(config.allowedHostedDomains.join('\n'))
  const discoveryId = useId()
  const clientIdId = useId()
  const secretId = useId()
  const groupsId = useId()
  const domainsId = useId()

  const save = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onSave({
        discoveryUrl: discoveryUrl.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.length > 0 ? clientSecret : undefined,
        allowedGroups: linesOf(groups),
        allowedHostedDomains: linesOf(domains),
      })

      if (result.state === 'refused') {
        setSaved(false)
        setRefusal(result.message)

        return
      }

      setClientSecret('')
      setSaved(true)
      router.refresh()
    })

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <span className="heading block text-ui text-ink">
          登録すべき redirect URI
        </span>
        <p className="mt-px mb-2.5 text-note text-ink-2">
          ID
          プロバイダ側へホスト名ごとに先に登録します。登録がないと、認証が終わったあとで初めて失敗します。
        </p>
        <RedirectUri value={config.redirectUri} />
      </div>

      {config.admitsEveryone && (
        <InlineAlert tone="warn">
          <b className="block font-bold">
            絞り込みが設定されていないため、テナントで認証できる全員が通ります。
          </b>
          許可グループか許可ドメインのどちらかを入れて絞り込んでください。
        </InlineAlert>
      )}

      <div className="flex flex-col gap-3.5">
        <Field>
          <FieldLabel htmlFor={discoveryId}>discovery URL</FieldLabel>
          <Input
            id={discoveryId}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={discoveryUrl}
            disabled={pending}
            onChange={(event) => setDiscoveryUrl(event.target.value)}
          />
          <FieldHint>
            保存の前に到達を確かめます。discovery URL と client ID
            を両方空にして保存すると、ID
            プロバイダの設定そのものを取り消します。
          </FieldHint>
        </Field>

        <Field>
          <FieldLabel htmlFor={clientIdId}>client ID</FieldLabel>
          <Input
            id={clientIdId}
            value={clientId}
            disabled={pending}
            onChange={(event) => setClientId(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={secretId}>client secret</FieldLabel>
          <Input
            id={secretId}
            type="password"
            autoComplete="off"
            placeholder={
              config.secretHeld
                ? '保持しています(変えるときだけ入力)'
                : '保持していません'
            }
            value={clientSecret}
            disabled={pending}
            onChange={(event) => setClientSecret(event.target.value)}
          />
          <FieldHint>
            書き込み専用です。保存したあとは読み出せないため、空のままなら
            {config.secretHeld
              ? 'いま保持しているものを使い続けます。'
              : '保存できません。'}
          </FieldHint>
        </Field>

        <Field>
          <FieldLabel htmlFor={groupsId}>許可グループ</FieldLabel>
          <Textarea
            id={groupsId}
            rows={3}
            value={groups}
            disabled={pending}
            onChange={(event) => setGroups(event.target.value)}
          />
          <FieldHint>
            1 行に 1 つ。グループクレームで絞り込みます。クレームが大きすぎて
            `_claim_names` に退避された要求は、既定では拒否します。
          </FieldHint>
        </Field>

        <Field>
          <FieldLabel htmlFor={domainsId}>許可ドメイン</FieldLabel>
          <Textarea
            id={domainsId}
            rows={3}
            value={domains}
            disabled={pending}
            onChange={(event) => setDomains(event.target.value)}
          />
          <FieldHint>
            1 行に 1 つ。groups クレームが出ない ID プロバイダでは、`hd`
            クレームのドメインで絞り込みます。
          </FieldHint>
        </Field>
      </div>

      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="danger">
            保存できませんでした。{refusal}
          </InlineAlert>
        )}
        {saved && (
          <span className="flex items-start gap-[9px] rounded-md bg-mint-soft px-3 py-2 text-sub text-mint">
            <SuccessIcon className="mt-[3px] size-[15px] shrink-0" />
            <span>
              保存しました。discovery
              に到達できることを確かめたうえで書き込んでいます。
            </span>
          </span>
        )}
      </span>

      <div>
        <Button disabled={pending} onClick={save}>
          <KeyIcon />
          {pending ? '到達を確かめています' : '保存'}
        </Button>
      </div>
    </div>
  )
}

function linesOf(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}
