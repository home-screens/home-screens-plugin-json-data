import React, { useState, useMemo } from 'react';
import type { FieldConfig, FormatType } from '../types';
import { makeField, DEFAULT_FORMAT } from '../types';
import { resolvePath } from '../lib/resolve-path';
import { formatValue } from '../lib/format';
import RuleEditor from './RuleEditor';

interface FieldListProps {
  fields: FieldConfig[];
  onChange: (fields: FieldConfig[]) => void;
  previewData?: unknown;
  timezone?: string;
}

// ─── Detect top-level leaf paths from data ───────────────────────────────────

interface DetectedField {
  path: string;
  sampleValue: unknown;
  type: string;
}

function detectLeafFields(data: unknown): DetectedField[] {
  if (data === null || data === undefined) return [];
  // For arrays, look at the first element
  const obj = Array.isArray(data) ? data[0] : data;
  if (typeof obj !== 'object' || obj === null) return [];

  const results: DetectedField[] = [];
  collectLeaves(obj as Record<string, unknown>, '', results, 0);
  return results;
}

function collectLeaves(
  obj: Record<string, unknown>,
  prefix: string,
  out: DetectedField[],
  depth: number,
) {
  if (depth > 3) return;
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val === null || val === undefined || typeof val !== 'object') {
      out.push({ path, sampleValue: val, type: val == null ? 'null' : typeof val });
    } else if (!Array.isArray(val)) {
      // Recurse into objects (not arrays)
      collectLeaves(val as Record<string, unknown>, path, out, depth + 1);
    }
  }
}

// ─── Format options ──────────────────────────────────────────────────────────

const FORMAT_TYPES: { value: FormatType; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'string', label: 'String' },
  { value: 'boolean', label: 'Boolean' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function FieldList({
  fields,
  onChange,
  previewData,
  timezone,
}: FieldListProps) {
  const { NESTED_INPUT_CLASS } = window.__HS_SDK__;
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualPath, setManualPath] = useState('');

  const enabledPaths = useMemo(() => new Set(fields.map((f) => f.path)), [fields]);

  const detectedFields = useMemo(
    () => (previewData ? detectLeafFields(previewData) : []),
    [previewData],
  );

  const toggleField = (path: string) => {
    if (enabledPaths.has(path)) {
      onChange(fields.filter((f) => f.path !== path));
    } else {
      const parts = path.split('.');
      const label = parts[parts.length - 1].charAt(0).toUpperCase() +
        parts[parts.length - 1].slice(1).replace(/([A-Z])/g, ' $1');
      onChange([...fields, makeField({ path, label })]);
    }
  };

  const updateField = (path: string, updates: Partial<FieldConfig>) => {
    onChange(fields.map((f) => (f.path === path ? { ...f, ...updates } : f)));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const selectAll = () => {
    const allFields = detectedFields.map((df) => {
      const existing = fields.find((f) => f.path === df.path);
      if (existing) return existing;
      const parts = df.path.split('.');
      const label = parts[parts.length - 1].charAt(0).toUpperCase() +
        parts[parts.length - 1].slice(1).replace(/([A-Z])/g, ' $1');
      return makeField({ path: df.path, label });
    });
    onChange(allFields);
  };

  const clearAll = () => onChange([]);

  const addManualField = () => {
    if (!manualPath.trim()) return;
    if (enabledPaths.has(manualPath.trim())) return;
    const parts = manualPath.trim().split('.');
    const label = parts[parts.length - 1];
    onChange([...fields, makeField({ path: manualPath.trim(), label })]);
    setManualPath('');
    setShowManualAdd(false);
  };

  // ─── No data state ──────────────────────────────────────────────────────
  if (!previewData) {
    return (
      <div style={{ color: '#737373', fontSize: 12, padding: '12px 0' }}>
        Fetch data in the Data Source tab first, then select fields here.
      </div>
    );
  }

  // ─── No detected fields (e.g. primitive response) ──────────────────────
  if (detectedFields.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: '#737373', fontSize: 12 }}>
          No fields detected. Add fields manually:
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className={NESTED_INPUT_CLASS}
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addManualField()}
            placeholder="data.value"
            style={{ flex: 1 }}
          />
          <button
            onClick={addManualField}
            style={{
              padding: '4px 12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header with actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 11, color: '#a3a3a3', fontWeight: 600 }}>
          Fields ({fields.length} selected)
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={selectAll}
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

      {/* Field checklist */}
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {detectedFields.map((df, i) => {
          const isEnabled = enabledPaths.has(df.path);
          const field = fields.find((f) => f.path === df.path);
          const isExpanded = expandedPath === df.path && isEnabled;
          const fieldFormat = field ? { ...DEFAULT_FORMAT, ...field.format } : DEFAULT_FORMAT;
          const enabledIndex = fields.findIndex((f) => f.path === df.path);

          return (
            <div
              key={df.path}
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
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => toggleField(df.path)}
                  style={{ accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
                />

                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: isEnabled ? '#e5e5e5' : '#a3a3a3',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {df.path}
                </span>

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
                  {String(df.sampleValue ?? 'null').slice(0, 20)}
                </span>

                {isEnabled && (
                  <>
                    <button
                      onClick={() => moveField(enabledIndex, -1)}
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
                      onClick={() => moveField(enabledIndex, 1)}
                      disabled={enabledIndex === fields.length - 1}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: enabledIndex === fields.length - 1 ? '#303030' : '#737373',
                        cursor: enabledIndex === fields.length - 1 ? 'default' : 'pointer',
                        fontSize: 10,
                        padding: '0 2px',
                      }}
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => setExpandedPath(isExpanded ? null : df.path)}
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
              {isExpanded && field && (
                <div
                  style={{
                    padding: '8px 10px 10px 34px',
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
                      value={field.label}
                      onChange={(e) => updateField(field.path, { label: e.target.value })}
                      placeholder={df.path.split('.').pop()}
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* Format */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Format</span>
                    <select
                      className={NESTED_INPUT_CLASS}
                      value={fieldFormat.type}
                      onChange={(e) =>
                        updateField(field.path, {
                          format: { ...fieldFormat, type: e.target.value as FormatType },
                        })
                      }
                      style={{ flex: 1 }}
                    >
                      {FORMAT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prefix/suffix for number and auto */}
                  {(fieldFormat.type === 'number' || fieldFormat.type === 'auto') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 50, flexShrink: 0 }} />
                      <input
                        className={NESTED_INPUT_CLASS}
                        value={fieldFormat.prefix}
                        onChange={(e) =>
                          updateField(field.path, { format: { ...fieldFormat, prefix: e.target.value } })
                        }
                        placeholder="Prefix ($)"
                        style={{ flex: 1 }}
                      />
                      <input
                        className={NESTED_INPUT_CLASS}
                        value={fieldFormat.suffix}
                        onChange={(e) =>
                          updateField(field.path, { format: { ...fieldFormat, suffix: e.target.value } })
                        }
                        placeholder="Suffix (%)"
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}

                  {/* Boolean labels */}
                  {fieldFormat.type === 'boolean' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 50, flexShrink: 0 }} />
                      <input
                        className={NESTED_INPUT_CLASS}
                        value={fieldFormat.trueLabel}
                        onChange={(e) =>
                          updateField(field.path, { format: { ...fieldFormat, trueLabel: e.target.value } })
                        }
                        placeholder="True label"
                        style={{ flex: 1 }}
                      />
                      <input
                        className={NESTED_INPUT_CLASS}
                        value={fieldFormat.falseLabel}
                        onChange={(e) =>
                          updateField(field.path, { format: { ...fieldFormat, falseLabel: e.target.value } })
                        }
                        placeholder="False label"
                        style={{ flex: 1 }}
                      />
                    </div>
                  )}

                  {/* Preview */}
                  {previewData && (
                    (() => {
                      try {
                        const raw = resolvePath(previewData, field.path);
                        if (raw === undefined) return null;
                        const preview = formatValue(raw, fieldFormat, timezone);
                        return (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#737373', width: 50, flexShrink: 0 }}>Preview</span>
                            <span style={{ fontSize: 12, color: '#86efac' }}>{preview}</span>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()
                  )}

                  {/* Rules */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 11, color: '#737373', marginBottom: 4 }}>
                      Conditional Rules
                    </div>
                    <RuleEditor
                      rules={field.rules}
                      onChange={(rules) => updateField(field.path, { rules })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual add for paths not in auto-detected list */}
      {!showManualAdd ? (
        <button
          onClick={() => setShowManualAdd(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#525252',
            fontSize: 10,
            cursor: 'pointer',
            textAlign: 'left',
            padding: '4px 0',
          }}
        >
          + Add custom path
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className={NESTED_INPUT_CLASS}
            value={manualPath}
            onChange={(e) => setManualPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addManualField();
              if (e.key === 'Escape') { setShowManualAdd(false); setManualPath(''); }
            }}
            placeholder="nested.path.to.value"
            style={{ flex: 1 }}
            autoFocus
          />
          <button
            onClick={addManualField}
            style={{
              padding: '4px 12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 11,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Add
          </button>
          <button
            onClick={() => { setShowManualAdd(false); setManualPath(''); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#737373',
              fontSize: 14,
              cursor: 'pointer',
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
