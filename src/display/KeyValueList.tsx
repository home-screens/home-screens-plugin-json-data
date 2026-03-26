import React from 'react';
import type { ResolvedField, ModuleStyle } from './DisplayRouter';

interface KeyValueListProps {
  fields: ResolvedField[];
  style: ModuleStyle;
}

/** Apply alpha to any CSS color (hex or rgb/rgba) */
function colorWithAlpha(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (hex) return `rgba(${parseInt(hex[1], 16)},${parseInt(hex[2], 16)},${parseInt(hex[3], 16)},${alpha})`;
  const rgb = color.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(',').map((s: string) => s.trim());
    if (parts.length >= 3) return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
  }
  return `rgba(255,255,255,${alpha})`;
}

export default function KeyValueList({ fields, style }: KeyValueListProps) {
  if (fields.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: style.textColor,
          opacity: 0.4,
          fontSize: style.fontSize,
          fontFamily: style.fontFamily,
        }}
      >
        Configure fields to display
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'auto',
        maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
        fontFamily: style.fontFamily,
        color: style.textColor,
      }}
    >
      {fields.map((rf, i) => {
        const displayValue = rf.ruleStyles.replacedValue ?? rf.formattedValue;
        const isLast = i === fields.length - 1;

        return (
          <div
            key={rf.field.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.08)',
              ...(rf.ruleStyles.backgroundColor
                ? {
                    backgroundColor: colorWithAlpha(rf.ruleStyles.backgroundColor, 0.15),
                    borderRadius: 4,
                    padding: '8px 6px',
                  }
                : {}),
            }}
          >
            <span
              style={{
                fontSize: style.fontSize * 0.85,
                opacity: 0.7,
                flexShrink: 0,
                marginRight: 12,
              }}
            >
              {rf.field.label || rf.field.path}
            </span>
            <span
              style={{
                fontSize: style.fontSize,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
                color: rf.ruleStyles.color || style.textColor,
              }}
            >
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}
