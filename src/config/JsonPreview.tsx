import React from 'react';
import { flattenPaths } from '../lib/resolve-path';

interface JsonPreviewProps {
  data: unknown;
  onSelectPath: (path: string) => void;
  onSelectArrayPath?: (path: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  string: '#86efac',
  number: '#93c5fd',
  boolean: '#fde047',
  null: '#737373',
  array: '#c4b5fd',
  object: '#a3a3a3',
};

function truncate(value: unknown, max: number): string {
  const str = typeof value === 'string' ? value : String(value ?? 'null');
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export default function JsonPreview({
  data,
  onSelectPath,
  onSelectArrayPath,
}: JsonPreviewProps) {
  const entries = flattenPaths(data);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          fontSize: 11,
          color: '#737373',
          marginBottom: 6,
          fontStyle: 'italic',
        }}
      >
        Click a value to add as field
      </div>
      <div
        style={{
          maxHeight: 300,
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {entries.map((entry, i) => {
          const isArray = entry.type === 'array';
          const isObject = entry.type === 'object';
          const isLeaf = !isArray && !isObject;
          const isClickable = isLeaf || (isArray && onSelectArrayPath);
          const color = TYPE_COLORS[entry.type] || '#e5e5e5';

          return (
            <div
              key={i}
              onClick={() => {
                if (isLeaf) {
                  onSelectPath(entry.path);
                } else if (isArray && onSelectArrayPath) {
                  onSelectArrayPath(entry.path);
                }
              }}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                borderBottom:
                  i < entries.length - 1
                    ? '1px solid rgba(255,255,255,0.04)'
                    : 'none',
                cursor: isClickable ? 'pointer' : 'default',
                background: 'transparent',
                transition: 'background 0.1s',
                ...(isClickable
                  ? {}
                  : { opacity: 0.6 }),
              }}
              onMouseEnter={(e) => {
                if (isClickable) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background =
                  'transparent';
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#e5e5e5',
                  flexShrink: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: 12,
                }}
              >
                {entry.path || '(root)'}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color,
                  flexShrink: 0,
                  textAlign: 'right',
                  maxWidth: '50%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {truncate(entry.value, 40)}
              </span>
            </div>
          );
        })}
        {entries.length === 0 && (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: 12,
              color: '#737373',
            }}
          >
            No data to display
          </div>
        )}
      </div>
    </div>
  );
}
