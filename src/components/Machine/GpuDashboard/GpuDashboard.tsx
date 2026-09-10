import {
  RealtimeEmptyState,
  RealtimeStatusBadge,
  getSnapshotEmptyState,
} from '@/components/Machine/Realtime';
import { useGpuTaskFilterCardStore } from '@/data/store/modules/filter/GpuTaskFilterCard';
import {
  DISK_SNAPSHOT_POLL_INTERVAL,
  GPU_SNAPSHOT_POLL_INTERVAL,
  useRealtimeDiskSnapshot,
  useRealtimeGpuSnapshot,
} from '@/hooks/useRealtime';
import { convertFromMBToGB, getMemoryString } from '@/utils/Convert/MemorySize';
import { Card, Tooltip, theme } from 'antd';
import React, { useState } from 'react';
import GpuDevice from './GpuDevice';

import { SyncOutlined } from '@ant-design/icons';
import {
  ControlledMenu as ContextMenu,
  MenuDivider as ContextMenuDivider,
  MenuItem as ContextMenuItem,
} from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/theme-dark.css';
import '@szhsin/react-menu/dist/transitions/zoom.css';

import styles from './GpuDashboard.less';

interface Props {
  machine: API.RealtimeMachine;
}

/** 内存条的颜色分档，物理内存与虚拟内存共用 */
const memoryBarColor = (
  percent: number,
  token: ReturnType<typeof theme.useToken>['token'],
  baseColor: string,
) => {
  if (percent > 80) return token.colorError;
  if (percent > 60) return token.colorWarning;
  return baseColor;
};

const GpuDashboard: React.FC<Props> = (props) => {
  const { machine } = props;
  const { token } = theme.useToken();

  // 右键菜单状态
  const [isContextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuAnchorPoint, setContextMenuAnchorPoint] = useState({
    x: 0,
    y: 0,
  });

  // 整机一次请求拿到所有卡（含空闲卡）与卡上任务，替代旧的
  // gpu_count + 逐卡 gpu_usage_info + 逐卡 gpu_task_info。
  const gpuState = useRealtimeGpuSnapshot(
    machine.serverNameEng,
    GPU_SNAPSHOT_POLL_INTERVAL,
  );

  // 系统内存在 /disk 的 system 字段里，变化慢，用更长的间隔单独轮询。
  const diskState = useRealtimeDiskSnapshot(
    machine.serverNameEng,
    DISK_SNAPSHOT_POLL_INTERVAL,
  );

  const gpuIdFilter = useGpuTaskFilterCardStore((state) => state.gpuIdFilter);

  const snapshot = gpuState.data;
  const cards = snapshot?.snapshot ?? [];
  // system 可能为 null（后端明确允许）
  const machineSystemInfo = diskState.data?.system ?? undefined;

  // 检查GPU卡是否应该显示（仅按卡号筛选）
  const shouldShowGpuCard = (gpuIndex: number): boolean => {
    // 如果按卡号筛选未启用，显示所有卡
    if (!gpuIdFilter.enabled) {
      return true;
    }

    // 检查范围筛选
    if (gpuIdFilter.range) {
      const { min, max } = gpuIdFilter.range;
      if (gpuIndex >= min && gpuIndex <= max) {
        return true;
      }
    }

    // 检查具体卡号筛选
    if (gpuIdFilter.gpuIds.length > 0) {
      if (gpuIdFilter.gpuIds.includes(gpuIndex)) {
        return true;
      }
    }

    // 如果既没有范围也没有具体卡号，显示所有卡
    if (!gpuIdFilter.range && gpuIdFilter.gpuIds.length === 0) {
      return true;
    }

    return false;
  };

  const visibleCards = cards.filter((card) => shouldShowGpuCard(card.gpuId));

  const emptyState = getSnapshotEmptyState(snapshot, {
    loading: gpuState.loading && !snapshot,
    fetchError: gpuState.error,
    hasApiUrl: machine.hasApiUrl,
    isEmptySnapshot: cards.length === 0 || (snapshot?.gpuCount ?? 0) === 0,
    emptyAfterFilterTitle: '未检测到GPU?!',
  });

  const gpuInfoContent = () => {
    // 取不到数据 / 后端说没有数据 / 这台机器没有 GPU
    if (emptyState) {
      return (
        <RealtimeEmptyState
          title={emptyState.title}
          description={emptyState.description}
          loading={gpuState.loading && !snapshot}
        />
      );
    }

    // 有卡但全被筛选掉了，这和「没有 GPU」是两回事，要分开提示
    if (visibleCards.length === 0) {
      return (
        <div className={styles.noGpuDiv}>
          <p>没有匹配的GPU卡</p>
          <p>请调整按卡筛选设置</p>
        </div>
      );
    }

    return (
      <div className={styles.gpuInfoList}>
        {visibleCards.map((card) => (
          <div key={card.gpuId} className={styles.gpuInfoItem}>
            <GpuDevice card={card} />
          </div>
        ))}
      </div>
    );
  };

  // 构建内存信息提示内容
  const getMemoryPercent = (used?: number, total?: number) => {
    if (!total || total <= 0) return 0;
    return Math.round(((used ?? 0) / total) * 100);
  };

  const memoryRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  };
  const memoryBarTrackStyle: React.CSSProperties = {
    width: '100%',
    height: 8,
    backgroundColor: token.colorFillSecondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  };
  const memoryFootStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const renderMemoryBar = (
    label: string,
    usedMb: number,
    totalMb: number,
    baseColor: string,
  ) => {
    const percent = getMemoryPercent(usedMb, totalMb);

    return (
      <div>
        <div style={memoryRowStyle}>
          <span
            style={{
              fontWeight: 500,
              fontSize: '13px',
              color: token.colorTextSecondary,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontWeight: 'bold',
              fontSize: '13px',
              color: baseColor,
            }}
          >
            {percent}%
          </span>
        </div>
        <div style={memoryBarTrackStyle}>
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              backgroundColor: memoryBarColor(percent, token, baseColor),
              borderRadius: 4,
              transition: 'all 0.3s ease',
            }}
          />
        </div>
        <div style={memoryFootStyle}>
          <span style={{ fontSize: '11px', color: token.colorTextSecondary }}>
            {getMemoryString(convertFromMBToGB(usedMb))} /{' '}
            {getMemoryString(convertFromMBToGB(totalMb))} GB
          </span>
          <span style={{ fontSize: '11px', color: token.colorTextTertiary }}>
            可用: {getMemoryString(convertFromMBToGB(totalMb - usedMb))} GB
          </span>
        </div>
      </div>
    );
  };

  const memoryTooltipContent = machineSystemInfo ? (
    <div style={{ minWidth: 200, padding: '16px 12px' }}>
      <div
        style={{
          marginBottom: 16,
          fontWeight: 'bold',
          fontSize: '14px',
          textAlign: 'center',
          color: token.colorText,
        }}
      >
        系统内存信息
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {renderMemoryBar(
          '物理内存',
          machineSystemInfo.memoryPhysicUsedMb,
          machineSystemInfo.memoryPhysicTotalMb,
          token.colorPrimary,
        )}
        {renderMemoryBar(
          '虚拟内存',
          machineSystemInfo.memorySwapUsedMb,
          machineSystemInfo.memorySwapTotalMb,
          token.colorSuccess,
        )}
      </div>
    </div>
  ) : (
    <div
      style={{
        minWidth: 160,
        padding: '12px',
        textAlign: 'center',
        color: token.colorText,
        fontSize: '12px',
      }}
    >
      {/* system 字段后端允许为 null，和「还没加载出来」要区分开 */}
      {diskState.data ? '该机未提供内存信息' : '正在加载内存信息...'}
    </div>
  );

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuAnchorPoint({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  };

  return (
    <div id={`device-${machine.serverNameEng}`}>
      <ContextMenu
        anchorPoint={contextMenuAnchorPoint}
        state={isContextMenuOpen ? 'open' : 'closed'}
        menuStyle={{
          zIndex: 1000,
        }}
        theming={token.colorBgElevated === '#141414' ? 'dark' : undefined}
        direction="right"
        onClose={() => setContextMenuOpen(false)}
      >
        <ContextMenuItem disabled>{machine.serverName}</ContextMenuItem>
        <ContextMenuItem disabled>{machine.serverNameEng}</ContextMenuItem>
        {machine.position ? (
          <ContextMenuItem disabled>{machine.position}</ContextMenuItem>
        ) : null}
        <ContextMenuDivider />
        {/*
          update_nvi_notify 是打在 agent 上的写操作。实时数据改走同源聚合层后，
          前端拿不到 agent 地址（聚合层是只读的，也不再返回 machineUrl），
          这个动作暂时无法执行，所以显式置灰并写明原因，而不是悄悄删掉。
          后端若提供写操作代理，这里可以直接恢复。
        */}
        <ContextMenuItem disabled>
          <SyncOutlined style={{ marginRight: '8px', opacity: 0.4 }} />
          Update nvi-notify（聚合层暂不支持写操作）
        </ContextMenuItem>
      </ContextMenu>

      <Card
        style={{
          marginBottom: 16,
          cursor: 'context-menu',
          backgroundColor: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: '12px 16px' } }}
        onContextMenu={handleContextMenu}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <Tooltip
            title={memoryTooltipContent}
            placement="top"
            color={token.colorBgElevated}
          >
            <h1 className={styles.title} style={{ cursor: 'help', margin: 0 }}>
              {machine.serverName}
            </h1>
          </Tooltip>

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
      </Card>
      {gpuInfoContent()}
    </div>
  );
};

export default GpuDashboard;
