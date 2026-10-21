/** Shared traffic-light hues for status indicators and resource meters in both themes. */
export const STATUS_COLORS = {
  success: '#22c55e',
  warning: '#f2c037',
  error: '#ef4444',
} as const;

export const STATUS_TAG_COLORS: Record<string, string> = {
  success: STATUS_COLORS.success,
  green: STATUS_COLORS.success,
  warning: STATUS_COLORS.warning,
  yellow: STATUS_COLORS.warning,
  gold: STATUS_COLORS.warning,
  orange: STATUS_COLORS.warning,
  error: STATUS_COLORS.error,
  red: STATUS_COLORS.error,
};
