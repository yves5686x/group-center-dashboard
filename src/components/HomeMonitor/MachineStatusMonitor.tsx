import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Space, Statistic, Tag, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';

import {
  getAllMachineStatus,
  getMachineStatusSummary,
} from '@/services/group_center/machineStatus';
import styles from './MachineStatusMonitor.less';

interface MachineStatusMonitorProps {
  refreshInterval?: number;
}

const MachineStatusMonitor: React.FC<MachineStatusMonitorProps> = ({
  refreshInterval = 30000,
}) => {
  const [machineStatus, setMachineStatus] = useState<
    API.MachineStatusResponse[]
  >([]);
  const [statusSummary, setStatusSummary] = useState<Record<
    string,
    any
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchMachineData = async (isManualRefresh = false) => {
    // 只有手动刷新时才设置refreshing状态
    if (isManualRefresh) {
      setRefreshing(true);
    }
    // 自动刷新时不设置loading状态，保持数据可见

    try {
      const [statusResponse, summaryResponse] = await Promise.all([
        getAllMachineStatus(),
        getMachineStatusSummary(),
      ]);

      setMachineStatus(statusResponse || []);
      setStatusSummary(summaryResponse || {});

      setLastUpdate(new Date());
      setFetchError(false);
    } catch (error) {
      console.error('获取机器状态数据失败:', error);
      // 出错时保持现有数据，不重置，但要给用户可见的提示
      setFetchError(true);
    } finally {
      // 只有手动刷新时才清除refreshing状态
      if (isManualRefresh) {
        setRefreshing(false);
      }
      // 自动刷新时不设置loading为false，因为初始加载后loading就一直是false
    }
  };

  useEffect(() => {
    fetchMachineData();

    const interval = setInterval(fetchMachineData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getPingStatusTag = (machine: API.MachineStatusResponse) => {
    const pingTag = machine.pingStatus ? (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        Ping正常
      </Tag>
    ) : (
      <Tag color="red" icon={<CloseCircleOutlined />}>
        Ping失败
      </Tag>
    );

    return (
      <Tooltip
        title={`最后Ping: ${machine.lastPingTimeFormatted || formatTime(machine.lastPingTime)}`}
        color="rgba(0, 0, 0, 0.75)"
      >
        {pingTag}
      </Tooltip>
    );
  };

  const getAgentStatusTag = (machine: API.MachineStatusResponse) => {
    const agentTag = machine.agentStatus ? (
      <Tag color="blue" icon={<CheckCircleOutlined />}>
        Agent在线
      </Tag>
    ) : (
      <Tag color="orange" icon={<CloseCircleOutlined />}>
        Agent离线
      </Tag>
    );

    return (
      <Tooltip
        title={`最后心跳: ${machine.lastHeartbeatTimeFormatted || formatTime(machine.lastHeartbeatTime)}`}
        color="rgba(0, 0, 0, 0.75)"
      >
        {agentTag}
      </Tooltip>
    );
  };

  // const getGpuTag = (machine: API.MachineStatusResponse) => {
  //   if (machine.isGpu) {
  //     return (
  //       <Tag color="purple" icon={<DesktopOutlined />}>
  //         GPU服务器
  //       </Tag>
  //     );
  //   }
  //   return <Tag color="default">普通服务器</Tag>;
  // };

  const formatTime = (timestamp?: number) => {
    if (!timestamp || timestamp <= 0) {
      return '未知';
    }

    // Java时间戳是毫秒级的，直接使用
    try {
      return new Date(timestamp).toLocaleString('zh-CN');
    } catch (error) {
      console.error('时间戳格式化错误:', timestamp, error);
      return '格式错误';
    }
  };

  const getMachineStatusColor = (machine: API.MachineStatusResponse) => {
    if (machine.pingStatus && machine.agentStatus) {
      return 'success';
    } else if (machine.pingStatus && !machine.agentStatus) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  return (
    <Card
      title="GPU服务器"
      loading={loading && machineStatus.length === 0}
      extra={
        <Space>
          <Tooltip title="刷新数据">
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => fetchMachineData(true)}
              loading={refreshing}
            >
              刷新
            </Button>
          </Tooltip>
          {lastUpdate && (
            <span style={{ fontSize: '12px', color: '#666' }}>
              最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
              {refreshing && ' (刷新中...)'}
            </span>
          )}
        </Space>
      }
      className={styles.machineMonitor}
    >
      {fetchError && (
        <Alert
          type="warning"
          showIcon
          message="监控数据获取失败，当前显示的可能是旧数据，将自动重试"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 状态摘要 */}
      {statusSummary && (
        <div className={styles.statusSummary}>
          <Space size="large" wrap>
            <Statistic
              title="总服务器数"
              value={machineStatus.length}
              valueStyle={{ color: '#1890ff' }}
            />
            <Statistic
              title="在线服务器"
              value={machineStatus.filter((m) => m.pingStatus).length}
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic
              title="Agent在线"
              value={machineStatus.filter((m) => m.agentStatus).length}
              valueStyle={{ color: '#722ed1' }}
            />
            <Statistic
              title="GPU服务器"
              value={machineStatus.filter((m) => m.isGpu).length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Space>
        </div>
      )}

      {/* 服务器卡片容器 */}
      <div className={styles.machineCardsContainer}>
        {machineStatus.map((machine) => (
          <Card
            key={machine.name}
            size="small"
            className={`${styles.machineCard} ${styles[getMachineStatusColor(machine)]}`}
          >
            <div className={styles.cardHeader}>
              <span className={styles.machineName}>{machine.name}</span>
              <span className={styles.machinePosition}>{machine.position}</span>
            </div>

            <div className={styles.cardContent}>
              <div className={styles.statusTags}>
                <Space size="small" wrap>
                  {getPingStatusTag(machine)}
                  {getAgentStatusTag(machine)}
                  {/* {getGpuTag(machine)} */}
                </Space>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};

export default MachineStatusMonitor;
