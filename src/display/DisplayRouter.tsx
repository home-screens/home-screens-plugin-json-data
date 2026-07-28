import React from 'react';
import type {
  JsonDataConfig,
  FieldConfig,
  TableColumn,
  RuleStyles,
} from '../types';
import { resolvePath } from '../lib/resolve-path';
import { formatValue } from '../lib/format';
import { evaluateRules } from '../lib/rules';
import SingleValue from './SingleValue';
import KeyValueList from './KeyValueList';
import TableView from './TableView';
import CardGrid from './CardGrid';
import StatusBoard from './StatusBoard';

// ─── Public types re-exported for child components ──────────────────────────

/** Matches the host's `ModuleStyle` (src/types/config.ts). A field missing
 *  here is a style control this plugin silently ignores, which is exactly how
 *  borderWidth / borderColor / shadowSize went unimplemented. The three are
 *  optional because hosts older than them omit the values.
 *
 *  The root frame reads these through `hostFrameStyle` (../host-style) rather
 *  than by hand, and the style reaching the views below has already been
 *  through `normalizeHostStyle`, so `fontSize` is safe to multiply. Views take
 *  color and their own type scale from these fields but never set
 *  `fontFamily` — it is a registry id here, and only the root knows how to
 *  turn it into a CSS stack. */
export interface ModuleStyle {
  opacity: number;
  borderRadius: number;
  padding: number;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  backdropBlur: number;
  borderWidth?: number;
  borderColor?: string;
  shadowSize?: number;
}

export interface ResolvedField {
  field: FieldConfig;
  rawValue: unknown;
  formattedValue: string;
  ruleStyles: RuleStyles;
}

export interface ResolvedRow {
  cells: Array<{
    column: TableColumn;
    rawValue: unknown;
    formattedValue: string;
    ruleStyles: RuleStyles;
  }>;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DisplayRouterProps {
  data: unknown;
  config: JsonDataConfig;
  style: ModuleStyle;
  timezone?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DisplayRouter({
  data,
  config,
  style,
  timezone,
}: DisplayRouterProps) {
  // ── Table mode ──────────────────────────────────────────────────────────
  if (config.displayMode === 'table') {
    const rootArray = config.tableRootPath
      ? resolvePath(data, config.tableRootPath)
      : data;

    const items = Array.isArray(rootArray) ? rootArray : [];
    const columns = config.tableColumns ?? [];

    const rows: ResolvedRow[] = items.map((item) => ({
      cells: columns.map((col) => {
        const rawValue = resolvePath(item, col.path);
        const formattedValue = formatValue(rawValue, col.format, timezone);
        const ruleStyles = evaluateRules(col.rules, rawValue);
        return { column: col, rawValue, formattedValue, ruleStyles };
      }),
    }));

    return (
      <TableView
        rows={rows}
        columns={columns}
        config={config}
        style={style}
      />
    );
  }

  // ── Field-based modes ───────────────────────────────────────────────────
  const fields: ResolvedField[] = (config.fields ?? []).map((field) => {
    const rawValue = resolvePath(data, field.path);
    const formattedValue = formatValue(rawValue, field.format, timezone);
    const ruleStyles = evaluateRules(field.rules, rawValue);
    return { field, rawValue, formattedValue, ruleStyles };
  });

  switch (config.displayMode) {
    case 'single-value':
      return <SingleValue fields={fields} style={style} />;
    case 'key-value':
      return <KeyValueList fields={fields} style={style} />;
    case 'card-grid':
      return <CardGrid fields={fields} config={config} style={style} />;
    case 'status-board':
      return <StatusBoard fields={fields} config={config} style={style} />;
    default:
      return <SingleValue fields={fields} style={style} />;
  }
}
