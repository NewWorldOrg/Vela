import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const WALKED = ['repository']

const GENERATED = 'repository/client/schema.ts'

const NOT_SOURCE = new Set(['node_modules'])

const VERBS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

const THE_ENVELOPE = ['status', 'message', 'data']

const WRAPS_EVERY_ANSWER = 'BaseResponderOf'

const WHAT_THE_ENDPOINT_ANSWERS = 'data'

const NOT_READ_ON_PURPOSE: { because: string; fields: string[] }[] = [
  {
    because:
      'the call is made to know whether it worked, and what it lists is asked for again afterwards, so the answer handed straight back is not what the screen draws',
    fields: [
      'BaseResponderOfBroadcastServiceResponder.data',
      'BaseResponderOfEncodeDestinationResponder.data',
      'BaseResponderOfEncodeJobResponder.data',
      'BaseResponderOfEncodeProfileResponder.data',
      'BaseResponderOfQualityThresholdResponder.data',
      'BaseResponderOfScanApplicationResponder.data',
      'BaseResponderOfScanRefusedResponder.data',
      'BaseResponderOfServiceReachSettingsResponder.data',
      'BaseResponderOfTunerObservationResponder.data',
      'BaseResponderOfstring.data',
    ],
  },
  {
    because:
      'the screen pages from what the URL holds and counts the rows it was handed, so the counters that come back with a page repeat the ask',
    fields: [
      'IntegrityListResponder.currentPage',
      'IntegrityListResponder.lastPage',
      'IntegrityListResponder.perPage',
      'LiveChannelListResponder.currentPage',
      'LiveChannelListResponder.lastPage',
      'LiveChannelListResponder.perPage',
      'LiveChannelListResponder.total',
      'MigrationRecordResponder.currentPage',
      'MigrationRecordResponder.perPage',
      'MigrationRecordResponder.total',
      'QualityChannelListResponder.currentPage',
      'QualityChannelListResponder.lastPage',
      'QualityChannelListResponder.perPage',
      'QualityChannelListResponder.total',
      'QualityRecordingListResponder.currentPage',
      'QualityRecordingListResponder.lastPage',
      'QualityRecordingListResponder.perPage',
      'QualityTunerListResponder.currentPage',
      'QualityTunerListResponder.lastPage',
      'QualityTunerListResponder.perPage',
      'QualityTunerListResponder.total',
      'RecordingListResponder.currentPage',
      'RecordingListResponder.perPage',
      'ReservationListResponder.currentPage',
      'ReservationListResponder.perPage',
      'ReservationOutcomeListResponder.perPage',
    ],
  },
  {
    because:
      'an id of the very row that was acted on, which the screen was holding before it asked; an id is never put in front of the reader',
    fields: [
      'BoostRefusedResponder.runningBoostId',
      'BoostStartedResponder.boostId',
      'EncodeRemovalResponder.id',
      'IntegrityFindingResponder.id',
      'IntegritySweepRefusedResponder.runningCheckId',
      'MigrationRunResponder.id',
      'RecordingDiscardRefusedResponder.recordingId',
      'RecordingDiscardResponder.recordingId',
      'ReservationDiscardRefusedResponder.reservationId',
      'ReservationDiscardResponder.reservationId',
      'ReservationOutcomeProgrammeResponder.id',
      'RuleApplicationRefusedResponder.runningApplyId',
      'RulePreviewTakeResponder.eventId',
      'RuleRetirementResponder.ruleId',
      'ScanRunResponder.driverInstanceId',
    ],
  },
  {
    because:
      'the numbering a broadcast carries on the wire; a service is named on screen by its name and reached by the id the API puts on the row',
    fields: [
      'GuideServiceResponder.networkId',
      'GuideServiceResponder.serviceId',
      'RecordingProgrammeResponder.eventId',
      'RescanNoticeResponder.networkId',
      'RescanNoticeResponder.serviceIds',
      'RescanNoticeResponder.transportStreamId',
      'ReservationOutcomeProgrammeResponder.eventId',
      'ReservationProgrammeResponder.eventId',
      'ScanChannelChangeResponder.transportStreamId',
      'StreamTuningResponder.transportStreamId',
    ],
  },
  {
    because:
      'a stamp the row has no place for: what it is about is already spelt on that row by another time',
    fields: [
      'DriverRestartResponder.acceptedAt',
      'QualityRecordingResponder.measuredUpdatedAt',
      'RecordingProgrammeResponder.capturedAt',
      'RecordingProgrammeResponder.startsAt',
      'RecordingWindowResponder.start',
      'ReservationProgrammeResponder.capturedAt',
      'ReservationProgrammeResponder.startsAt',
      'ReservationReceptionResponder.since',
      'ReservationResponder.createdAt',
      'ReservationResponder.startedAt',
      'StationLogoResponder.collectedAt',
      'TunerObservationResponder.sessionStartedAt',
    ],
  },
  {
    because:
      'the quality screen draws the counts it was designed around; the rest of what these endpoints tally, and what the thresholds say about themselves, have no part of a screen drawn for them yet',
    fields: [
      'QualityChannelListResponder.metrics',
      'QualityChannelListResponder.period',
      'QualityChannelListResponder.provisional',
      'QualityReadingResponder.beyondThreshold',
      'QualityRecordingListResponder.metrics',
      'QualityRecordingListResponder.period',
      'QualityRecordingListResponder.provisional',
      'QualityRecordingListResponder.whole',
      'QualityRecordingResponder.kind',
      'QualityRecordingResponder.totalPackets',
      'QualityRecordingResponder.tunerDeviceId',
      'QualitySummaryResponder.period',
      'QualitySummaryResponder.recordings',
      'QualityTallyResponder.good',
      'QualityTallyResponder.highest',
      'QualityTallyResponder.lowest',
      'QualityTallyResponder.unreachable',
      'QualityTallyResponder.unsupported',
      'QualityTallyResponder.warning',
      'QualityThresholdResponder.lastChange',
      'QualityThresholdResponder.metric',
      'QualityThresholdResponder.sense',
      'QualityThresholdResponder.stored',
      'QualityThresholdResponder.updatedAt',
      'QualityThresholdResponder.updatedBy',
      'QualityTunerListResponder.metrics',
      'QualityTunerListResponder.period',
      'QualityTunerListResponder.provisional',
      'QualityVerdictResponder.applied',
      'QualityVerdictResponder.appliedValue',
      'QualityVerdictResponder.breached',
      'QualityVerdictResponder.provisional',
    ],
  },
  {
    because:
      'taken off the recording screen deliberately, and this is what is left of it on the wire',
    fields: ['RecordingReconciliationResponder.coverage'],
  },
  {
    because:
      'the reservation screens show what was asked for and how it ended; what the guide has said about the programme since, and what was taken in its place, have no part of a screen drawn for them yet',
    fields: [
      'ReservationProgrammeResponder.extended',
      'ReservationProgrammeResponder.genres',
      'ReservationResponder.broadcastGroup',
      'ReservationResponder.epg',
      'ReservationResponder.recordingOutcome',
      'ReservationSettlementResponder.instead',
      'ReservationSettlementResponder.reservation',
      'ReservationSettlementResponder.seatsLeftOut',
      'RuleSwitchedResponder.rule',
    ],
  },
  {
    because:
      'the recording screens name how a recording ended and let it be played; what the recorder noticed while it ran, and where it anchored the picture, have no part of a screen drawn for them yet',
    fields: [
      'DropBucketResponder.scrambled',
      'RecordingBroadcastGroupResponder.role',
      'RecordingFaultResponder.note',
      'RecordingFaultResponder.noticedAt',
      'RecordingInterruptionResponder.fault',
      'RecordingInterruptionResponder.occurredAt',
      'RecordingInterruptionResponder.resumedAt',
      'RecordingPositionsResponder.anchorPcr',
      'RecordingPositionsResponder.located',
      'RecordingPositionsResponder.reanchors',
      'RecordingReconciliationResponder.fileSizeBytes',
      'RecordingReconciliationResponder.stoppedUnasked',
      'RecordingResponder.standing',
      'RecordingThumbnailResponder.fault',
      'RecordingThumbnailResponder.showsAnUnfinishedRecording',
      'ThumbnailRemakeResponder.thumbnail',
    ],
  },
  {
    because:
      'the encoding screens show a job by where it has got to; how the picture lined up against the recording it came from, and which settings have been retired, have no part of a screen drawn for them yet',
    fields: ['EncodeJobResponder.timeline', 'EncodeRemovalResponder.retiredAt'],
  },
  {
    because:
      'the live screens open a channel and let the picture be sized; what the encoder was set to, and what is waiting to be sent, have no part of a screen drawn for them yet',
    fields: [
      'LiveChannelResponder.category',
      'LiveChannelResponder.sessions',
      'LiveProfileResponder.codec',
      'LiveProfileResponder.frameRate',
      'LiveProfileResponder.softwareKilobitsPerSecond',
      'LiveProfileResponder.vaapiQuantiser',
      'LiveSessionResponder.startup',
      'LiveViewerResponder.queued',
    ],
  },
  {
    because:
      'the row shows the state the driver put it in; the sentence the driver writes beside that state has no place drawn for it yet',
    fields: [
      'DetectedDeviceResponder.detail',
      'ScanAttemptResponder.detail',
      'TunerObservationResponder.detail',
      'TunerObservationResponder.healthChangedAt',
      'TunerObservationResponder.healthDetail',
    ],
  },
  {
    because:
      'the row takes its kind from what the driver observed, which is the same field on the observation standing beside it',
    fields: ['TunerEntryResponder.kind'],
  },
  {
    because:
      'the channel and scan screens show what a scan changed and what is worth adding; how strongly it came in, why a rescan is being asked for, and how the sweep is getting on, have no part of a screen drawn for them yet',
    fields: [
      'CandidateChannelResponder.needsAttentionSince',
      'CandidateChannelResponder.selection',
      'EpgRebuiltResponder.generation',
      'RescanNoticeResponder.noticedAt',
      'RescanNoticeResponder.reason',
      'ScanMeasurementResponder.measuredAt',
      'ScanMeasurementResponder.postViterbiErrorBits',
      'ScanMeasurementResponder.postViterbiTotalBits',
      'ScanServiceChangeResponder.kind',
      'StreamCollectionStatusResponder.rotation',
      'StreamCollectionStatusResponder.tally',
      'TunerHealthResponder.undetermined',
    ],
  },
  {
    because:
      'a single value on a settings screen that has no field drawn for it yet',
    fields: [
      'IntegritySweepResponder.check',
      'MigrationDetailResponder.subject',
      'OidcConfigResponder.redirectUriGuessed',
      'StorageRootResponder.committedBytes',
    ],
  },
]

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (/\.tsx?$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

async function theWalkedTree(): Promise<string[]> {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  return files.filter((file) => file !== GENERATED)
}

function walk(node: ts.Node, seen: (node: ts.Node) => void): void {
  seen(node)
  ts.forEachChild(node, (child) => walk(child, seen))
}

function spelt(name: ts.PropertyName): string {
  return ts.isStringLiteral(name) ? name.text : name.getText()
}

function membersOf(type: ts.TypeNode): ts.PropertySignature[] {
  return ts.isTypeLiteralNode(type)
    ? type.members.filter(
        (member): member is ts.PropertySignature =>
          ts.isPropertySignature(member) && member.type !== undefined,
      )
    : []
}

function namedSchema(node: ts.TypeNode): string | undefined {
  if (!ts.isIndexedAccessTypeNode(node)) {
    return undefined
  }

  const held = whatIsIndexed(node.objectType)

  return held === 'schemas' ? whatIsIndexed(node) : undefined
}

function namedOperation(node: ts.TypeNode): string | undefined {
  if (!ts.isIndexedAccessTypeNode(node)) {
    return undefined
  }

  return ts.isTypeReferenceNode(node.objectType) &&
    node.objectType.typeName.getText() === 'operations'
    ? whatIsIndexed(node)
    : undefined
}

function whatIsIndexed(node: ts.TypeNode): string | undefined {
  if (!ts.isIndexedAccessTypeNode(node)) {
    return undefined
  }

  const index = node.indexType

  return ts.isLiteralTypeNode(index) && ts.isStringLiteral(index.literal)
    ? index.literal.text
    : undefined
}

function membersOfInterface(
  generated: ts.SourceFile,
  named: string,
): ts.PropertySignature[] {
  const found: ts.PropertySignature[] = []

  walk(generated, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === named) {
      found.push(
        ...node.members.filter(
          (member): member is ts.PropertySignature =>
            ts.isPropertySignature(member) && member.type !== undefined,
        ),
      )
    }
  })

  return found
}

function theSchemas(generated: ts.SourceFile): Map<string, ts.TypeNode> {
  const schemas = new Map<string, ts.TypeNode>()

  for (const held of membersOfInterface(generated, 'components')) {
    if (spelt(held.name) !== 'schemas' || held.type === undefined) {
      continue
    }

    for (const schema of membersOf(held.type)) {
      if (schema.type !== undefined) {
        schemas.set(spelt(schema.name), schema.type)
      }
    }
  }

  return schemas
}

function theRoutes(generated: ts.SourceFile): Map<string, string> {
  const routes = new Map<string, string>()

  for (const route of membersOfInterface(generated, 'paths')) {
    if (route.type === undefined) {
      continue
    }

    for (const verb of membersOf(route.type)) {
      const operation =
        verb.type === undefined ? undefined : namedOperation(verb.type)

      if (operation !== undefined) {
        routes.set(
          `${spelt(verb.name).toUpperCase()} ${spelt(route.name)}`,
          operation,
        )
      }
    }
  }

  return routes
}

function isEnvelope(schema: string, type: ts.TypeNode): boolean {
  const members = membersOf(type).map((member) => spelt(member.name))

  return (
    schema.startsWith(WRAPS_EVERY_ANSWER) &&
    members.length === THE_ENVELOPE.length &&
    THE_ENVELOPE.every((named) => members.includes(named))
  )
}

interface Reading {
  files: string[]
  asked: string[]
  roots: string[]
  fields: number
  read: number
  unread: string[]
}

const HANDED_ON = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.NonNullExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.ConditionalExpression,
])

function readTheTree(files: string[]): Reading {
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile).config,
    ts.sys,
    ROOT,
  )

  const program = ts.createProgram({
    rootNames: [...files, GENERATED].map((file) => path.join(ROOT, file)),
    options: { ...config.options, incremental: false, noEmit: true },
  })

  const checker = program.getTypeChecker()
  const generated = program.getSourceFile(path.join(ROOT, GENERATED))

  if (generated === undefined) {
    throw new Error(`${GENERATED} is not in the tree this test reads`)
  }

  const schemas = theSchemas(generated)
  const routes = theRoutes(generated)
  const operations = new Map(
    membersOfInterface(generated, 'operations').map((operation) => [
      spelt(operation.name),
      operation,
    ]),
  )

  function sourceOf(file: string): ts.SourceFile {
    const source = program.getSourceFile(path.join(ROOT, file))

    if (source === undefined) {
      throw new Error(`${file} is not in the tree this test reads`)
    }

    return source
  }

  const asked = new Set<string>()

  for (const file of files) {
    walk(sourceOf(file), (node) => {
      if (!ts.isCallExpression(node) || node.arguments.length === 0) {
        return
      }

      const called = node.expression

      if (
        !ts.isPropertyAccessExpression(called) ||
        !VERBS.has(called.name.text)
      ) {
        return
      }

      const route = node.arguments[0]

      if (ts.isStringLiteral(route) && route.text.startsWith('/')) {
        asked.add(`${called.name.text} ${route.text}`)
      }
    })
  }

  const unmatched = [...asked].filter((one) => !routes.has(one))

  if (unmatched.length > 0) {
    throw new Error(
      `${unmatched.sort().join(', ')} is asked for by a module under ` +
        `${WALKED.join('/')} and is not a route the generated client declares`,
    )
  }

  const roots = new Set<string>()

  for (const one of asked) {
    const operation = operations.get(routes.get(one) ?? '')

    if (operation === undefined) {
      continue
    }

    walk(operation, (node) => {
      if (!ts.isPropertySignature(node) || spelt(node.name) !== 'responses') {
        return
      }

      walk(node, (held) => {
        const schema = ts.isTypeNode(held) ? namedSchema(held) : undefined

        if (schema !== undefined) {
          roots.add(schema)
        }
      })
    })
  }

  const read = new Set<ts.PropertySignature>()

  function mark(declarations: readonly ts.Declaration[] | undefined): void {
    for (const declaration of declarations ?? []) {
      if (
        ts.isPropertySignature(declaration) &&
        declaration.getSourceFile() === generated
      ) {
        read.add(declaration)
      }
    }
  }

  function generatedProperty(
    held: ts.Type,
    named: string,
  ): ts.Symbol | undefined {
    for (const part of held.isUnion() ? held.types : [held]) {
      const found = part.getProperty(named)

      if (
        found?.declarations?.some(
          (declaration) =>
            ts.isPropertySignature(declaration) &&
            declaration.getSourceFile() === generated,
        )
      ) {
        return found
      }
    }

    return undefined
  }

  function markOn(expression: ts.Expression, named: string): void {
    mark(
      generatedProperty(checker.getTypeAtLocation(expression), named)
        ?.declarations,
    )
  }

  function handedOn(node: ts.Expression): void {
    if (
      ts.isPropertyAccessExpression(node.parent) &&
      node.parent.name === node
    ) {
      return
    }

    const wanted = checker.getContextualType(node)

    if (wanted === undefined) {
      return
    }

    const held = checker.getTypeAtLocation(node)

    if (held === wanted) {
      return
    }

    for (const property of wanted.getProperties()) {
      mark(generatedProperty(held, property.name)?.declarations)
    }
  }

  for (const file of files) {
    walk(sourceOf(file), (node) => {
      if (ts.isPropertyAccessExpression(node)) {
        mark(checker.getSymbolAtLocation(node.name)?.declarations)
        markOn(node.expression, node.name.text)
        handedOn(node)
        return
      }

      if (
        ts.isElementAccessExpression(node) &&
        node.argumentExpression !== undefined &&
        ts.isStringLiteral(node.argumentExpression)
      ) {
        markOn(node.expression, node.argumentExpression.text)
        return
      }

      if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
        const named = node.propertyName ?? node.name

        if (ts.isIdentifier(named) || ts.isStringLiteral(named)) {
          mark(checker.getSymbolAtLocation(named)?.declarations)
        }
        return
      }

      if (HANDED_ON.has(node.kind)) {
        handedOn(node as ts.Expression)
      }
    })
  }

  const named = new Map<ts.PropertySignature, string>()
  const opened = new Set<string>()
  const unread = new Set<string>()

  function openType(type: ts.TypeNode, base: string): void {
    if (ts.isUnionTypeNode(type)) {
      for (const member of type.types) {
        openType(member, base)
      }
      return
    }

    if (ts.isArrayTypeNode(type)) {
      openType(type.elementType, base)
      return
    }

    if (ts.isParenthesizedTypeNode(type)) {
      openType(type.type, base)
      return
    }

    const schema = namedSchema(type)

    if (schema !== undefined) {
      openSchema(schema)
      return
    }

    for (const member of membersOf(type)) {
      openMember(member, base)
    }
  }

  function openMember(member: ts.PropertySignature, base: string): void {
    if (member.type === undefined) {
      return
    }

    if (!named.has(member)) {
      named.set(member, `${base}.${spelt(member.name)}`)
    }

    const where = named.get(member) ?? ''

    if (read.has(member)) {
      openType(member.type, where)
    } else {
      unread.add(where)
    }
  }

  function openSchema(schema: string): void {
    if (opened.has(schema)) {
      return
    }

    opened.add(schema)

    const type = schemas.get(schema)

    if (type === undefined) {
      return
    }

    if (!isEnvelope(schema, type)) {
      openType(type, schema)
      return
    }

    for (const member of membersOf(type)) {
      if (spelt(member.name) === WHAT_THE_ENDPOINT_ANSWERS) {
        openMember(member, schema)
      }
    }
  }

  for (const schema of [...roots].sort()) {
    openSchema(schema)
  }

  return {
    files,
    asked: [...asked].sort(),
    roots: [...roots].sort(),
    fields: named.size,
    read: read.size,
    unread: [...unread].sort(),
  }
}

let reading: Promise<Reading> | undefined

function theReading(): Promise<Reading> {
  reading ??= theWalkedTree().then(readTheTree)

  return reading
}

function letThrough(): Set<string> {
  return new Set(NOT_READ_ON_PURPOSE.flatMap((one) => one.fields))
}

test('a field the API answers with is read on its way to the screen', async () => {
  const { files, unread } = await theReading()

  assert.ok(
    files.length > 30,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const missed = letThrough()

  assert.deepEqual(
    unread.filter((one) => !missed.has(one)),
    [],
    'The API answers with this field and nothing under ' +
      `${WALKED.join('/')} reads it, so it cannot reach a screen: the type ` +
      'says it is there, the build is green, the story has a fixture that ' +
      'fills it in, and it is empty only on the real thing. Read it, or put ' +
      'it in NOT_READ_ON_PURPOSE with the reason it is not wanted.',
  )
})

test('the tree still holds answers this test can recognise', async () => {
  const { asked, roots, fields, read } = await theReading()

  assert.ok(
    asked.length > 50,
    `only ${asked.length} routes were seen being asked for, so this test is ` +
      'looking at almost nothing and would pass over an answer that is ' +
      'thrown away whole',
  )

  assert.ok(
    roots.length > 40,
    `only ${roots.length} response types were resolved out of the generated ` +
      'client, so this test recognises almost nothing',
  )

  assert.ok(
    fields > 400,
    `only ${fields} fields were walked out of those answers, so this test is ` +
      'reading almost none of what the API sends',
  )

  assert.ok(
    read > 300,
    `only ${read} fields of the generated client were seen being read, so ` +
      'this test is resolving almost nothing and would call a field unread ' +
      'that the screen has all along',
  )
})

test('every field this test lets through is still one it would otherwise catch', async () => {
  const { unread } = await theReading()

  const held = new Set(unread)

  assert.deepEqual(
    NOT_READ_ON_PURPOSE.flatMap((one) =>
      one.fields
        .filter((field) => !held.has(field))
        .map((field) => `${field} — ${one.because}`),
    ),
    [],
    'A field named here is read after all, or is no longer part of an answer ' +
      'this repository asks for, so the exception stands for nothing and ' +
      'would go on letting through whatever later takes that name. Take it ' +
      'off the list.',
  )
})
