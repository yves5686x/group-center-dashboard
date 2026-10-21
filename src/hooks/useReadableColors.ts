import { getReadableTextColor } from '@/utils/Convert/Contrast';
import { STATUS_COLORS } from '@/utils/StatusColors';
import { theme } from 'antd';
import { useMemo } from 'react';

export const useReadableColors = (surface?: string) => {
  const { token } = theme.useToken();
  return useMemo(() => {
    const onSurface = (color: string) =>
      getReadableTextColor(color, surface ?? token.colorBgContainer);
    return {
      primary: onSurface(token.colorPrimary),
      success: onSurface(STATUS_COLORS.success),
      warning: onSurface(STATUS_COLORS.warning),
      error: onSurface(STATUS_COLORS.error),
      info: onSurface(token.colorInfo),
      secondary: onSurface(token.colorTextSecondary),
    };
  }, [token, surface]);
};
