import React, { useState } from 'react';
import type { JsonDataConfig, AuthType, CustomHeader } from '../types';

interface DataSourcePanelProps {
  config: JsonDataConfig;
  onChange: (updates: Partial<JsonDataConfig>) => void;
  onPreview: (data: unknown) => void;
}

export default function DataSourcePanel({
  config,
  onChange,
  onPreview,
}: DataSourcePanelProps) {
  const { INPUT_CLASS, NESTED_INPUT_CLASS, pluginFetch } = window.__HS_SDK__;
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<
    { ok: true } | { ok: false; message: string } | null
  >(null);

  const AUTH_OPTIONS: { value: AuthType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api-key-header', label: 'API Key (Header)' },
    { value: 'api-key-query', label: 'API Key (Query)' },
    { value: 'basic', label: 'Basic Auth' },
  ];

  const updateHeader = (index: number, updates: Partial<CustomHeader>) => {
    const next = config.customHeaders.map((h, i) =>
      i === index ? { ...h, ...updates } : h,
    );
    onChange({ customHeaders: next });
  };

  const removeHeader = (index: number) => {
    onChange({ customHeaders: config.customHeaders.filter((_, i) => i !== index) });
  };

  const addHeader = () => {
    onChange({ customHeaders: [...config.customHeaders, { key: '', value: '' }] });
  };

  const handleFetch = async () => {
    if (!config.url) {
      setFetchResult({ ok: false, message: 'Enter a URL first' });
      return;
    }

    setFetching(true);
    setFetchResult(null);

    try {
      // Build custom headers
      const headers: Record<string, string> = {};
      for (const h of config.customHeaders) {
        if (h.key) headers[h.key] = h.value;
      }
      if (config.method === 'POST' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Build secretInjections matching the proxy's {{key}} syntax
      const secretInjections: {
        header?: Record<string, string>;
        query?: Record<string, string>;
      } = {};

      switch (config.authType) {
        case 'bearer':
          secretInjections.header = { Authorization: 'Bearer {{auth_credential}}' };
          break;
        case 'api-key-header':
          secretInjections.header = { [config.authHeaderName || 'X-API-Key']: '{{auth_credential}}' };
          break;
        case 'api-key-query':
          secretInjections.query = { [config.authQueryParam || 'apiKey']: '{{auth_credential}}' };
          break;
        case 'basic':
          secretInjections.header = { Authorization: 'Basic {{auth_credential}}' };
          break;
      }

      const options: Record<string, unknown> = {
        url: config.url,
        method: config.method,
        headers,
        secretInjections: Object.keys(secretInjections).length > 0 ? secretInjections : undefined,
      };

      if (config.method === 'POST' && config.payload) {
        options.payload = config.payload;
      }

      const response = await pluginFetch('json-data-block', options);

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const message = (errBody as Record<string, unknown>)?.error
          ? String((errBody as Record<string, unknown>).error)
          : `HTTP ${response.status}`;
        setFetchResult({ ok: false, message });
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        setFetchResult({ ok: false, message: 'Response is not valid JSON' });
        return;
      }
      setFetchResult({ ok: true });
      onPreview(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Fetch failed';
      setFetchResult({ ok: false, message });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* URL */}
      <div>
        <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
          URL
        </div>
        <input
          className={INPUT_CLASS}
          value={config.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://api.example.com/data"
          style={{ width: '100%' }}
        />
      </div>

      {/* Method */}
      <div>
        <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
          Method
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['GET', 'POST'] as const).map((method) => {
            const isActive = config.method === method;
            return (
              <button
                key={method}
                onClick={() => onChange({ method })}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? '#ffffff' : '#a3a3a3',
                  cursor: 'pointer',
                  borderRadius:
                    method === 'GET' ? '6px 0 0 6px' : '0 6px 6px 0',
                  borderLeft:
                    method === 'POST'
                      ? 'none'
                      : '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {method}
              </button>
            );
          })}
        </div>
      </div>

      {/* POST body */}
      {config.method === 'POST' && (
        <div>
          <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
            Request Body
          </div>
          <textarea
            className={INPUT_CLASS}
            value={config.payload}
            onChange={(e) => onChange({ payload: e.target.value })}
            placeholder='{"query": "..."}'
            rows={3}
            style={{
              width: '100%',
              resize: 'vertical',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          />
        </div>
      )}

      {/* Auth Type */}
      <div>
        <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
          Authentication
        </div>
        <select
          className={INPUT_CLASS}
          value={config.authType}
          onChange={(e) => onChange({ authType: e.target.value as AuthType })}
          style={{ width: '100%' }}
        >
          {AUTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Auth-specific hints/inputs */}
        {config.authType === 'bearer' && (
          <div
            style={{
              fontSize: 11,
              color: '#737373',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Configure your token in the Secrets section below
          </div>
        )}

        {config.authType === 'api-key-header' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
              Header Name
            </div>
            <input
              className={NESTED_INPUT_CLASS}
              value={config.authHeaderName}
              onChange={(e) => onChange({ authHeaderName: e.target.value })}
              placeholder="X-API-Key"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {config.authType === 'api-key-query' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
              Query Parameter Name
            </div>
            <input
              className={NESTED_INPUT_CLASS}
              value={config.authQueryParam}
              onChange={(e) => onChange({ authQueryParam: e.target.value })}
              placeholder="apiKey"
              style={{ width: '100%' }}
            />
          </div>
        )}

        {config.authType === 'basic' && (
          <div
            style={{
              fontSize: 11,
              color: '#737373',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Put Base64-encoded credentials in Secrets
          </div>
        )}
      </div>

      {/* Custom Headers */}
      <div>
        <div style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4 }}>
          Custom Headers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {config.customHeaders.map((header, index) => (
            <div
              key={index}
              style={{ display: 'flex', gap: 4, alignItems: 'center' }}
            >
              <input
                className={NESTED_INPUT_CLASS}
                value={header.key}
                onChange={(e) => updateHeader(index, { key: e.target.value })}
                placeholder="Header-Name"
                style={{ flex: 1 }}
              />
              <input
                className={NESTED_INPUT_CLASS}
                value={header.value}
                onChange={(e) => updateHeader(index, { value: e.target.value })}
                placeholder="value"
                style={{ flex: 1 }}
              />
              <button
                onClick={() => removeHeader(index)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a3a3a3',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '0 4px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addHeader}
            style={{
              width: '100%',
              padding: '4px 0',
              background: 'transparent',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 4,
              color: '#a3a3a3',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            + Add Header
          </button>
        </div>
      </div>

      {/* Fetch & Preview button */}
      <button
        onClick={handleFetch}
        disabled={fetching}
        style={{
          width: '100%',
          padding: '8px 0',
          background: fetching ? '#2563eb' : '#3b82f6',
          border: 'none',
          borderRadius: 6,
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 600,
          cursor: fetching ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: fetching ? 0.8 : 1,
        }}
      >
        {fetching ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'hs-spin 0.6s linear infinite',
              }}
            />
            Fetching...
          </>
        ) : (
          'Fetch & Preview'
        )}
      </button>

      {/* Spinner keyframes injected inline */}
      {fetching && (
        <style>{`@keyframes hs-spin { to { transform: rotate(360deg); } }`}</style>
      )}

      {/* Result indicator */}
      {fetchResult && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: fetchResult.ok ? '#86efac' : '#fca5a5',
          }}
        >
          <span style={{ fontSize: 14 }}>{fetchResult.ok ? '\u2713' : '\u2717'}</span>
          <span>
            {fetchResult.ok ? 'Success' : fetchResult.message}
          </span>
        </div>
      )}
    </div>
  );
}
