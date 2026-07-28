import React from 'react';
import type { ResolvedRow, ModuleStyle } from './DisplayRouter';
import type { JsonDataConfig, TableColumn } from '../types';
import { frameBackgroundColor, scalePx } from '../host-style';

interface TableViewProps {
  rows: ResolvedRow[];
  columns: TableColumn[];
  config: JsonDataConfig;
  style: ModuleStyle;
}

/** Column widths are free-form CSS. A bare number or a px value was authored
 *  against the default text size and has to follow the Text size slider; a
 *  percentage or `em` already does, and `auto` means don't ask. */
function columnWidth(width: string): string | undefined {
  const value = width?.trim();
  if (!value || value === 'auto') return undefined;
  const px = /^(\d+(?:\.\d+)?)(?:px)?$/i.exec(value);
  return px ? scalePx(Number(px[1])) : value;
}

export default function TableView({ rows, columns, config, style }: TableViewProps) {
  if (columns.length === 0) {
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
        Configure columns to display
      </div>
    );
  }

  const truncated =
    config.tableRowLimit > 0 && rows.length > config.tableRowLimit;
  const displayRows = truncated
    ? rows.slice(0, config.tableRowLimit)
    : rows;
  const remaining = rows.length - config.tableRowLimit;
  // The sticky header paints over the rows scrolling under it, which means it
  // paints over the frame too — so it has to use the background the frame
  // actually drew, not the raw configured color.
  const headerBackground = frameBackgroundColor(style);

  return (
    <div
      style={{
        height: '100%',
        overflow: 'auto',
        color: style.textColor,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={{
                  position: 'sticky',
                  top: 0,
                  fontSize: style.fontSize * 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.5,
                  fontWeight: 600,
                  textAlign: col.align,
                  padding: `${style.fontSize * 0.375}px ${style.fontSize * 0.5}px`,
                  borderBottom: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: headerBackground || 'inherit',
                  width: columnWidth(col.width),
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label || col.path}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                backgroundColor:
                  config.tableAlternateRows && rowIdx % 2 === 0
                    ? 'rgba(255,255,255,0.03)'
                    : 'transparent',
              }}
            >
              {row.cells.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  style={{
                    fontSize: style.fontSize,
                    textAlign: cell.column.align,
                    padding: `${style.fontSize * 0.375}px ${style.fontSize * 0.5}px`,
                    fontVariantNumeric: 'tabular-nums',
                    color: cell.ruleStyles.color || style.textColor,
                    backgroundColor:
                      cell.ruleStyles.backgroundColor || 'transparent',
                  }}
                >
                  {cell.ruleStyles.replacedValue ?? cell.formattedValue}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <div
          style={{
            textAlign: 'center',
            fontSize: style.fontSize * 0.75,
            opacity: 0.4,
            padding: `${style.fontSize * 0.5}px 0`,
          }}
        >
          +{remaining} more
        </div>
      )}
    </div>
  );
}
