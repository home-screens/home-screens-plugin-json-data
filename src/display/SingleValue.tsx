import React from 'react';
import type { ResolvedField, ModuleStyle } from './DisplayRouter';

interface SingleValueProps {
  fields: ResolvedField[];
  style: ModuleStyle;
}

/** Scale the value font to fit — large for short values, smaller for long ones */
function valueScale(text: string): number {
  const len = text.length;
  if (len <= 4) return 3;
  if (len <= 8) return 2.4;
  if (len <= 14) return 1.8;
  if (len <= 24) return 1.3;
  return 1;
}

export default function SingleValue({ fields, style }: SingleValueProps) {
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
        Configure a field to display
      </div>
    );
  }

  const { field, formattedValue, ruleStyles } = fields[0];
  const displayValue = ruleStyles.replacedValue ?? formattedValue;

  const scale = valueScale(displayValue);
  const valueFontSize = style.fontSize * scale;
  const labelFontSize = valueFontSize * 0.65;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        color: style.textColor,
        fontFamily: style.fontFamily,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {field.label && (
        <div
          style={{
            fontSize: labelFontSize,
            opacity: 0.6,
            fontWeight: 400,
            letterSpacing: '0.02em',
            marginBottom: 6,
          }}
        >
          {field.label}
        </div>
      )}
      <div
        style={{
          fontSize: valueFontSize,
          fontWeight: 700,
          lineHeight: 1.15,
          color: ruleStyles.color || style.textColor,
          wordBreak: 'break-word',
          maxWidth: '100%',
          ...(ruleStyles.backgroundColor
            ? {
                backgroundColor: ruleStyles.backgroundColor,
                borderRadius: 8,
                padding: '4px 16px',
              }
            : {}),
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}
