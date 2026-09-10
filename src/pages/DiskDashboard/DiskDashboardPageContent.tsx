import { Empty, Skeleton } from 'antd';
import React from 'react';

import MachineDisk from '@/components/Machine/MachineInfo/Hardware/Disk/MachineDisk';
import { useRealtimeMachineList } from '@/hooks/useRealtime';

interface Props {
  name?: string;
}

/**
 * 硬盘看板页。
 *
 * 机器列表改走同源聚合层 `/web/open/realtime/machines`，与 GPU 看板共用同一个
 * 端点（后端 5s TTL 缓存 + 去重，两个页面同时开着也只会拉一次 agent）。
 *
 * 这里不按 `gpu` 过滤：存储服务器同样有磁盘要看，旧实现也是全量展示。
 */
const DiskDashboardPageContent: React.FC<Props> = () => {
  const { data, loading, error } = useRealtimeMachineList();

  const machineList = data ?? [];

  if (loading && machineList.length === 0) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  if (machineList.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ fontSize: 13 }}>
            <div>没有可用的服务器</div>
            <div style={{ marginTop: 4, opacity: 0.65 }}>
              {error ?? '后端 /web/open/realtime/machines 没有返回任何机器'}
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div>
      {machineList.map((machine) => (
        <MachineDisk key={machine.serverNameEng} machine={machine} />
      ))}
    </div>
  );
};

export default DiskDashboardPageContent;
