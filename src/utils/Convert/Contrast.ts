type Rgba = [number, number, number, number];

const clamp = (value: number, max = 255) => Math.max(0, Math.min(max, value));

const parseColor = (color: string): Rgba | null => {
  let hex = color.replace(/^#/, '');
  if (color.startsWith('#') && /^[\da-f]{3,8}$/i.test(hex)) {
    if (hex.length === 3 || hex.length === 4)
      hex = [...hex].map((part) => part + part).join('');
    if (hex.length === 6 || hex.length === 8)
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      ];
  }

  const rgb = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const parts = rgb[1].trim().split(/[\s,/]+/);
  if (parts.length < 3 || parts.length > 4) return null;
  const values = parts.map((part, index) => {
    const value = parseFloat(part);
    return part.endsWith('%') ? value * (index === 3 ? 0.01 : 2.55) : value;
  });
  if (!values.every(Number.isFinite)) return null;
  return [
    clamp(values[0]),
    clamp(values[1]),
    clamp(values[2]),
    clamp(values[3] ?? 1, 1),
  ];
};

const composite = (foreground: Rgba, background: Rgba): Rgba =>
  [
    ...foreground
      .slice(0, 3)
      .map(
        (value, index) =>
          value * foreground[3] + background[index] * (1 - foreground[3]),
      ),
    1,
  ] as Rgba;

const luminance = (rgb: Rgba) => {
  const [red, green, blue] = rgb.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const toHex = (rgb: Rgba) =>
  '#' +
  rgb
    .slice(0, 3)
    .map((value) => Math.round(value).toString(16).padStart(2, '0'))
    .join('');

export const getOpaqueColor = (foreground: string, surface: string) => {
  const fg = parseColor(foreground);
  const bg = parseColor(surface);
  return fg && bg && bg[3] === 1 ? toHex(composite(fg, bg)) : surface;
};

/** Compare the rendered foreground, including its alpha, with a solid surface. */
export const getContrastRatio = (foreground: string, background: string) => {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg || bg[3] !== 1) return NaN;
  const first = luminance(composite(fg, bg));
  const second = luminance(bg);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

/** Keep the hue where possible; move toward black/white only when needed. */
export const getReadableTextColor = (
  foreground: string,
  background: string,
  minimum = 4.5,
) => {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (
    !fg ||
    !bg ||
    bg[3] !== 1 ||
    getContrastRatio(foreground, background) >= minimum
  )
    return foreground;
  const target =
    getContrastRatio('#000000', background) >=
    getContrastRatio('#ffffff', background)
      ? 0
      : 255;
  const rendered = composite(fg, bg);
  for (let step = 1; step <= 100; step++) {
    const mixed = [
      ...rendered
        .slice(0, 3)
        .map((value) => value + ((target - value) * step) / 100),
      1,
    ] as Rgba;
    const candidate = toHex(mixed);
    if (getContrastRatio(candidate, background) >= minimum) return candidate;
  }
  return target === 0 ? '#000000' : '#ffffff';
};

export const getReadableTagColors = (
  accent: string,
  surface: string,
  text: string,
) => {
  const fg = parseColor(accent);
  const bg = parseColor(surface);
  if (!fg || !bg || bg[3] !== 1)
    return { background: surface, foreground: text, border: accent };
  const background = toHex(composite([fg[0], fg[1], fg[2], 0.14], bg));
  return {
    background,
    foreground: getReadableTextColor(text, background),
    border: getReadableTextColor(accent, background, 3),
  };
};

/** One accent foreground shared by card links and tinted filter buttons. */
export const getReadableAccentText = (foreground: string, surfaces: string[]) =>
  surfaces.reduce(
    (color, surface) => getReadableTextColor(color, surface),
    foreground,
  );
