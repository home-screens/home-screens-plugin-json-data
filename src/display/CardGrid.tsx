import React from 'react';
import type { ResolvedField, ModuleStyle } from './DisplayRouter';
import type { JsonDataConfig } from '../types';

interface CardGridProps {
  fields: ResolvedField[];
  config: JsonDataConfig;
  style: ModuleStyle;
}

export default function CardGrid({ fields, config, style }: CardGridProps) {
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
        display: 'grid',
        gridTemplateColumns: `repeat(${config.cardColumns}, 1fr)`,
        gap: 8,
        height: '100%',
        overflow: 'auto',
        fontFamily: style.fontFamily,
        color: style.textColor,
        alignContent: 'start',
      }}
    >
      {fields.map((rf) => {
        const displayValue = rf.ruleStyles.replacedValue ?? rf.formattedValue;

        return (
          <div
            key={rf.field.id}
            style={{
              borderRadius: 8,
              padding: 12,
              backgroundColor:
                rf.ruleStyles.backgroundColor || 'rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                fontSize: style.fontSize * 0.7,
                opacity: 0.5,
                marginBottom: 6,
              }}
            >
              {rf.field.label || rf.field.path}
            </div>
            <div
              style={{
                fontSize: style.fontSize * 1.4,
                fontWeight: 600,
                color: rf.ruleStyles.color || style.textColor,
              }}
            >
              {displayValue}
            </div>
          </div>
        );
      })}
    </div>
  );
}
