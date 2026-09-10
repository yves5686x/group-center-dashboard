import { Empty, Skeleton } from 'antd';
import React from 'react';

interface Props {
  /** 主提示文案 */
  title: string;
  /** 补充说明，通常来自后端的 error 字段或前端捕获的异常 */
  description?: string | null;
  /** 仍在等第一次响应时显示骨架屏而不是「暂无数据」 */
  loading?: boolean;
}

/**
 * 实时数据取不到时的统一空态。
 *
 * 旧实现遇到取数失败会直接渲染空白（用户完全不知道发生了什么），这里把
 * 「正在加载 / 未配置 agent / 机器不可达 / 取数失败」区分开并给出后端说明。
 */
const RealtimeEmptyState: React.FC<Props> = (props) => {
  const { title, description, loading = false } = props;

  if (loading) {
    return <Skeleton active paragraph={{ rows: 2 }} />;
  }

  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div style={{ fontSize: 13 }}>
          <div>{title}</div>
          {description ? (
            <div
              style={{ marginTop: 4, opacity: 0.65, wordBreak: 'break-all' }}
            >
              {description}
            </div>
          ) : null}
        </div>
      }
    />
  );
};

export default RealtimeEmptyState;
