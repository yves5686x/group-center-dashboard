import {
  RealtimeEmptyState,
  RealtimeStatusBadge,
  getSnapshotEmptyState,
} from '@/components/Machine/Realtime';
import {
  DISK_SNAPSHOT_POLL_INTERVAL,
  useRealtimeDiskSnapshot,
} from '@/hooks/useRealtime';
import { Card } from 'antd';
import React from 'react';
import DiskUsageCard from './DiskUsageCard';
import styles from './MachineDisk.less';

interface Props {
  machine: API.RealtimeMachine;
}

/**
 * 单机磁盘看板。
 *
 * 旧实现拿 machineUrl 直连 agent 的 `disk_usage`，且只在挂载时取一次；现在
 * 改走同源 `/web/open/realtime/machines/{serverNameEng}/disk`，一次同时拿到
 * 挂载点快照与系统内存，并带上 source / stale 这些降级信息。
 */
const MachineDisk: React.FC<Props> = (props) => {
  const { machine } = props;

  const diskState = useRealtimeDiskSnapshot(
    machine.serverNameEng,
    DISK_SNAPSHOT_POLL_INTERVAL,
  );

  const snapshot = diskState.data;
  const mountList = snapshot?.snapshot ?? [];

  const emptyState = getSnapshotEmptyState(snapshot, {
    loading: diskState.loading && !snapshot,
    fetchError: diskState.error,
    hasApiUrl: machine.hasApiUrl,
    isEmptySnapshot: mountList.length === 0,
    emptyAfterFilterTitle: '暂无任何硬盘挂载点',
  });

  return (
    <div className={styles.deviceCardDiv}>
      <Card
        size="default"
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>{machine.serverName}</span>

            {snapshot ? (
              <RealtimeStatusBadge
                agentOnline={snapshot.agentOnline}
                stale={snapshot.stale}
                source={snapshot.source}
                freshness={snapshot.freshness}
                snapshotTime={snapshot.snapshotTime}
                error={snapshot.error}
              />
            ) : (
              // 还没拿到快照时，先用机器列表里的心跳与过期标记顶上
              <RealtimeStatusBadge
                agentOnline={machine.agentOnline}
                stale={machine.stale}
                source="none"
                freshness={machine.freshness}
                snapshotTime={machine.snapshotTime}
              />
            )}
          </div>
        }
      >
        {emptyState ? (
          <RealtimeEmptyState
            title={emptyState.title}
            description={emptyState.description}
            loading={diskState.loading && !snapshot}
          />
        ) : (
          <div className={styles.diskList}>
            {mountList.map((diskUsage) => (
              <div key={diskUsage.mountPoint} className={styles.diskItem}>
                <DiskUsageCard diskUsage={diskUsage} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MachineDisk;
