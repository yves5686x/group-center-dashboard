/**
 * 根据实时快照判断是否需要展示空态，以及展示什么文案。
 *
 * 聚合层的降级路径有四条（见 API.RealtimeSource），加上「后端没配 agent
 * 地址」和「前端请求本身失败」两种情况，如果分散在各页面各写一遍很容易漏。
 */

export interface SnapshotEmptyState {
  title: string;
  description?: string | null;
}

interface SnapshotLike {
  source: API.RealtimeSource;
  error?: string | null;
  agentOnline?: boolean;
}

interface Options {
  /** 是否还在等第一次响应 */
  loading: boolean;
  /** 前端轮询捕获到的异常信息 */
  fetchError?: string;
  /** 机器列表里的 hasApiUrl，false 表示后端根本没配 agent 地址 */
  hasApiUrl?: boolean;
  /** 快照数组是否为空 */
  isEmptySnapshot: boolean;
  /** 有数据但一条都不剩（例如全被筛选掉）时的文案 */
  emptyAfterFilterTitle?: string;
}

/**
 * 返回 null 表示应当正常渲染数据；返回对象表示应当渲染 RealtimeEmptyState。
 */
export const getSnapshotEmptyState = (
  snapshot: SnapshotLike | undefined,
  options: Options,
): SnapshotEmptyState | null => {
  const {
    loading,
    fetchError,
    hasApiUrl,
    isEmptySnapshot,
    emptyAfterFilterTitle = '没有匹配的内容',
  } = options;

  // 后端根本没配 agent 地址。这一条要排在 source=none 前面：没配地址时后端
  // 同样会回 source=none + "connection refused"，但那是结果不是原因，
  // 照着念会让用户去查网络，实际上该找管理员补配置。
  if (hasApiUrl === false) {
    return {
      title: '该机器未配置 Agent 地址',
      description:
        snapshot?.error ??
        fetchError ??
        '请联系管理员在 group-center 中补全该机器的 agent 配置',
    };
  }

  // 从没成功拿到过数据
  if (!snapshot) {
    if (loading) {
      return { title: '正在获取实时数据...' };
    }
    return {
      title: '暂时无法获取实时数据',
      description: fetchError ?? '机器可能不可达，稍后会自动重试',
    };
  }

  // source=none：后端明确说没有数据
  if (snapshot.source === 'none') {
    return {
      title: snapshot.agentOnline === false ? '机器不可达' : '暂无数据',
      description:
        snapshot.error ?? fetchError ?? '后端从未成功拉取到该机器的数据',
    };
  }

  // last-known-good 且快照为空：只能提示，没有旧值可用
  if (isEmptySnapshot) {
    if (snapshot.source === 'last-known-good') {
      return {
        title: '数据可能过期，且当前无可用快照',
        description: snapshot.error ?? fetchError,
      };
    }
    return { title: emptyAfterFilterTitle };
  }

  return null;
};

export default { getSnapshotEmptyState };
