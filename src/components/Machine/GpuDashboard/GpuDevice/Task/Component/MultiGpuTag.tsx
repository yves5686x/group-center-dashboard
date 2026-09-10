import VShow from '@/components/Vue/V-Show';
import { InvertHexColor } from '@/utils/Convert/Color';
import { SyncOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
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

  // 聚合层没有 topPythonPid，改用 getTaskGroupKey 推导分组键，
  // 保证同一个多卡任务的 N 个 rank 仍然是同一种颜色。
  const color = getTaskGroupColor(getTaskGroupKey(taskInfo));
  const fontColor = InvertHexColor(color);

  return (
    <>
      <VShow v-show={isMultiGpu}>
        <Tag
          icon={<SyncOutlined spin style={{ color: fontColor }} />}
          color={color}
        >
          <a style={{ color: fontColor }}>多卡{multiGpuString}</a>
        </Tag>
      </VShow>
    </>
  );
};

export default MultiGpuTag;
