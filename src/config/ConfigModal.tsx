import React, { useState, useCallback, useEffect } from 'react';
import type { JsonDataConfig, FieldConfig, DisplayMode } from '../types';
import { makeField, makeColumn } from '../types';
import { resolvePath } from '../lib/resolve-path';
import DisplayRouter from '../display/DisplayRouter';
import { hostFrameStyle, normalizeHostStyle } from '../host-style';
import DataSourcePanel from './DataSourcePanel';
import JsonPreview from './JsonPreview';
import FieldList from './FieldList';
import TableColumnsPanel from './TableColumnsPanel';

interface ConfigModalProps {
  config: JsonDataConfig;
  style: {
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    borderRadius: number;
    padding: number;
    opacity: number;
    backdropBlur: number;
  };
  onChange: (updates: Partial<JsonDataConfig>) => void;
  onClose: () => void;
}

type Tab = 'source' | 'fields';

const DISPLAY_MODES: { value: DisplayMode; label: string; short: string }[] = [
  { value: 'single-value', label: 'Single Value', short: 'Single' },
  { value: 'key-value', label: 'Key-Value List', short: 'List' },
  { value: 'table', label: 'Table', short: 'Table' },
  { value: 'card-grid', label: 'Card Grid', short: 'Cards' },
  { value: 'status-board', label: 'Status Board', short: 'Status' },
];

export default function ConfigModal({ config, style, onChange, onClose }: ConfigModalProps) {
  const [previewData, setPreviewData] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>('source');

  // A module with no background configured would preview as a hole in the
  // modal, so give the preview alone something to sit on.
  const previewStyle = normalizeHostStyle({
    ...style,
    backgroundColor: style.backgroundColor || 'rgba(0, 0, 0, 0.3)',
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePreview = useCallback((data: unknown) => {
    setPreviewData(data);
  }, []);

  const handleSelectPath = useCallback(
    (path: string) => {
      const existingFields: FieldConfig[] = config.fields || [];
      if (existingFields.some((f) => f.path === path)) return;
      const label = path.split('.').pop() || path;
      const field = makeField({ path, label });
      onChange({ fields: [...existingFields, field] });
    },
    [config.fields, onChange],
  );

  const handleSelectArrayPath = useCallback(
    (path: string) => {
      // Auto-generate columns from the first array element's keys
      let autoColumns = config.tableColumns || [];
      if (autoColumns.length === 0 && previewData) {
        try {
          const arr = resolvePath(previewData, path);
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
            const keys = Object.keys(arr[0] as Record<string, unknown>);
            // Take up to 6 top-level keys, skip objects/arrays
            autoColumns = keys
              .filter((k) => {
                const val = (arr[0] as Record<string, unknown>)[k];
                return typeof val !== 'object' || val === null;
              })
              .slice(0, 6)
              .map((k) => makeColumn({ path: k, label: k }));
          }
        } catch {
          // ignore
        }
      }
      onChange({
        tableRootPath: path,
        displayMode: 'table' as DisplayMode,
        ...(autoColumns.length > 0 ? { tableColumns: autoColumns } : {}),
      });
      setTab('fields');
    },
    [onChange, previewData, config.tableColumns],
  );

  const isTable = config.displayMode === 'table';
  const fieldCount = isTable
    ? (config.tableColumns || []).length
    : (config.fields || []).length;
  const hasData = previewData !== null;
  const hasFields = fieldCount > 0;

  const timezone = window.__HS_SDK__.getHostSettings().timezone;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          background: '#171717',
          border: '1px solid #404040',
          borderRadius: 12,
          width: '100%',
          maxWidth: 1100,
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid #404040',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: '#737373', fontFamily: 'monospace' }}>{'{ }'}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f5' }}>
              JSON Data Block
            </span>
            <span style={{ fontSize: 11, color: '#737373' }}>
              {fieldCount} {isTable ? 'columns' : 'fields'}
              {config.url ? ` · ${abbreviateUrl(config.url)}` : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a3a3a3',
              fontSize: 18,
              cursor: 'pointer',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ×
          </button>
        </div>

        {/* Body — two columns: config left, preview right */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {/* Left: Config panels */}
          <div
            style={{
              width: hasData ? '55%' : '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRight: hasData ? '1px solid #303030' : 'none',
              transition: 'width 0.2s',
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #303030',
                flexShrink: 0,
              }}
            >
              {([
                { id: 'source' as Tab, label: 'Data Source' },
                { id: 'fields' as Tab, label: isTable ? 'Table Columns' : 'Fields & Rules' },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '9px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    color: tab === t.id ? '#f5f5f5' : '#737373',
                    background: tab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: 'none',
                    borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin' as const }}>
              {tab === 'source' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Data source config */}
                  <div style={{ padding: 20, flexShrink: 0 }}>
                    <DataSourcePanel
                      config={config}
                      onChange={onChange}
                      onPreview={handlePreview}
                    />
                  </div>

                  {/* JSON response preview — shown after fetch. `hasData`
                      rather than `previewData &&`: the latter is an `unknown`
                      expression, which is not a renderable node. */}
                  {hasData && (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        padding: '0 20px 20px',
                        overflowY: 'auto',
                        borderTop: '1px solid #303030',
                        scrollbarWidth: 'thin' as const,
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#a3a3a3', margin: '12px 0 4px', fontWeight: 600 }}>
                        Response Data
                      </div>
                      <div style={{ fontSize: 10, color: '#525252', marginBottom: 8 }}>
                        Click a value to add as a field · Click an array to use as table rows
                      </div>
                      <JsonPreview
                        data={previewData}
                        onSelectPath={handleSelectPath}
                        onSelectArrayPath={handleSelectArrayPath}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 20 }}>
                  {isTable ? (
                    <TableColumnsPanel
                      config={config}
                      onChange={onChange}
                      previewData={previewData || undefined}
                    />
                  ) : (
                    <FieldList
                      fields={config.fields || []}
                      onChange={(fields) => onChange({ fields })}
                      previewData={previewData || undefined}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Live preview */}
          {hasData && (
            <div
              style={{
                width: '45%',
                display: 'flex',
                flexDirection: 'column',
                background: '#0a0a0a',
              }}
            >
              {/* Display mode switcher */}
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #262626',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, color: '#525252', fontWeight: 600, marginRight: 4 }}>
                  VIEW
                </span>
                {DISPLAY_MODES.map((m) => {
                  const active = config.displayMode === m.value;
                  return (
                    <button
                      key={m.value}
                      onClick={() => onChange({ displayMode: m.value })}
                      title={m.label}
                      style={{
                        padding: '4px 8px',
                        fontSize: 11,
                        fontWeight: 500,
                        color: active ? '#f5f5f5' : '#525252',
                        background: active ? 'rgba(59,130,246,0.2)' : 'transparent',
                        border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                        borderRadius: 5,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>

              {/* Mode-specific options */}
              {(config.displayMode === 'card-grid' ||
                config.displayMode === 'table' ||
                config.displayMode === 'status-board') && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderBottom: '1px solid #262626',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 11,
                    color: '#737373',
                  }}
                >
                  {config.displayMode === 'card-grid' && (
                    <>
                      <span>Columns:</span>
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n}
                          onClick={() => onChange({ cardColumns: n })}
                          style={{
                            width: 22,
                            height: 22,
                            fontSize: 11,
                            fontWeight: 600,
                            color: config.cardColumns === n ? '#f5f5f5' : '#525252',
                            background: config.cardColumns === n ? 'rgba(59,130,246,0.2)' : 'transparent',
                            border: config.cardColumns === n ? '1px solid rgba(59,130,246,0.4)' : '1px solid #303030',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </>
                  )}
                  {config.displayMode === 'table' && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Row limit:
                        <input
                          type="number"
                          min={0}
                          value={config.tableRowLimit}
                          onChange={(e) => onChange({ tableRowLimit: parseInt(e.target.value) || 0 })}
                          style={{
                            width: 48,
                            padding: '2px 4px',
                            fontSize: 11,
                            background: '#262626',
                            border: '1px solid #404040',
                            borderRadius: 4,
                            color: '#e5e5e5',
                            textAlign: 'center',
                          }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.tableAlternateRows}
                          onChange={(e) => onChange({ tableAlternateRows: e.target.checked })}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        Stripe rows
                      </label>
                    </>
                  )}
                  {config.displayMode === 'status-board' && (
                    <>
                      <span>Layout:</span>
                      {(['vertical', 'horizontal'] as const).map((o) => (
                        <button
                          key={o}
                          onClick={() => onChange({ statusOrientation: o })}
                          style={{
                            padding: '2px 8px',
                            fontSize: 11,
                            color: config.statusOrientation === o ? '#f5f5f5' : '#525252',
                            background: config.statusOrientation === o ? 'rgba(59,130,246,0.2)' : 'transparent',
                            border: config.statusOrientation === o ? '1px solid rgba(59,130,246,0.4)' : '1px solid #303030',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          {o === 'vertical' ? 'Vertical' : 'Horizontal'}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Preview area — renders the actual module or empty state */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  overflow: 'hidden',
                }}
              >
                {hasFields ? (
                  // The real module frame, so the preview resolves fonts and
                  // the --u text scale exactly the way the display does.
                  <div style={{ ...hostFrameStyle(previewStyle), maxHeight: 500 }}>
                    <DisplayRouter
                      data={previewData}
                      config={config}
                      style={previewStyle}
                      timezone={timezone}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      color: '#525252',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: 28, opacity: 0.3 }}>{ isTable ? '⊞' : '{ }' }</span>
                    <span style={{ fontSize: 12 }}>
                      {isTable
                        ? 'Add columns in the Table Columns tab to see a preview'
                        : 'Add fields in the Fields & Rules tab to see a preview'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '10px 20px',
            borderTop: '1px solid #404040',
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ flex: 1, fontSize: 11, color: '#525252' }}>
            Changes save automatically
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 20px',
              fontSize: 12,
              fontWeight: 600,
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function abbreviateUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname.length > 20 ? pathname.slice(0, 20) + '…' : pathname;
    return hostname + (path !== '/' ? path : '');
  } catch {
    return url.length > 30 ? url.slice(0, 30) + '…' : url;
  }
}
