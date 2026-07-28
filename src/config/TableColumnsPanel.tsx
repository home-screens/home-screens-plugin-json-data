import React, { useState, useMemo } from 'react';
import type {
  JsonDataConfig,
  TableColumn,
  FormatType,
} from '../types';
import { makeColumn, DEFAULT_FORMAT } from '../types';
import { resolvePath } from '../lib/resolve-path';
import { formatValue } from '../lib/format';
import RuleEditor from './RuleEditor';

interface TableColumnsPanelProps {
  config: JsonDataConfig;
  onChange: (updates: Partial<JsonDataConfig>) => void;
  previewData?: unknown;
  timezone?: string;
}

// ─── Detect available fields from the array data ─────────────────────────────

interface DetectedField {
  key: string;
  sampleValue: unknown;
  type: string; // 'string' | 'number' | 'boolean' | 'object' | 'null'
}

function detectFields(data: unknown, rootPath: string): DetectedField[] {
  if (!data) return [];
  const arr = rootPath ? resolvePath(data, rootPath) : data;
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const first = arr[0];
  if (typeof first !== 'object' || first === null) return [];

  return Object.keys(first as Record<string, unknown>).map((key) => {
    const val = (first as Record<string, unknown>)[key];
    // Annotated as the wider `string` the field actually holds: `typeof val`
    // narrows to the typeof-operator union, which has no 'null' member, so
    // the assignment below is rejected without it.
    let type: string = typeof val;
    if (val === null || val === undefined) type = 'null';
    if (Array.isArray(val)) type = 'object';
    return { key, sampleValue: val, type };
  });
}

function detectArrays(data: unknown, prefix = '', depth = 0): Array<{ path: string; length: number }> {
  const results: Array<{ path: string; length: number }> = [];
  if (depth > 4 || data === null || data === undefined) return results;
  if (Array.isArray(data)) {
    results.push({ path: prefix, length: data.length });
    return results; // don't recurse into arrays
  }
  if (typeof data === 'object') {
    for (const key of Object.keys(data as Record<string, unknown>)) {
      const childPath = prefix ? `${prefix}.${key}` : key;
      results.push(...detectArrays((data as Record<string, unknown>)[key], childPath, depth + 1));
    }
  }
  return results;
}

// ─── Format type options ─────────────────────────────────────────────────────

const FORMAT_TYPES: { value: FormatType; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'string', label: 'String' },
  { value: 'boolean', label: 'Boolean' },
];

const ALIGNS = [
  { value: 'left' as const, label: 'L' },
  { value: 'center' as const, label: 'C' },
  { value: 'right' as const, label: 'R' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function TableColumnsPanel({
  config,
  onChange,
  previewData,
  timezone,
}: TableColumnsPanelProps) {
  const { NESTED_INPUT_CLASS } = window.__HS_SDK__;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const columns = config.tableColumns || [];
  const enabledPaths = useMemo(() => new Set(columns.map((c) => c.path)), [columns]);

  // Detect arrays in the response
  const availableArrays = useMemo(
    () => (previewData ? detectArrays(previewData) : []),
    [previewData],
  );

  // If top-level is an array, path is ''
  const isTopLevelArray = Array.isArray(previewData);

  // Detect fields from the selected array
  const detectedFields = useMemo(
    () => (previewData ? detectFields(previewData, config.tableRootPath) : []),
    [previewData, config.tableRootPath],
  );

  // Resolve the array for item count
  const resolvedArray = useMemo(() => {
    if (!previewData) return null;
    const arr = config.tableRootPath ? resolvePath(previewData, config.tableRootPath) : previewData;
    return Array.isArray(arr) ? arr : null;
  }, [previewData, config.tableRootPath]);

  const toggleColumn = (key: string) => {
    if (enabledPaths.has(key)) {
      // Remove
      onChange({ tableColumns: columns.filter((c) => c.path !== key) });
    } else {
      // Add with auto label
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      onChange({ tableColumns: [...columns, makeColumn({ path: key, label })] });
    }
  };

  const updateColumn = (path: string, updates: Partial<TableColumn>) => {
    onChange({
      tableColumns: columns.map((c) => (c.path === path ? { ...c, ...updates } : c)),
    });
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ tableColumns: next });
  };

  const selectAllScalar = () => {
    const scalarFields = detectedFields
      .filter((f) => f.type !== 'object')
      .map((f) => {
        const existing = columns.find((c) => c.path === f.key);
        if (existing) return existing;
        const label = f.key.charAt(0).toUpperCase() + f.key.slice(1).replace(/([A-Z])/g, ' $1');
        return makeColumn({ path: f.key, label });
      });
    onChange({ tableColumns: scalarFields });
  };

  const clearAll = () => {
    onChange({ tableColumns: [] });
  };

  // ─── No data state ──────────────────────────────────────────────────────
  if (!previewData) {
    return (
      <div style={{ color: '#737373', fontSize: 12, padding: '12px 0' }}>
        Fetch data in the Data Source tab first, then select columns here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Array selector */}
      {!isTopLevelArray && availableArrays.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 6, fontWeight: 600 }}>
            Select data array
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {availableArrays.map((arr) => {
              const isSelected = config.tableRootPath === arr.path;
              return (
                <button
                  key={arr.path}
                  onClick={() => {
                    // When switching arrays, auto-detect new columns
                    const newFields = detectFields(previewData, arr.path);
                    const autoCols = newFields
                      .filter((f) => f.type !== 'object')
                      .slice(0, 8)
                      .map((f) => {
                        const label = f.key.charAt(0).toUpperCase() + f.key.slice(1).replace(/([A-Z])/g, ' $1');
                        return makeColumn({ path: f.key, label });
                      });
                    onChange({ tableRootPath: arr.path, tableColumns: autoCols });
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: isSelected ? '#93c5fd' : '#e5e5e5',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    textAlign: 'left',
                  }}
                >
                  <span>{arr.path || '(root)'}</span>
                  <span style={{ fontSize: 10, color: '#737373' }}>
                    {arr.length} items
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top-level array auto-detection */}
      {isTopLevelArray && !config.tableRootPath && (
        <div style={{ fontSize: 11, color: '#86efac' }}>
          Response is an array of {(previewData as unknown[]).length} items
        </div>
      )}

      {/* Column checklist */}
      {detectedFields.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, color: '#a3a3a3', fontWeight: 600 }}>
              Columns ({columns.length} selected)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={selectAllScalar}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Select all
              </button>
              <button
                onClick={clearAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#737373',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Available fields as toggleable rows */}
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {detectedFields.map((field, i) => {
              const isEnabled = enabledPaths.has(field.key);
              const col = columns.find((c) => c.path === field.key);
              const isExpanded = expandedKey === field.key && isEnabled;
              const colFormat = col ? { ...DEFAULT_FORMAT, ...col.format } : DEFAULT_FORMAT;
              const isObject = field.type === 'object';
              const enabledIndex = columns.findIndex((c) => c.path === field.key);

              return (
                <div
                  key={field.key}
                  style={{
                    borderBottom: i < detectedFields.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  {/* Toggle row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 10px',
                      gap: 8,
                      background: isEnabled ? 'rgba(59,130,246,0.04)' : 'transparent',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      disabled={isObject}
                      onChange={() => toggleColumn(field.key)}
                      style={{
                        accentColor: '#3b82f6',
                        cursor: isObject ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                      }}
                    />

                    {/* Field key */}
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: isObject ? '#525252' : isEnabled ? '#e5e5e5' : '#a3a3a3',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.key}
                    </span>

                    {/* Sample value */}
                    <span
                      style={{
                        fontSize: 10,
                        color: '#525252',
                        fontFamily: 'monospace',
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {isObject
                        ? (Array.isArray(field.sampleValue) ? 'array' : 'object')
                        : String(field.sampleValue ?? 'null').slice(0, 20)}
                    </span>

                    {/* Reorder + settings (only when enabled) */}
                    {isEnabled && (
                      <>
                        <button
                          onClick={() => moveColumn(enabledIndex, -1)}
                          disabled={enabledIndex === 0}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: enabledIndex === 0 ? '#303030' : '#737373',
                            cursor: enabledIndex === 0 ? 'default' : 'pointer',
                            fontSize: 10,
                            padding: '0 2px',
                          }}
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveColumn(enabledIndex, 1)}
                          disabled={enabledIndex === columns.length - 1}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: enabledIndex === columns.length - 1 ? '#303030' : '#737373',
                            cursor: enabledIndex === columns.length - 1 ? 'default' : 'pointer',
                            fontSize: 10,
                            padding: '0 2px',
                          }}
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => setExpandedKey(isExpanded ? null : field.key)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isExpanded ? '#3b82f6' : '#737373',
                            cursor: 'pointer',
                            fontSize: 11,
                            padding: '0 4px',
                          }}
                        >
                          ⚙
                        </button>
                      </>
                    )}
                  </div>

                  {/* Expanded settings */}
                  {isExpanded && col && (
                    <div
                      style={{
                        padding: '8px 10px 10px 34px', // indent past checkbox
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {/* Label */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Label</span>
                        <input
                          className={NESTED_INPUT_CLASS}
                          value={col.label}
                          onChange={(e) => updateColumn(col.path, { label: e.target.value })}
                          placeholder={field.key}
                          style={{ flex: 1 }}
                        />
                      </div>

                      {/* Align */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Align</span>
                        <div style={{ display: 'flex', gap: 0 }}>
                          {ALIGNS.map((a, ai) => {
                            const active = col.align === a.value;
                            return (
                              <button
                                key={a.value}
                                onClick={() => updateColumn(col.path, { align: a.value })}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  background: active ? '#3b82f6' : 'transparent',
                                  color: active ? '#ffffff' : '#737373',
                                  cursor: 'pointer',
                                  borderRadius: ai === 0 ? '5px 0 0 5px' : ai === 2 ? '0 5px 5px 0' : '0',
                                  borderLeft: ai > 0 ? 'none' : undefined,
                                }}
                              >
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Format */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Format</span>
                        <select
                          className={NESTED_INPUT_CLASS}
                          value={colFormat.type}
                          onChange={(e) =>
                            updateColumn(col.path, {
                              format: { ...colFormat, type: e.target.value as FormatType },
                            })
                          }
                          style={{ flex: 1 }}
                        >
                          {FORMAT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Format-specific: prefix/suffix for number */}
                      {colFormat.type === 'number' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ width: 50, flexShrink: 0 }} />
                          <input
                            className={NESTED_INPUT_CLASS}
                            value={colFormat.prefix}
                            onChange={(e) =>
                              updateColumn(col.path, { format: { ...colFormat, prefix: e.target.value } })
                            }
                            placeholder="Prefix ($)"
                            style={{ flex: 1 }}
                          />
                          <input
                            className={NESTED_INPUT_CLASS}
                            value={colFormat.suffix}
                            onChange={(e) =>
                              updateColumn(col.path, { format: { ...colFormat, suffix: e.target.value } })
                            }
                            placeholder="Suffix (%)"
                            style={{ flex: 1 }}
                          />
                        </div>
                      )}

                      {/* Preview value from first row */}
                      {resolvedArray && resolvedArray.length > 0 && (
                        (() => {
                          const raw = resolvePath(resolvedArray[0], col.path);
                          if (raw === undefined) return null;
                          const preview = formatValue(raw, colFormat, timezone);
                          return (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Preview</span>
                              <span style={{ fontSize: 12, color: '#86efac' }}>{preview}</span>
                            </div>
                          );
                        })()
                      )}

                      {/* Rules */}
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 11, color: '#737373', marginBottom: 4 }}>
                          Conditional Rules
                        </div>
                        <RuleEditor
                          rules={col.rules}
                          onChange={(rules) => updateColumn(col.path, { rules })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No fields detected */}
      {detectedFields.length === 0 && config.tableRootPath && (
        <div style={{ color: '#737373', fontSize: 12 }}>
          No fields found at path "{config.tableRootPath}". Check that it points to an array of objects.
        </div>
      )}

      {/* Manual root path for advanced use */}
      {!isTopLevelArray && availableArrays.length === 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
            Array Path (manual)
          </div>
          <input
            className={NESTED_INPUT_CLASS}
            value={config.tableRootPath}
            onChange={(e) => onChange({ tableRootPath: e.target.value })}
            placeholder="data.items"
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 10, color: '#525252', marginTop: 4 }}>
            Path to a JSON array. Fetch data first for auto-detection.
          </div>
        </div>
      )}
    </div>
  );
}
