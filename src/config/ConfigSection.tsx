import React, { useState, useCallback } from 'react';
import type { JsonDataConfig } from '../types';
import ConfigModal from './ConfigModal';

interface PluginConfigSectionProps {
  config: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  moduleId: string;
  screenId: string;
}

const DEFAULTS: JsonDataConfig = {
  url: '',
  method: 'GET',
  customHeaders: [],
  payload: '',
  authType: 'none',
  authHeaderName: 'X-API-Key',
  authQueryParam: 'apiKey',
  displayMode: 'key-value',
  fields: [],
  tableRootPath: '',
  tableColumns: [],
  tableRowLimit: 0,
  tableAlternateRows: true,
  cardColumns: 2,
  statusOrientation: 'vertical',
  refreshIntervalMs: 300000,
  cacheTtlMs: 60000,
  showStaleIndicator: true,
};

const PREVIEW_STYLE = {
  fontSize: 14,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  textColor: '#e5e5e5',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: 8,
  padding: 12,
  opacity: 1,
  backdropBlur: 0,
};

const MODE_LABELS: Record<string, string> = {
  'single-value': 'Single Value',
  'key-value': 'Key-Value List',
  'table': 'Table',
  'card-grid': 'Card Grid',
  'status-board': 'Status Board',
};

export default function ConfigSection({
  config: rawConfig,
  onChange,
}: PluginConfigSectionProps) {
  const { Slider, Toggle } = window.__HS_SDK__;
  const config: JsonDataConfig = { ...DEFAULTS, ...(rawConfig as Partial<JsonDataConfig>) };
  const [showModal, setShowModal] = useState(false);

  const update = useCallback(
    (updates: Partial<JsonDataConfig>) => {
      onChange(updates as Record<string, unknown>);
    },
    [onChange],
  );

  const isTable = config.displayMode === 'table';
  const fieldCount = isTable
    ? (config.tableColumns || []).length
    : (config.fields || []).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status summary */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#a3a3a3' }}>View</span>
          <span style={{ color: '#e5e5e5' }}>
            {MODE_LABELS[config.displayMode] || config.displayMode}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#a3a3a3' }}>URL</span>
          <span
            style={{
              color: config.url ? '#e5e5e5' : '#525252',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {config.url || 'Not configured'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#a3a3a3' }}>{isTable ? 'Columns' : 'Fields'}</span>
          <span style={{ color: fieldCount > 0 ? '#e5e5e5' : '#525252' }}>
            {fieldCount || 'None'}
          </span>
        </div>
        {config.authType !== 'none' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#a3a3a3' }}>Auth</span>
            <span style={{ color: '#86efac', fontSize: 11 }}>
              {config.authType === 'bearer' ? 'Bearer' :
               config.authType === 'api-key-header' ? 'API Key' :
               config.authType === 'api-key-query' ? 'API Key (query)' :
               config.authType === 'basic' ? 'Basic' : config.authType}
            </span>
          </div>
        )}
      </div>

      {/* Configure button — opens modal */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '9px 0',
          background: '#3b82f6',
          border: 'none',
          borderRadius: 6,
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        Edit JSON Data Block
      </button>

      {/* Timing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Slider
          label="Refresh interval (minutes)"
          value={Math.round(config.refreshIntervalMs / 60000)}
          min={1}
          max={60}
          step={1}
          onChange={(v: number) => update({ refreshIntervalMs: v * 60000 })}
        />
        <Slider
          label="Cache TTL (seconds)"
          value={Math.round(config.cacheTtlMs / 1000)}
          min={10}
          max={600}
          step={10}
          onChange={(v: number) => update({ cacheTtlMs: v * 1000 })}
        />
        <Toggle
          label="Show stale data indicator"
          checked={config.showStaleIndicator}
          onChange={(v: boolean) => update({ showStaleIndicator: v })}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <ConfigModal
          config={config}
          style={PREVIEW_STYLE}
          onChange={update}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
