import type { Settings } from '../../shared/contracts/settings';
import type { SizeMode, WindowKind } from '../../shared/contracts/window';

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const modeGeometry = {
  compact: { width: 440, height: 640, minWidth: 440, minHeight: 420 },
  regular: { width: 1000, height: 640, minWidth: 760, minHeight: 480 }
} as const;

export function windowGeometry(kind: WindowKind, mode: SizeMode) {
  if (kind === 'onboarding') return { width: 760, height: 510, minWidth: 760, minHeight: 510 };
  if (kind === 'settings') return { width: 800, height: 640, minWidth: 440, minHeight: 420 };
  return modeGeometry[mode];
}

/** All rectangles are Electron DIP work areas; never scale persisted coordinates by DPI. */
export function clampBounds(
  remembered: Rectangle | null,
  areas: readonly Rectangle[],
  mode: SizeMode,
  kind: WindowKind = 'main'
): Rectangle {
  const defaults = windowGeometry(kind, mode);
  const primary = areas[0];

  if (primary === undefined) throw new Error('No display work area is available.');
  const candidate = remembered ?? {
    x: primary.x + (primary.width - defaults.width) / 2,
    y: primary.y + (primary.height - defaults.height) / 2,
    width: defaults.width,
    height: defaults.height
  };
  const overlap = (display: Rectangle) =>
    Math.max(
      0,
      Math.min(candidate.x + candidate.width, display.x + display.width) -
        Math.max(candidate.x, display.x)
    ) *
    Math.max(
      0,
      Math.min(candidate.y + candidate.height, display.y + display.height) -
        Math.max(candidate.y, display.y)
    );
  const area = areas.reduce((best, next) => (overlap(next) > overlap(best) ? next : best), primary);
  const width = Math.min(
    area.width,
    kind === 'main' && mode === 'compact'
      ? defaults.width
      : Math.max(defaults.minWidth, candidate.width)
  );
  const height = Math.min(area.height, Math.max(defaults.minHeight, candidate.height));

  return {
    x: Math.round(Math.min(Math.max(candidate.x, area.x), area.x + area.width - width)),
    y: Math.round(Math.min(Math.max(candidate.y, area.y), area.y + area.height - height)),
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function initialBounds(settings: Settings, areas: readonly Rectangle[], kind: WindowKind) {
  return clampBounds(
    kind === 'main' ? settings.rememberedBounds[settings.defaultSizeMode] : null,
    areas,
    settings.defaultSizeMode,
    kind
  );
}
