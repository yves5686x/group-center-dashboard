import { getReadableAccentText } from '@/utils/Convert/Contrast';
import { STATUS_COLORS } from '@/utils/StatusColors';
import { theme } from 'antd';
import type { CSSProperties, PropsWithChildren } from 'react';

const WorkspaceSurface = ({ children }: PropsWithChildren) => {
  const { token } = theme.useToken();
  const accent = getReadableAccentText(token.colorPrimary, [
    token.colorBgContainer,
    token.colorPrimaryBg,
    token.colorPrimaryBgHover,
  ]);
  return (
    <div
      className="app-workspace"
      style={
        {
          '--gc-color-accent-text': accent,
          '--gc-color-success': STATUS_COLORS.success,
          '--gc-color-warning': STATUS_COLORS.warning,
          '--gc-color-error': STATUS_COLORS.error,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
};

export default WorkspaceSurface;
