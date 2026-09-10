import { useGpuTaskFilterCardStore } from '@/data/store/modules/filter/GpuTaskFilterCard';
import React from 'react';
import GpuTaskListCard from './Task/GpuTaskListCard';
import GpuUsageCard from './Usage/GpuUsageCard';

import styles from './GpuDevice.less';

interface Props {
  /**
   * 本卡的实时快照，来自上层的单机 `/gpu` 请求。
   *
   * 旧实现在这里用 useGpuName 单独轮询 `gpu_usage_info?gpuIndex=N` 只为了拿一个
   * 卡名，而同一份数据 GpuUsageCard 又拉了一遍。现在卡名直接来自快照。
   */
  card: API.RealtimeGpuCard;
}

const GpuDevice: React.FC<Props> = (props) => {
  const { card } = props;
  const gpuNameFilter = useGpuTaskFilterCardStore(
    (state) => state.gpuNameFilter,
  );

  const gpuName = card.gpuName;

  // 检查是否应该显示此GPU卡（基于卡名筛选）
  const shouldShowByGpuName = (name: string | undefined): boolean => {
    // 如果卡名筛选未启用，显示所有卡
    if (!gpuNameFilter.enabled) {
      return true;
    }

    // 如果没有设置卡名筛选条件，显示所有卡
    if (!gpuNameFilter.gpuName) {
      return true;
    }

    // 如果没有GPU卡名称信息，显示此卡
    if (!name) {
      return true;
    }

    // 进行卡名匹配
    if (gpuNameFilter.isFuzzyMatch) {
      // 模糊匹配：检查是否包含关键词
      return name.toLowerCase().includes(gpuNameFilter.gpuName.toLowerCase());
    } else {
      // 精确匹配：检查是否完全匹配
      return name.toLowerCase() === gpuNameFilter.gpuName.toLowerCase();
    }
  };

  // 如果不应该显示此GPU设备，返回null
  if (!shouldShowByGpuName(gpuName)) {
    return null;
  }

  return (
    <div className={styles.gpuDevice}>
      <div className={styles.gpuUsageDiv}>
        <GpuUsageCard gpuIndex={card.gpuId} card={card} />
      </div>

      <div className={styles.gpuTaskDiv}>
        <GpuTaskListCard tasks={card.tasks} />
      </div>
    </div>
  );
};

export default GpuDevice;
