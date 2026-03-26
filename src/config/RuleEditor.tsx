import React, { useState } from 'react';
import type { ConditionalRule, RuleCondition } from '../types';
import { makeRule } from '../types';

interface RuleEditorProps {
  rules: ConditionalRule[];
  onChange: (rules: ConditionalRule[]) => void;
}

const CONDITIONS: { value: RuleCondition; label: string }[] = [
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
];

const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label]),
);

function summarizeAction(rule: ConditionalRule): string {
  const parts: string[] = [];
  if (rule.textColor) parts.push('color');
  if (rule.backgroundColor) parts.push('bg');
  if (rule.replaceValue) parts.push(`"${rule.replaceValue}"`);
  return parts.length > 0 ? parts.join(', ') : 'no action';
}

export default function RuleEditor({ rules, onChange }: RuleEditorProps) {
  const { ColorPicker, NESTED_INPUT_CLASS } = window.__HS_SDK__;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateRule = (id: string, updates: Partial<ConditionalRule>) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addRule = () => {
    const rule = makeRule();
    onChange([...rules, rule]);
    setExpandedId(rule.id);
  };

  if (rules.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 11, color: '#737373', marginBottom: 8 }}>
          Add rules to change colors or values based on conditions
        </div>
        <button
          onClick={addRule}
          style={{
            width: '100%',
            padding: '6px 0',
            background: 'transparent',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: '#a3a3a3',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          + Add Rule
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rules.map((rule) => {
        const isExpanded = expandedId === rule.id;

        return (
          <div
            key={rule.id}
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {/* Collapsed header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                cursor: 'pointer',
                background: isExpanded
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
              }}
              onClick={() => setExpandedId(isExpanded ? null : rule.id)}
            >
              <span style={{ fontSize: 11, color: '#e5e5e5' }}>
                IF {CONDITION_LABELS[rule.condition] || rule.condition}{' '}
                <span style={{ color: '#93c5fd' }}>{rule.value || '?'}</span>{' '}
                THEN {summarizeAction(rule)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRule(rule.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a3a3a3',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '0 4px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div
                style={{
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Condition + Value row */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
                      Condition
                    </div>
                    <select
                      className={NESTED_INPUT_CLASS}
                      value={rule.condition}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          condition: e.target.value as RuleCondition,
                        })
                      }
                      style={{ width: '100%' }}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
                      Value
                    </div>
                    <input
                      className={NESTED_INPUT_CLASS}
                      value={rule.value}
                      onChange={(e) =>
                        updateRule(rule.id, { value: e.target.value })
                      }
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Colors */}
                <ColorPicker
                  label="Text Color"
                  value={rule.textColor}
                  onChange={(v: string) =>
                    updateRule(rule.id, { textColor: v })
                  }
                />
                <ColorPicker
                  label="Background Color"
                  value={rule.backgroundColor}
                  onChange={(v: string) =>
                    updateRule(rule.id, { backgroundColor: v })
                  }
                />

                {/* Replace Value */}
                <div>
                  <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
                    Replace Value (optional)
                  </div>
                  <input
                    className={NESTED_INPUT_CLASS}
                    value={rule.replaceValue}
                    onChange={(e) =>
                      updateRule(rule.id, { replaceValue: e.target.value })
                    }
                    placeholder="Override displayed text"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addRule}
        style={{
          width: '100%',
          padding: '6px 0',
          background: 'transparent',
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: 6,
          color: '#a3a3a3',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        + Add Rule
      </button>
    </div>
  );
}
