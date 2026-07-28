// The host's module frame, implemented plugin-side.
//
// Why this file exists: the host does NOT wrap plugin modules in its
// `ModuleWrapper` the way it wraps built-in ones. A plugin renders its own
// root element, so every field of `ModuleStyle` — every slider in the
// editor's Style panel — only takes effect if the plugin implements it. A
// field you don't read is a control that silently does nothing for the user.
//
// Three of those fields are easy to get wrong, which is why this is a shared
// helper rather than an inline style object:
//
//   Border and shadow. `borderWidth` / `borderColor` / `shadowSize` were
//   added to the host after the first plugins shipped, so the obvious
//   hand-written root frame omits them.
//
//   Opacity under backdrop blur. Setting `opacity` on the element while
//   `backdrop-filter` is active makes the blur invisible: an opaque
//   background covers the blurred backdrop completely and Chrome renders
//   nothing. The host bakes the opacity into the background's alpha channel
//   instead; `hostFrameStyle` does the same.
//
//   Font family. `style.fontFamily` is a font-registry ID, not a CSS stack —
//   "playfair", not a family the browser has ever heard of. Assigning it
//   straight to `font-family` silently renders every module in the fallback
//   font; `resolveFontStack` maps it the way the host does.
//
// Use it for your root element and spread your own layout on top:
//
//   <div style={{ ...hostFrameStyle(style), display: 'flex', gap: '0.75em' }}>
//
// SIZING IS STILL YOURS. This file applies the host's font size to the root,
// which only reaches content authored in `em`/`rem` or derived from
// `style.fontSize`. Hard-coded pixel values ignore the Text size slider
// entirely — a module sized to fill a quarter of a 4K screen will still draw
// 12px labels. Author dimensions in `em` wherever you can.

import type { CSSProperties } from 'react';

/** The host's `ModuleStyle`, declared here rather than imported so this file
 *  is self-contained and can be copied between plugins verbatim. Structural
 *  typing means a plugin's own `ModuleStyle` satisfies it either way — and a
 *  plugin whose copy predates the last three fields still type-checks,
 *  because they're optional. */
export interface HostModuleStyle {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  opacity: number;
  backdropBlur: number;
  borderWidth?: number;
  borderColor?: string;
  shadowSize?: number;
}

/** The host's default border color, matching its `ModuleWrapper`. */
const DEFAULT_BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';

/** The host's font registry, id to CSS stack. Duplicated rather than imported
 *  for the same reason as everything else in this file — plugins can't reach
 *  into host modules — and kept in sync with `src/lib/font-registry.ts`. The
 *  `var(--font-*)` variables are published by the host's document, so a stack
 *  naming one resolves in plugin markup too. */
const FONT_STACKS: Record<string, string> = {
  inter: 'var(--font-inter), system-ui, sans-serif',
  roboto: 'var(--font-roboto), system-ui, sans-serif',
  poppins: 'var(--font-poppins), system-ui, sans-serif',
  'system-ui': 'system-ui, -apple-system, "Segoe UI", sans-serif',
  playfair: 'var(--font-playfair), Georgia, serif',
  lora: 'var(--font-lora), Georgia, serif',
  'dm-serif': 'var(--font-dm-serif), Georgia, serif',
  georgia: 'Georgia, "Times New Roman", serif',
  jetbrains: 'var(--font-jetbrains), ui-monospace, monospace',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  bebas: 'var(--font-bebas), Impact, sans-serif',
  caveat: 'var(--font-caveat), cursive',
  pacifico: 'var(--font-pacifico), cursive',
};

/** Raw CSS stacks stored by hosts that predate the registry, mapped to the id
 *  that supersedes them, so an old config picks up the self-hosted font. */
const LEGACY_FONT_STACKS: Record<string, string> = {
  'Inter, system-ui, sans-serif': 'inter',
  'Georgia, serif': 'georgia',
  monospace: 'mono',
  'system-ui, sans-serif': 'system-ui',
};

/** The CSS font stack for a stored `fontFamily`: a registry id becomes its
 *  stack, a known legacy stack is upgraded to one, and anything else — a
 *  family the user typed by hand — is passed through. Undefined for an empty
 *  value, so the caller decides the default. */
export function resolveFontStack(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const direct = FONT_STACKS[trimmed];
  if (direct) return direct;
  const legacy = LEGACY_FONT_STACKS[trimmed];
  if (legacy) return FONT_STACKS[legacy];
  return trimmed;
}

/** A color split into channels: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 *  `rgb()`, and `rgba()` in either comma or space/slash syntax. Null for
 *  anything else, so callers can fall back rather than emit a broken color
 *  string. Alpha is 1 when the form carries none. */
export function parseRgba(
  input: string,
): { rgb: [number, number, number]; alpha: number } | null {
  const value = input.trim();

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(value);
  if (short) {
    const channel = (c: string) => parseInt(c + c, 16);
    return {
      rgb: [channel(short[1]), channel(short[2]), channel(short[3])],
      alpha: short[4] === undefined ? 1 : channel(short[4]) / 255,
    };
  }

  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(value);
  if (hex) {
    return {
      rgb: [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)],
      alpha: hex[4] === undefined ? 1 : parseInt(hex[4], 16) / 255,
    };
  }

  // Anchored at the closing paren so forms this can only half-read — percentage
  // channels, `color(srgb …)` — fall through to the browser instead of being
  // silently misparsed.
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?\s*\)$/i
    .exec(value);
  if (fn) {
    const rgb: [number, number, number] = [
      Math.round(Number(fn[1])), Math.round(Number(fn[2])), Math.round(Number(fn[3])),
    ];
    const alpha = fn[4] === undefined ? 1 : Number(fn[4]) / (fn[5] ? 100 : 1);
    if (rgb.every((c) => Number.isFinite(c) && c >= 0 && c <= 255) && Number.isFinite(alpha)) {
      return { rgb, alpha: clamp(alpha, 0, 1) };
    }
  }

  return null;
}

/** The [r, g, b] triple of a color this file can read, discarding any alpha.
 *  Null for anything else. */
export function parseColor(input: string): [number, number, number] | null {
  return parseRgba(input)?.rgb ?? null;
}

/** One DOM probe per distinct string — the host re-renders the module on
 *  every tick and the answer never changes. */
const resolved = new Map<string, string | null>();

/** The same color in a form `parseColor` can read, or null if it isn't a
 *  color at all.
 *
 *  The host's color picker accepts anything the browser calls valid and
 *  stores the string verbatim, so `black`, `hsl(0 0% 10%)`, `#000000cc`, and
 *  `rgb(0 0 0 / 50%)` all reach plugin code. Anything the regexes above
 *  can't read goes to the browser, which is the only thing that knows what
 *  `rebeccapurple` is. Outside a DOM (unit tests) there is nothing to ask
 *  and the caller falls back. */
export function resolveColor(input: string): string | null {
  if (parseRgba(input)) return input;

  const cached = resolved.get(input);
  if (cached !== undefined) return cached;

  let out: string | null = null;
  if (typeof document !== 'undefined' && document.body) {
    const probe = document.createElement('div');
    probe.style.color = input;
    // An invalid value leaves the property untouched; without this check the
    // computed style below would hand back the inherited color and turn
    // gibberish into whatever the page happens to be using.
    if (probe.style.color !== '') {
      // A detached element has no computed style, so the probe has to be in
      // the document. `display: none` keeps it out of layout.
      probe.style.display = 'none';
      document.body.appendChild(probe);
      try {
        const computed = getComputedStyle(probe).color;
        out = parseColor(computed) ? computed : null;
      } finally {
        probe.remove();
      }
    }
  }
  resolved.set(input, out);
  return out;
}

/** Bake an alpha into a color so a blurred module can carry its opacity in
 *  the background rather than on the element. Null when the color can't be
 *  read at all, so the caller can fall back to element opacity — a slightly
 *  weaker blur beats an opacity setting that does nothing. */
export function colorWithAlpha(color: string, alpha: number): string | null {
  if (!Number.isFinite(alpha) || alpha >= 1) return color;
  const resolvedColor = resolveColor(color);
  const parsed = resolvedColor ? parseRgba(resolvedColor) : null;
  if (!parsed) return null;
  // A background that is already translucent keeps its own alpha, scaled, so
  // a default like rgba(0, 0, 0, 0.35) doesn't jump to opaque. `parseRgba`
  // reads that alpha out of every form the picker stores, including the
  // `#rrggbbaa` and `rgb(0 0 0 / 50%)` syntaxes the browser never normalizes
  // for us because they parse here directly.
  const [r, g, b] = parsed.rgb;
  // Three places is past the eye's resolution and keeps float noise like
  // 0.15000000000000002 out of the style attribute.
  const combined = Math.round(parsed.alpha * alpha * 1000) / 1000;
  return `rgba(${r}, ${g}, ${b}, ${combined})`;
}

/** The host's module shadow, matched to what its `buildModuleShadow` gives
 *  every built-in: a hairline top highlight, a cast shadow, and a faint
 *  ambient ring. Reimplemented rather than imported — plugins can't reach
 *  into host modules. */
export function moduleShadow(size: number): string | undefined {
  if (!Number.isFinite(size) || size <= 0) return undefined;
  const offset = Math.round(size / 2);
  const ambient = Math.round(size / 2);
  return 'inset 0 1px 0 rgba(255, 255, 255, 0.12), '
    + `0 ${offset}px ${size}px rgba(0, 0, 0, 0.8), `
    + `0 0 ${ambient}px rgba(255, 255, 255, 0.04)`;
}

/** The font size a plugin's pixel dimensions are authored against, when it
 *  doesn't say otherwise. Matches the host's own `DEFAULT_MODULE_STYLE`. */
export const DEFAULT_BASE_FONT_SIZE = 16;

export interface HostFrameOptions {
  /** Draw no surface of our own — no background, border, shadow, or blur —
   *  while still taking type and color from the host. For modules that float
   *  their own tiles over the screen instead of filling a card. */
  chromeless?: boolean;
  /** The font size this plugin's pixel dimensions were authored against —
   *  its manifest `defaultStyle.fontSize`. Sets the `--u` scale variable (see
   *  `scalePx`). Defaults to the host's own default. */
  baseFontSize?: number;
}

/** Scale an authored pixel dimension by the host's Text size.
 *
 *  The host's Text size reaches the root as a font size, so `em` values
 *  follow it and pixel values do not. `em` isn't always usable though: it
 *  resolves against the element's OWN font size, so two elements with
 *  different type but a shared width (a table cell and its column header)
 *  would end up different widths. `--u` is published once on the root by
 *  `hostFrameStyle`, so every `calc(Npx * var(--u))` lands on the same
 *  number wherever it sits — and it works inside plain constant style
 *  objects, which a React hook cannot.
 *
 *  Falls back to 1 so styles still resolve outside a host frame. */
export function scalePx(n: number): string {
  return `calc(${n}px * var(--u, 1))`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function finite(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The same style with every numeric field repaired.
 *
 *  The host's config file is hand-editable and its style fields arrive from
 *  JSON, so a missing or garbage number is reachable — and one that reaches a
 *  view multiplies out into `NaNpx` gaps, zero-sized elements, and dropped
 *  declarations. Normalize once at the top of the module and hand the result
 *  to BOTH `hostFrameStyle` and whatever renders the content, so the frame and
 *  the views can never disagree about what size the type is. */
export function normalizeHostStyle<T extends HostModuleStyle>(
  style: T,
  options: HostFrameOptions = {},
): T {
  const base = options.baseFontSize ?? DEFAULT_BASE_FONT_SIZE;
  const fontSize = finite(style.fontSize, base);
  return {
    ...style,
    fontSize: fontSize > 0 ? fontSize : base,
    opacity: clamp(finite(style.opacity, 1), 0, 1),
    backdropBlur: Math.max(finite(style.backdropBlur, 0), 0),
    borderRadius: Math.max(finite(style.borderRadius, 0), 0),
    padding: Math.max(finite(style.padding, 0), 0),
    borderWidth: Math.max(finite(style.borderWidth, 0), 0),
    shadowSize: Math.max(finite(style.shadowSize, 0), 0),
  } as T;
}

/** What the frame paints as its background, and the opacity left on the
 *  element afterwards. Takes an already-normalized style. */
function frameSurface(
  style: HostModuleStyle,
  chromeless: boolean,
): { backgroundColor: string; opacity: number | undefined } {
  if (chromeless) return { backgroundColor: 'transparent', opacity: style.opacity };
  // See the header note: with blur on, the opacity has to live in the
  // background's alpha or the blur renders invisible.
  const baked = style.backdropBlur > 0
    ? colorWithAlpha(style.backgroundColor, style.opacity)
    : null;
  return baked
    ? { backgroundColor: baked, opacity: undefined }
    : { backgroundColor: style.backgroundColor, opacity: style.opacity };
}

/** The background color the frame actually paints.
 *
 *  For the one thing that has to draw over the frame rather than inside it: a
 *  sticky table header needs its own background so rows don't scroll through
 *  it, and painting the raw `style.backgroundColor` there would repaint the
 *  un-baked color at full strength over a root whose opacity is already in its
 *  alpha — a darker band across the top of the module. */
export function frameBackgroundColor(
  style: HostModuleStyle,
  options: HostFrameOptions = {},
): string {
  return frameSurface(
    normalizeHostStyle(style, options),
    options.chromeless ?? false,
  ).backgroundColor;
}

/** Every `ModuleStyle` field, applied the way the host applies it to
 *  built-in modules. Spread onto your root element, then add your layout. */
export function hostFrameStyle(
  style: HostModuleStyle,
  options: HostFrameOptions = {},
): CSSProperties {
  const chromeless = options.chromeless ?? false;
  const base = options.baseFontSize ?? DEFAULT_BASE_FONT_SIZE;
  const s = normalizeHostStyle(style, options);
  const blur = chromeless ? 0 : s.backdropBlur;
  const hasBlur = blur > 0;
  const borderWidth = chromeless ? 0 : s.borderWidth ?? 0;
  const shadowSize = chromeless ? 0 : s.shadowSize ?? 0;
  const surface = frameSurface(s, chromeless);

  return {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    boxSizing: 'border-box',
    // Published for `scalePx`, so pixel dimensions can follow the Text size
    // slider the same way `em` type does.
    ['--u' as string]: s.fontSize / base,
    fontFamily: resolveFontStack(s.fontFamily) ?? s.fontFamily,
    fontSize: s.fontSize,
    color: s.textColor,
    backgroundColor: surface.backgroundColor,
    opacity: surface.opacity,
    borderRadius: s.borderRadius,
    padding: s.padding,
    border: borderWidth > 0
      ? `${borderWidth}px solid ${s.borderColor ?? DEFAULT_BORDER_COLOR}`
      : undefined,
    boxShadow: moduleShadow(shadowSize),
    backdropFilter: hasBlur ? `blur(${blur}px)` : undefined,
    WebkitBackdropFilter: hasBlur ? `blur(${blur}px)` : undefined,
  };
}
