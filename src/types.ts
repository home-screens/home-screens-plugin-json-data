// ─── Plugin Config ────────────────────────────────────────────────────────────

export interface JsonDataConfig {
  // Data source
  url: string;
  method: 'GET' | 'POST';
  customHeaders: CustomHeader[];
  payload: string;
  authType: AuthType;
  authHeaderName: string;
  authQueryParam: string;

  // Display
  displayMode: DisplayMode;
  fields: FieldConfig[];

  // Table-specific
  tableRootPath: string;
  tableColumns: TableColumn[];
  tableRowLimit: number;
  tableAlternateRows: boolean;

  // Card grid
  cardColumns: number;

  // Status board
  statusOrientation: 'horizontal' | 'vertical';

  // Timing
  refreshIntervalMs: number;
  cacheTtlMs: number;
  showStaleIndicator: boolean;
}

export type AuthType = 'none' | 'bearer' | 'api-key-header' | 'api-key-query' | 'basic';
export type DisplayMode = 'single-value' | 'key-value' | 'table' | 'card-grid' | 'status-board';

export interface CustomHeader {
  key: string;
  value: string;
}

// ─── Field Config ────────────────────────────────────────────────────────────

export interface FieldConfig {
  id: string;
  path: string;
  label: string;
  format: FormatConfig;
  rules: ConditionalRule[];
}

export interface FormatConfig {
  type: FormatType;
  // Number
  decimals: number;
  thousandsSeparator: boolean;
  prefix: string;
  suffix: string;
  multiply: number;
  divide: number;
  // Date
  dateStyle: 'short' | 'medium' | 'long';
  timeStyle: '' | 'short' | 'medium' | 'long';
  useHostTimezone: boolean;
  // String
  truncateAt: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Boolean
  trueLabel: string;
  falseLabel: string;
}

export type FormatType = 'auto' | 'number' | 'date' | 'string' | 'boolean';

export interface ConditionalRule {
  id: string;
  condition: RuleCondition;
  value: string;
  textColor: string;
  backgroundColor: string;
  replaceValue: string;
}

export type RuleCondition =
  | 'gt' | 'lt' | 'gte' | 'lte'
  | 'eq' | 'neq'
  | 'contains' | 'startsWith' | 'endsWith';

// ─── Table Column ────────────────────────────────────────────────────────────

export interface TableColumn {
  id: string;
  path: string;
  label: string;
  align: 'left' | 'center' | 'right';
  width: string;
  format: FormatConfig;
  rules: ConditionalRule[];
}

// ─── Runtime State ───────────────────────────────────────────────────────────

export interface RuleStyles {
  color?: string;
  backgroundColor?: string;
  replacedValue?: string;
}

export interface FetchState {
  data: unknown;
  error: string | null;
  lastSuccessAt: number | null;
  loading: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_FORMAT: FormatConfig = {
  type: 'auto',
  decimals: 2,
  thousandsSeparator: false,
  prefix: '',
  suffix: '',
  multiply: 1,
  divide: 1,
  dateStyle: 'medium',
  timeStyle: '',
  useHostTimezone: true,
  truncateAt: 0,
  textTransform: 'none',
  trueLabel: 'Yes',
  falseLabel: 'No',
};

export function makeField(partial?: Partial<FieldConfig>): FieldConfig {
  return {
    id: crypto.randomUUID(),
    path: '',
    label: '',
    format: { ...DEFAULT_FORMAT },
    rules: [],
    ...partial,
  };
}

export function makeColumn(partial?: Partial<TableColumn>): TableColumn {
  return {
    id: crypto.randomUUID(),
    path: '',
    label: '',
    align: 'left',
    width: 'auto',
    format: { ...DEFAULT_FORMAT },
    rules: [],
    ...partial,
  };
}

export function makeRule(partial?: Partial<ConditionalRule>): ConditionalRule {
  return {
    id: crypto.randomUUID(),
    condition: 'eq',
    value: '',
    textColor: '',
    backgroundColor: '',
    replaceValue: '',
    ...partial,
  };
}
