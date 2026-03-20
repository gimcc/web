import type { IPushRule, MatrixClient } from 'matrix-js-sdk'
import { PushRuleActionName, PushRuleKind as SdkPushRuleKind, TweakName } from 'matrix-js-sdk'

export type PushRuleKind = 'override' | 'underride' | 'sender' | 'room' | 'content'

const KIND_MAP: Record<PushRuleKind, SdkPushRuleKind> = {
  override: SdkPushRuleKind.Override,
  underride: SdkPushRuleKind.Underride,
  sender: SdkPushRuleKind.SenderSpecific,
  room: SdkPushRuleKind.RoomSpecific,
  content: SdkPushRuleKind.ContentSpecific,
}

const REVERSE_KIND_MAP = new Map<SdkPushRuleKind, PushRuleKind>(
  Object.entries(KIND_MAP).map(([k, v]) => [v, k as PushRuleKind]),
)

export interface PushRule {
  ruleId: string
  kind: PushRuleKind
  enabled: boolean
  default: boolean
  pattern?: string
  conditions?: Array<Record<string, unknown>>
  actions: Array<string | Record<string, unknown>>
}

export interface PushRulesSet {
  global: PushRule[]
  keyword: PushRule[]
  special: PushRule[]
}

function mapRule(rule: IPushRule, sdkKind: SdkPushRuleKind): PushRule {
  return {
    ruleId: rule.rule_id,
    kind: REVERSE_KIND_MAP.get(sdkKind) ?? 'override',
    enabled: rule.enabled ?? true,
    default: rule.default ?? false,
    pattern: rule.pattern,
    conditions: rule.conditions as Array<Record<string, unknown>> | undefined,
    actions: rule.actions as Array<string | Record<string, unknown>>,
  }
}

/**
 * Get all push rules organized by category.
 */
export async function getPushRules(client: MatrixClient): Promise<PushRulesSet> {
  const rawRules = await client.getPushRules()
  const global: PushRule[] = []
  const keyword: PushRule[] = []
  const special: PushRule[] = []

  const globalRules = rawRules?.global
  if (!globalRules)
    return { global, keyword, special }

  for (const sdkKind of [SdkPushRuleKind.Override, SdkPushRuleKind.Underride] as const) {
    const rules: IPushRule[] = globalRules[sdkKind] ?? []
    for (const rule of rules) {
      const mapped = mapRule(rule, sdkKind)
      if (rule.rule_id.startsWith('.m.'))
        special.push(mapped)
      else
        global.push(mapped)
    }
  }

  const contentRules: IPushRule[] = globalRules[SdkPushRuleKind.ContentSpecific] ?? []
  for (const rule of contentRules) {
    keyword.push(mapRule(rule, SdkPushRuleKind.ContentSpecific))
  }

  return { global, keyword, special }
}

/**
 * Toggle a push rule on or off.
 */
export async function togglePushRule(
  client: MatrixClient,
  kind: PushRuleKind,
  ruleId: string,
  enabled: boolean,
): Promise<void> {
  await client.setPushRuleEnabled('global', KIND_MAP[kind], ruleId, enabled)
}

/**
 * Add a keyword push rule.
 */
export async function addKeywordRule(
  client: MatrixClient,
  keyword: string,
): Promise<void> {
  await client.addPushRule('global', SdkPushRuleKind.ContentSpecific, keyword, {
    actions: [PushRuleActionName.Notify, { set_tweak: TweakName.Highlight }],
    pattern: keyword,
  })
}

/**
 * Remove a keyword push rule.
 */
export async function removeKeywordRule(
  client: MatrixClient,
  ruleId: string,
): Promise<void> {
  await client.deletePushRule('global', SdkPushRuleKind.ContentSpecific, ruleId)
}
