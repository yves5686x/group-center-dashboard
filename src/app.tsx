// 运行时配置
import logoImg from '@/assets/logo.svg';
import type { RuntimeAntdConfig, RunTimeLayoutConfig } from '@umijs/max';
import { theme } from 'antd';
import ThemeSwitch from './components/UI/ThemeSwitch';
import { GetSystemTheme } from './utils/AntD5/AntD5DarkMode';

// 全局响应式样式（移动端优化）。
// 在这里 import 而不是在 .umirc.ts 的 styles 里配，原因见 .umirc.ts 注释。
import './global.less';

// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
export async function getInitialState(): Promise<{ name: string }> {
  return { name: 'Group Center' };
}

const systemIsDark = GetSystemTheme();

export const antd: RuntimeAntdConfig = (memo) => {
  memo.theme ??= {};

  memo.theme.algorithm = [
    systemIsDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  ];

  // memo.appConfig = {
  // 	message: {
  // 		// 配置 message 最大显示数，超过限制时，最早的消息会被自动关闭
  // 		maxCount: 3,
  // 	}
  // }

  return memo;
};

export const layout: RunTimeLayoutConfig = () => {
  return {
    logo: logoImg,
    menu: {
      locale: false,
    },
    actionsRender: () => [
      <div key="0">
        <ThemeSwitch />
      </div>,
    ],
    // footerRender: () => <Footer />,
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return <>{children}</>;
    },
  };
};
