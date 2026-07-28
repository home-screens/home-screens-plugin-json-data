import React from 'react';
import type { ResolvedField, ModuleStyle } from './DisplayRouter';
import type { JsonDataConfig } from '../types';
import { scalePx } from '../host-style';

interface StatusBoardProps {
  fields: ResolvedField[];
  config: JsonDataConfig;
  style: ModuleStyle;
}

export default function StatusBoard({ fields, config, style }: StatusBoardProps) {
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

  const isHorizontal = config.statusOrientation === 'horizontal';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        flexWrap: isHorizontal ? 'wrap' : 'nowrap',
        gap: scalePx(isHorizontal ? 16 : 12),
        height: '100%',
        overflow: 'auto',
        color: style.textColor,
        alignContent: 'start',
      }}
    >
      {fields.map((rf) => {
        const displayValue = rf.ruleStyles.replacedValue ?? rf.formattedValue;
        const dotColor =
          rf.ruleStyles.backgroundColor ||
          rf.ruleStyles.color ||
          '#6b7280';

        return (
          <div
            key={rf.field.id}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: style.fontSize * 0.5,
            }}
          >
            <div
              style={{
                width: style.fontSize * 0.625,
                height: style.fontSize * 0.625,
                borderRadius: '50%',
                backgroundColor: dotColor,
                flexShrink: 0,
              }}
            />
            {rf.field.label && (
              <span
                style={{
                  fontSize: style.fontSize * 0.8,
                  opacity: 0.6,
                }}
              >
                {rf.field.label}
              </span>
            )}
            <span
              style={{
                fontSize: style.fontSize * 0.9,
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
