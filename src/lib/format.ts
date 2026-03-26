import type { FormatConfig } from '../types';

/**
 * Format a raw value according to the given format config.
 * Returns a display-ready string.
 */
export function formatValue(raw: unknown, fmt: FormatConfig, timezone?: string): string {
  if (raw === undefined || raw === null) return '—';

  switch (fmt.type) {
    case 'number':
      return formatNumber(raw, fmt);
    case 'date':
      return formatDate(raw, fmt, timezone);
    case 'string':
      return formatString(raw, fmt);
    case 'boolean':
      return formatBoolean(raw, fmt);
    case 'auto':
    default:
      return formatAuto(raw, fmt, timezone);
  }
}

// ─── Auto Detection ──────────────────────────────────────────────────────────

function formatAuto(raw: unknown, fmt: FormatConfig, timezone?: string): string {
  if (typeof raw === 'boolean') return formatBoolean(raw, fmt);
  if (typeof raw === 'number') return formatNumber(raw, fmt);

  if (typeof raw === 'string') {
    // Try to detect ISO date strings or unix timestamps
    if (looksLikeDate(raw)) return formatDate(raw, fmt, timezone);
    return formatString(raw, fmt);
  }

  // Arrays/objects — stringify compactly
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }

  return String(raw);
}

function looksLikeDate(s: string): boolean {
  // ISO 8601 pattern
  return /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(s);
}

// ─── Number ──────────────────────────────────────────────────────────────────

function formatNumber(raw: unknown, fmt: FormatConfig): string {
  let num = typeof raw === 'number' ? raw : Number(raw);
  if (isNaN(num)) return String(raw);

  // Apply math transforms
  if (fmt.multiply != null && fmt.multiply !== 1) num *= fmt.multiply;
  if (fmt.divide != null && fmt.divide !== 1 && fmt.divide !== 0) num /= fmt.divide;

  // Format
  let formatted: string;
  if (fmt.thousandsSeparator) {
    formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: fmt.decimals,
      maximumFractionDigits: fmt.decimals,
    });
  } else {
    formatted = num.toFixed(fmt.decimals);
  }

  return `${fmt.prefix}${formatted}${fmt.suffix}`;
}

// ─── Date ────────────────────────────────────────────────────────────────────

function formatDate(raw: unknown, fmt: FormatConfig, timezone?: string): string {
  let date: Date;

  if (typeof raw === 'number') {
    // Unix timestamp — detect seconds vs milliseconds
    date = new Date(raw > 1e12 ? raw : raw * 1000);
  } else if (typeof raw === 'string') {
    date = new Date(raw);
  } else {
    return String(raw);
  }

  if (isNaN(date.getTime())) return String(raw);

  const options: Intl.DateTimeFormatOptions = {
    dateStyle: fmt.dateStyle || 'medium',
  };
  if (fmt.timeStyle) {
    options.timeStyle = fmt.timeStyle;
  }
  if (fmt.useHostTimezone && timezone) {
    options.timeZone = timezone;
  }

  try {
    let s = new Intl.DateTimeFormat(undefined, options).format(date);
    if (fmt.prefix || fmt.suffix) s = `${fmt.prefix}${s}${fmt.suffix}`;
    return s;
  } catch {
    return date.toLocaleString();
  }
}

// ─── String ──────────────────────────────────────────────────────────────────

function formatString(raw: unknown, fmt: FormatConfig): string {
  let s = String(raw);

  // Truncate
  if (fmt.truncateAt > 0 && s.length > fmt.truncateAt) {
    s = s.slice(0, fmt.truncateAt) + '…';
  }

  // Transform
  switch (fmt.textTransform) {
    case 'uppercase':
      s = s.toUpperCase();
      break;
    case 'lowercase':
      s = s.toLowerCase();
      break;
    case 'capitalize':
      s = s.charAt(0).toUpperCase() + s.slice(1);
      break;
  }

  if (fmt.prefix || fmt.suffix) {
    s = `${fmt.prefix}${s}${fmt.suffix}`;
  }

  return s;
}

// ─── Boolean ─────────────────────────────────────────────────────────────────

function formatBoolean(raw: unknown, fmt: FormatConfig): string {
  const bool = raw === true || raw === 'true' || raw === 1 || raw === '1';
  let s = bool ? (fmt.trueLabel || 'Yes') : (fmt.falseLabel || 'No');
  if (fmt.prefix || fmt.suffix) s = `${fmt.prefix}${s}${fmt.suffix}`;
  return s;
}
