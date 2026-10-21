import { Button, Result } from 'antd';
import React from 'react';
import { history, useLocation } from 'umi';

class ContentBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Page rendering failed', error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <Result
          status="error"
          title="页面加载失败"
          subTitle="请刷新后重试，也可以使用左侧菜单访问其他页面。"
          extra={[
            <Button
              key="reload"
              type="primary"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>,
            <Button key="home" onClick={() => history.push('/home')}>
              返回首页
            </Button>,
          ]}
        />
      );
    }
    return this.props.children;
  }
}

const RouteContentBoundary: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { pathname } = useLocation();
  return <ContentBoundary key={pathname}>{children}</ContentBoundary>;
};

export default RouteContentBoundary;
