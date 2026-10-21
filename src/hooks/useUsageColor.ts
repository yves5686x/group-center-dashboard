import { STATUS_COLORS } from '@/utils/StatusColors';

/** Resource occupancy: low < 40%, medium < 80%, high >= 80%. */
export const useUsageColor = () => (percent: number) =>
  percent >= 80
    ? STATUS_COLORS.error
    : percent >= 40
      ? STATUS_COLORS.warning
      : STATUS_COLORS.success;
