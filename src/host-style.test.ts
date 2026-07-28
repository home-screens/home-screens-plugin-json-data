// Guards the module frame contract. Every assertion here corresponds to a
// slider in the host's Style panel that this plugin used to ignore.

import { describe, it, expect } from 'vitest';
import {
  hostFrameStyle, colorWithAlpha, moduleShadow, parseColor, parseRgba, scalePx,
  resolveFontStack, normalizeHostStyle, frameBackgroundColor,
} from './host-style';
import type { HostModuleStyle } from './host-style';

const BASE: HostModuleStyle = {
  fontSize: 16,
  fontFamily: 'Inter',
  textColor: '#ffffff',
  backgroundColor: '#000000',
  borderRadius: 12,
  padding: 16,
  opacity: 1,
  backdropBlur: 0,
};

describe('hostFrameStyle', () => {
  it('carries the plain style fields through to the root', () => {
    const s = hostFrameStyle(BASE);
    expect(s.fontSize).toBe(16);
    expect(s.fontFamily).toBe('Inter');
    expect(s.color).toBe('#ffffff');
    expect(s.borderRadius).toBe(12);
    expect(s.padding).toBe(16);
    expect(s.backgroundColor).toBe('#000000');
  });

  it('draws a border only once borderWidth is above zero', () => {
    expect(hostFrameStyle(BASE).border).toBeUndefined();
    expect(hostFrameStyle({ ...BASE, borderWidth: 0 }).border).toBeUndefined();
    expect(hostFrameStyle({ ...BASE, borderWidth: 2 }).border)
      .toBe('2px solid rgba(255, 255, 255, 0.15)');
  });

  it('uses the configured border color when one is set', () => {
    expect(hostFrameStyle({ ...BASE, borderWidth: 1, borderColor: '#ff0000' }).border)
      .toBe('1px solid #ff0000');
  });

  it('draws a shadow only once shadowSize is above zero', () => {
    expect(hostFrameStyle(BASE).boxShadow).toBeUndefined();
    expect(hostFrameStyle({ ...BASE, shadowSize: 24 }).boxShadow)
      .toContain('0 12px 24px rgba(0, 0, 0, 0.8)');
  });

  // The interaction that made this a shared helper: opacity on the element
  // hides the blur entirely, so it has to move into the background's alpha.
  describe('opacity under backdrop blur', () => {
    it('stays on the element when there is no blur', () => {
      const s = hostFrameStyle({ ...BASE, opacity: 0.5 });
      expect(s.opacity).toBe(0.5);
      expect(s.backgroundColor).toBe('#000000');
      expect(s.backdropFilter).toBeUndefined();
    });

    it('bakes into the background alpha when blur is on', () => {
      const s = hostFrameStyle({ ...BASE, opacity: 0.5, backdropBlur: 8 });
      expect(s.opacity).toBeUndefined();
      expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0.5)');
      expect(s.backdropFilter).toBe('blur(8px)');
      expect(s.WebkitBackdropFilter).toBe('blur(8px)');
    });

    it('scales an already-translucent background rather than making it opaque', () => {
      const s = hostFrameStyle({
        ...BASE, backgroundColor: 'rgba(0, 0, 0, 0.4)', opacity: 0.5, backdropBlur: 8,
      });
      expect(s.backgroundColor).toBe('rgba(0, 0, 0, 0.2)');
    });

    it('falls back to element opacity when the background cannot be read', () => {
      // No DOM to probe in this environment, so an unparseable color has no
      // alpha to bake into — a weaker blur beats a dead opacity slider.
      const s = hostFrameStyle({
        ...BASE, backgroundColor: 'not-a-color', opacity: 0.5, backdropBlur: 8,
      });
      expect(s.opacity).toBe(0.5);
      expect(s.backgroundColor).toBe('not-a-color');
    });
  });

  // The scale variable behind `scalePx`, for pixel dimensions that can't be
  // `em` — column widths shared across two type sizes, or values living in a
  // plain constant style object where no hook can reach.
  describe('the --u scale variable', () => {
    const u = (s: HostModuleStyle, opts?: { baseFontSize?: number }) =>
      (hostFrameStyle(s, opts) as Record<string, unknown>)['--u'];

    it('is 1 at the authored size, so the shipped look is unchanged', () => {
      expect(u({ ...BASE, fontSize: 16 })).toBe(1);
    });

    it('tracks the host Text size', () => {
      expect(u({ ...BASE, fontSize: 32 })).toBe(2);
      expect(u({ ...BASE, fontSize: 8 })).toBe(0.5);
    });

    it('measures against the plugin authored base when one is given', () => {
      expect(u({ ...BASE, fontSize: 14 }, { baseFontSize: 14 })).toBe(1);
      expect(u({ ...BASE, fontSize: 28 }, { baseFontSize: 14 })).toBe(2);
    });

    it('falls back to 1 rather than collapsing every scaled dimension', () => {
      expect(u({ ...BASE, fontSize: 0 })).toBe(1);
      expect(u({ ...BASE, fontSize: Number.NaN })).toBe(1);
      expect(u({ ...BASE, fontSize: -8 })).toBe(1);
      expect(u({ ...BASE, fontSize: undefined as unknown as number })).toBe(1);
    });

    it('also repairs the root font size, not just the variable', () => {
      expect(hostFrameStyle({ ...BASE, fontSize: 0 }).fontSize).toBe(16);
    });
  });

  describe('scalePx', () => {
    it('emits a calc against the variable, defaulting to unscaled', () => {
      expect(scalePx(18)).toBe('calc(18px * var(--u, 1))');
    });
  });

  // The style panel stores a font-registry id, not a CSS stack, so the root
  // has to translate it or the module renders in the fallback font.
  it('turns the stored font id into a CSS stack', () => {
    expect(hostFrameStyle({ ...BASE, fontFamily: 'playfair' }).fontFamily)
      .toBe('var(--font-playfair), Georgia, serif');
    expect(hostFrameStyle({ ...BASE, fontFamily: 'jetbrains' }).fontFamily)
      .toBe('var(--font-jetbrains), ui-monospace, monospace');
  });

  // Every numeric field arrives from a hand-editable JSON config.
  describe('numbers that cannot be trusted', () => {
    it('keeps a background rather than emitting an alpha of NaN', () => {
      const s = hostFrameStyle({
        ...BASE, opacity: undefined as unknown as number, backdropBlur: 8,
      });
      expect(s.backgroundColor).toBe('#000000');
      expect(s.opacity).toBeUndefined();
    });

    it('clamps an out-of-range opacity instead of passing it through', () => {
      expect(hostFrameStyle({ ...BASE, opacity: 4 }).opacity).toBe(1);
      expect(hostFrameStyle({ ...BASE, opacity: -2 }).opacity).toBe(0);
    });

    it('draws no shadow for a non-finite size', () => {
      expect(moduleShadow(Number.NaN)).toBeUndefined();
      expect(hostFrameStyle({ ...BASE, shadowSize: Number.NaN }).boxShadow)
        .toBeUndefined();
    });

    it('draws no border for a non-finite width', () => {
      expect(hostFrameStyle({ ...BASE, borderWidth: Number.NaN }).border)
        .toBeUndefined();
    });
  });

  it('drops its own surface when chromeless', () => {
    const s = hostFrameStyle(
      { ...BASE, borderWidth: 2, shadowSize: 10, backdropBlur: 6 },
      { chromeless: true },
    );
    expect(s.backgroundColor).toBe('transparent');
    expect(s.border).toBeUndefined();
    expect(s.boxShadow).toBeUndefined();
    expect(s.backdropFilter).toBeUndefined();
    // Type and color still come from the host.
    expect(s.fontSize).toBe(16);
    expect(s.color).toBe('#ffffff');
  });
});

describe('normalizeHostStyle', () => {
  // The frame used to repair fontSize for itself and hand the raw value to the
  // views, so the root rendered at 16px while every gap derived from it became
  // NaNpx and dropped out.
  it('repairs the font size the views multiply, not just the root', () => {
    expect(normalizeHostStyle({ ...BASE, fontSize: Number.NaN }).fontSize).toBe(16);
    expect(normalizeHostStyle({ ...BASE, fontSize: 0 }).fontSize).toBe(16);
    expect(normalizeHostStyle({ ...BASE, fontSize: -8 }).fontSize).toBe(16);
    expect(
      normalizeHostStyle({ ...BASE, fontSize: undefined as unknown as number }).fontSize,
    ).toBe(16);
  });

  it('measures a repaired font size against the plugin authored base', () => {
    expect(normalizeHostStyle({ ...BASE, fontSize: 0 }, { baseFontSize: 14 }).fontSize)
      .toBe(14);
  });

  it('leaves good values alone', () => {
    expect(normalizeHostStyle({ ...BASE, fontSize: 24, opacity: 0.4 }))
      .toMatchObject({ fontSize: 24, opacity: 0.4 });
  });

  it('keeps the fields it does not own', () => {
    expect(normalizeHostStyle({ ...BASE, textColor: '#abcdef', fontFamily: 'lora' }))
      .toMatchObject({ textColor: '#abcdef', fontFamily: 'lora' });
  });
});

describe('resolveFontStack', () => {
  it('expands a registry id', () => {
    expect(resolveFontStack('inter')).toBe('var(--font-inter), system-ui, sans-serif');
    expect(resolveFontStack('bebas')).toBe('var(--font-bebas), Impact, sans-serif');
  });

  it('upgrades a stack stored before the registry existed', () => {
    expect(resolveFontStack('Inter, system-ui, sans-serif'))
      .toBe('var(--font-inter), system-ui, sans-serif');
    expect(resolveFontStack('monospace')).toBe('ui-monospace, "SF Mono", Menlo, monospace');
  });

  it('passes a hand-typed family through untouched', () => {
    expect(resolveFontStack('Helvetica Neue')).toBe('Helvetica Neue');
  });

  it('has no opinion about an empty value', () => {
    expect(resolveFontStack('')).toBeUndefined();
    expect(resolveFontStack(undefined)).toBeUndefined();
  });
});

describe('parseColor', () => {
  it('reads the forms the host stores', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#1e3a5f')).toEqual([30, 58, 95]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30]);
  });

  it('returns null rather than guessing', () => {
    expect(parseColor('rebeccapurple')).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('#12345')).toBeNull();
  });
});

describe('parseRgba', () => {
  it('reads the alpha out of every form the picker stores', () => {
    expect(parseRgba('#0000')).toMatchObject({ alpha: 0 });
    expect(parseRgba('#000000ff')).toMatchObject({ alpha: 1 });
    expect(parseRgba('rgba(0, 0, 0, 0.4)')).toMatchObject({ alpha: 0.4 });
    expect(parseRgba('rgb(0 0 0 / 50%)')).toMatchObject({ alpha: 0.5 });
    expect(parseRgba('rgb(0 0 0 / 0.5)')).toMatchObject({ alpha: 0.5 });
  });

  it('is 1 when the form carries no alpha', () => {
    expect(parseRgba('#123456')).toMatchObject({ alpha: 1 });
    expect(parseRgba('rgb(1, 2, 3)')).toMatchObject({ rgb: [1, 2, 3], alpha: 1 });
  });

  it('declines a form it can only half-read, leaving it to the browser', () => {
    expect(parseRgba('rgb(100%, 0%, 0%)')).toBeNull();
    expect(parseRgba('color(srgb 1 0 0)')).toBeNull();
  });
});

describe('colorWithAlpha', () => {
  it('is a no-op at full opacity', () => {
    expect(colorWithAlpha('#abcdef', 1)).toBe('#abcdef');
  });

  it('returns null for a color it cannot read, so callers can fall back', () => {
    expect(colorWithAlpha('not-a-color', 0.5)).toBeNull();
  });

  // The picker's text field stores whatever CSS the user typed, so the
  // translucent forms have to compound rather than reset to opaque.
  it('compounds with the color own alpha in every syntax', () => {
    expect(colorWithAlpha('rgba(0, 0, 0, 0.5)', 0.5)).toBe('rgba(0, 0, 0, 0.25)');
    expect(colorWithAlpha('rgb(0 0 0 / 50%)', 0.5)).toBe('rgba(0, 0, 0, 0.25)');
    expect(colorWithAlpha('rgba(0 0 0 / 50%)', 0.5)).toBe('rgba(0, 0, 0, 0.25)');
    expect(colorWithAlpha('#00000080', 0.5)).toBe('rgba(0, 0, 0, 0.251)');
  });

  it('treats a broken alpha as no change rather than erasing the color', () => {
    expect(colorWithAlpha('#000000', Number.NaN)).toBe('#000000');
  });
});

describe('frameBackgroundColor', () => {
  // What a sticky table header paints so it doesn't repaint the un-baked
  // color at full strength over an already-faded frame.
  it('matches the background the frame drew', () => {
    expect(frameBackgroundColor({ ...BASE, opacity: 0.5, backdropBlur: 8 }))
      .toBe('rgba(0, 0, 0, 0.5)');
    expect(hostFrameStyle({ ...BASE, opacity: 0.5, backdropBlur: 8 }).backgroundColor)
      .toBe(frameBackgroundColor({ ...BASE, opacity: 0.5, backdropBlur: 8 }));
  });

  it('stays the raw color when the element carries the opacity itself', () => {
    expect(frameBackgroundColor({ ...BASE, opacity: 0.5 })).toBe('#000000');
  });
});

describe('moduleShadow', () => {
  it('is absent at zero and below', () => {
    expect(moduleShadow(0)).toBeUndefined();
    expect(moduleShadow(-1)).toBeUndefined();
  });

  it('matches the host shape: highlight, cast shadow, ambient ring', () => {
    const shadow = moduleShadow(16) ?? '';
    expect(shadow).toContain('inset 0 1px 0 rgba(255, 255, 255, 0.12)');
    expect(shadow).toContain('0 8px 16px rgba(0, 0, 0, 0.8)');
    expect(shadow).toContain('0 0 8px rgba(255, 255, 255, 0.04)');
  });
});
