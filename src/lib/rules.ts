import type { ConditionalRule, RuleStyles } from '../types';

/**
 * Evaluate conditional rules against a raw value.
 * Returns the styles from the first matching rule, or empty styles if none match.
 */
export function evaluateRules(rules: ConditionalRule[], rawValue: unknown): RuleStyles {
  for (const rule of rules) {
    if (matchesCondition(rawValue, rule.condition, rule.value)) {
      const styles: RuleStyles = {};
      if (rule.textColor) styles.color = rule.textColor;
      if (rule.backgroundColor) styles.backgroundColor = rule.backgroundColor;
      if (rule.replaceValue) styles.replacedValue = rule.replaceValue;
      return styles;
    }
  }
  return {};
}

function matchesCondition(raw: unknown, condition: string, target: string): boolean {
  // Numeric comparisons
  if (['gt', 'lt', 'gte', 'lte'].includes(condition)) {
    const num = Number(raw);
    const tgt = Number(target);
    if (isNaN(num) || isNaN(tgt)) return false;
    switch (condition) {
      case 'gt': return num > tgt;
      case 'lt': return num < tgt;
      case 'gte': return num >= tgt;
      case 'lte': return num <= tgt;
    }
  }

  // String-coerced comparisons
  const str = String(raw ?? '');
  const tgtStr = target;

  switch (condition) {
    case 'eq': {
      if (raw == null || raw === '' || tgtStr === '') return str === tgtStr;
      const nRaw = Number(raw), nTgt = Number(tgtStr);
      if (!isNaN(nRaw) && !isNaN(nTgt)) return nRaw === nTgt;
      return str === tgtStr;
    }
    case 'neq': {
      if (raw == null || raw === '' || tgtStr === '') return str !== tgtStr;
      const nRaw = Number(raw), nTgt = Number(tgtStr);
      if (!isNaN(nRaw) && !isNaN(nTgt)) return nRaw !== nTgt;
      return str !== tgtStr;
    }
    case 'contains':
      return str.toLowerCase().includes(tgtStr.toLowerCase());
    case 'startsWith':
      return str.toLowerCase().startsWith(tgtStr.toLowerCase());
    case 'endsWith':
      return str.toLowerCase().endsWith(tgtStr.toLowerCase());
    default:
      return false;
  }
}
