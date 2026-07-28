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
        gap: style.fontSize * 0.5,
        height: '100%',
        overflow: 'auto',
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
              borderRadius: style.fontSize * 0.5,
              padding: style.fontSize * 0.75,
              backgroundColor:
                rf.ruleStyles.backgroundColor || 'rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                fontSize: style.fontSize * 0.7,
                opacity: 0.5,
                marginBottom: style.fontSize * 0.375,
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
