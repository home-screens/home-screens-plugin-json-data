import React from 'react';
import type { JsonDataConfig, FetchState } from './types';
import DisplayRouter from './display/DisplayRouter';

// Re-export ConfigSection as a named export for the host loader
export { default as ConfigSection } from './config/ConfigSection';

const PLUGIN_ID = 'json-data-block';

const DEFAULT_CONFIG: JsonDataConfig = {
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

// ─── Data Fetching Hook ──────────────────────────────────────────────────────

function useJsonFetch(config: JsonDataConfig): FetchState {
  const [state, setState] = React.useState<FetchState>({
    data: null,
    error: null,
    lastSuccessAt: null,
    loading: true,
  });

  const configRef = React.useRef(config);
  configRef.current = config;

  // Hash fetch-relevant config so changes to headers/payload/auth params trigger re-fetch
  // JSON.stringify produces a stable string regardless of object reference identity
  const fetchKey = JSON.stringify([
    config.url,
    config.method,
    config.authType,
    config.authHeaderName,
    config.authQueryParam,
    config.customHeaders,
    config.payload,
  ]);

  React.useEffect(() => {
    if (!config.url) {
      setState({ data: null, error: 'No URL configured', lastSuccessAt: null, loading: false });
      return;
    }

    let cancelled = false;

    async function fetchData() {
      const cfg = configRef.current;
      try {
        // Build secretInjections based on authType
        const secretInjections: {
          header?: Record<string, string>;
          query?: Record<string, string>;
        } = {};

        switch (cfg.authType) {
          case 'bearer':
            secretInjections.header = { Authorization: 'Bearer {{auth_credential}}' };
            break;
          case 'api-key-header':
            secretInjections.header = { [cfg.authHeaderName || 'X-API-Key']: '{{auth_credential}}' };
            break;
          case 'api-key-query':
            secretInjections.query = { [cfg.authQueryParam || 'apiKey']: '{{auth_credential}}' };
            break;
          case 'basic':
            secretInjections.header = { Authorization: 'Basic {{auth_credential}}' };
            break;
        }

        // Build custom headers
        const headers: Record<string, string> = {};
        for (const h of cfg.customHeaders || []) {
          if (h.key && h.value) headers[h.key] = h.value;
        }

        const res = await window.__HS_SDK__.pluginFetch(PLUGIN_ID, {
          url: cfg.url,
          method: cfg.method || 'GET',
          headers,
          payload: cfg.method === 'POST' ? cfg.payload : undefined,
          secretInjections:
            Object.keys(secretInjections).length > 0 ? secretInjections : undefined,
          cacheTtlMs: cfg.cacheTtlMs || 60000,
        });

        if (cancelled) return;

        if (!res.ok) {
          const errorMsg =
            res.status === 401 || res.status === 403
              ? 'Authentication failed — check API credentials'
              : `HTTP ${res.status}: ${res.statusText}`;
          setState((prev) => ({
            data: prev.data, // keep stale data
            error: errorMsg,
            lastSuccessAt: prev.lastSuccessAt,
            loading: false,
          }));
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setState({ data, error: null, lastSuccessAt: Date.now(), loading: false });
          // Cache for display persistence across screen transitions
          window.__HS_SDK__.displayCache.set(`json-data:${cfg.url}`, data);
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            error: err instanceof Error ? err.message : 'Failed to fetch data',
            lastSuccessAt: prev.lastSuccessAt,
            loading: false,
          }));
        }
      }
    }

    // Try to restore from cache immediately
    const cached = window.__HS_SDK__.displayCache.get(`json-data:${config.url}`);
    if (cached) {
      setState({ data: cached, error: null, lastSuccessAt: null, loading: false });
    }

    fetchData();
    const id = setInterval(fetchData, config.refreshIntervalMs || 300000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchKey, config.refreshIntervalMs, config.cacheTtlMs]);

  return state;
}

// ─── Time Ago Helper ─────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// ─── Main Display Component ─────────────────────────────────────────────────

interface PluginProps {
  config: Record<string, unknown>;
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
  timezone?: string;
}

export default function JsonDataBlock({ config: rawConfig, style, timezone }: PluginProps) {
  const config: JsonDataConfig = { ...DEFAULT_CONFIG, ...(rawConfig as Partial<JsonDataConfig>) };
  const hostTimezone = timezone || window.__HS_SDK__.getHostSettings().timezone;
  const { data, error, lastSuccessAt, loading } = useJsonFetch(config);
  const { ModuleLoadingState } = window.__HS_SDK__;

  // Stale indicator
  const isStale = error !== null && data !== null;
  const staleText =
    isStale && lastSuccessAt && config.showStaleIndicator
      ? `Updated ${timeAgo(lastSuccessAt)}`
      : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        color: style.textColor,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        padding: style.padding,
        opacity: style.opacity,
        backdropFilter: `blur(${style.backdropBlur ?? 0}px)`,
        WebkitBackdropFilter: `blur(${style.backdropBlur ?? 0}px)`,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <ModuleLoadingState loading={loading} error={!data && error ? error : undefined}>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {data ? (
            <DisplayRouter
              data={data}
              config={config}
              style={style}
              timezone={hostTimezone}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                opacity: 0.3,
                fontSize: style.fontSize * 0.85,
              }}
            >
              {config.url ? 'Waiting for data…' : 'Configure a URL to get started'}
            </div>
          )}
        </div>
      </ModuleLoadingState>

      {/* Stale data indicator */}
      {staleText && (
        <div
          style={{
            position: 'absolute',
            bottom: style.padding || 8,
            right: style.padding || 8,
            fontSize: 10,
            opacity: 0.4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ color: '#facc15' }}>●</span>
          {staleText}
        </div>
      )}
    </div>
  );
}
