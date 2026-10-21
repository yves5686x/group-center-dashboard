import ReadableTag from '@/components/UI/ReadableTag';
import { SyncOutlined } from '@ant-design/icons';
import React from 'react';
import { getTaskGroupColor, getTaskGroupKey } from './GpuTagColor';

interface Props {
  taskInfo: API.RealtimeGpuTask;
}

const MultiGpuTag: React.FC<Props> = (props) => {
  const { taskInfo } = props;

  const worldSize = taskInfo.worldSize ?? 0;
  const isMultiGpu = worldSize > 1;
  const multiGpuString = `${(taskInfo.localRank ?? 0) + 1}/${worldSize}`;

  if (!isMultiGpu) return null;

  // 用 getTaskGroupKey 推导分组键（优先 topPythonPid，异常时降级），
  // 保证同一个多卡任务的 N 个 rank 仍然是同一种颜色。
  const color = getTaskGroupColor(getTaskGroupKey(taskInfo));

  return (
    <ReadableTag icon={<SyncOutlined spin />} accentColor={color}>
      <span>多卡{multiGpuString}</span>
    </ReadableTag>
  );
};

export default MultiGpuTag;
