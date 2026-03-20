import type { MatrixClient } from 'matrix-js-sdk'

export type PushRuleKind = 'override' | 'underride' | 'sender' | 'room' | 'content'

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

  for (const kind of ['override', 'underride'] as const) {
    const rules = (globalRules as any)[kind] ?? []
    for (const rule of rules) {
      const mapped: PushRule = {
        ruleId: rule.rule_id,
        kind,
        enabled: rule.enabled ?? true,
        default: rule.default ?? false,
        conditions: rule.conditions,
        actions: rule.actions ?? [],
      }

      if (rule.rule_id.startsWith('.m.'))
        special.push(mapped)
      else
        global.push(mapped)
    }
  }

  const contentRules = (globalRules as any).content ?? []
  for (const rule of contentRules) {
    keyword.push({
      ruleId: rule.rule_id,
      kind: 'content',
      enabled: rule.enabled ?? true,
      default: rule.default ?? false,
      pattern: rule.pattern,
      actions: rule.actions ?? [],
    })
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
  await client.setPushRuleEnabled('global', kind as any, ruleId, enabled)
}

/**
 * Add a keyword push rule.
 */
export async function addKeywordRule(
  client: MatrixClient,
  keyword: string,
): Promise<void> {
  await client.addPushRule('global', 'content' as any, keyword, {
    actions: ['notify', { set_tweak: 'highlight' }],
    pattern: keyword,
  } as any)
}

/**
 * Remove a keyword push rule.
 */
export async function removeKeywordRule(
  client: MatrixClient,
  ruleId: string,
): Promise<void> {
  await client.deletePushRule('global', 'content' as any, ruleId)
}
