import { getMachineDisplayName } from '@/utils/machinePresentation';
import { EyeOutlined } from '@ant-design/icons';
import { Card, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useRef } from 'react';
import TaskDetailModal, { TaskDetailModalHandles } from './TaskDetailModal';

const { Text } = Typography;

interface TaskResultTableProps {
  data: API.GpuTaskInfo[];
  loading: boolean;
  total: number;
  queryParams: API.queryGpuTasksSimpleParams;
  onParamsChange: (params: API.queryGpuTasksSimpleParams) => void;
}

const TaskResultTable: React.FC<TaskResultTableProps> = ({
  data,
  loading,
  total,
  queryParams,
  onParamsChange,
}) => {
  const detailModalRef = useRef<TaskDetailModalHandles>(null);
  const [selectedTask, setSelectedTask] =
    React.useState<API.GpuTaskInfo | null>(null);

  const handleViewDetail = (task: API.GpuTaskInfo) => {
    setSelectedTask(task);
    if (detailModalRef.current) {
      detailModalRef.current.tryToShowModal();
    }
  };
  const formatMemory = (memory: number) => {
    if (memory >= 1024) {
      return `${(memory / 1024).toFixed(1)} GB`;
    }
    return `${memory} MB`;
  };

  const formatTime = (timestamp: number) => {
    // 后端返回的时间戳是秒级的，需要乘以1000转换为毫秒级
    if (!timestamp || timestamp <= 0) {
      return '-';
    }

    // 检查时间戳是否已经是毫秒级（大于10^12表示毫秒级）
    const timestampMs = timestamp > 1e12 ? timestamp : timestamp * 1000;

    // 添加调试日志
    console.log(
      '时间戳格式化:',
      timestamp,
      '->',
      timestampMs,
      new Date(timestampMs),
    );

    try {
      return new Date(timestampMs).toLocaleString('zh-CN');
    } catch (error) {
      console.error('时间戳格式化错误:', timestamp, error);
      return '格式错误';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分钟`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}小时`;
    } else {
      return `${Math.floor(seconds / 86400)}天`;
    }
  };

  const getStatusTag = (task: API.GpuTaskInfo) => {
    const status = task.taskStatus;
    const colorMap: Record<string, string> = {
      RUNNING: 'blue',
      COMPLETED: 'green',
      FAILED: 'red',
      CANCELLED: 'orange',
      PENDING: 'default',
    };

    return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 120,
      render: (text: string) => (
        <Text
          copyable={{ text }}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
        >
          {text.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: '用户',
      dataIndex: 'taskUser',
      key: 'taskUser',
      width: 100,
    },
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '服务器',
      dataIndex: 'serverName',
      key: 'serverName',
      width: 120,
      render: (_: string, record: API.GpuTaskInfo) =>
        getMachineDisplayName(record),
    },
    {
      title: '显卡型号',
      dataIndex: 'taskGpuName',
      key: 'taskGpuName',
      width: 100,
      render: (text: string, record: API.GpuTaskInfo) => (
        <div>
          <div>{text}</div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ant-color-text-tertiary)',
            }}
          >
            ID: {record.taskGpuId}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'taskStatus',
      key: 'taskStatus',
      width: 100,
      render: (text: string, record: API.GpuTaskInfo) => getStatusTag(record),
    },
    {
      title: '开始时间',
      dataIndex: 'taskStartTime',
      key: 'taskStartTime',
      width: 160,
      render: (timestamp: number) => formatTime(timestamp),
      sorter: true,
    },
    {
      title: '运行时长',
      dataIndex: 'taskRunningTimeInSeconds',
      key: 'taskRunningTimeInSeconds',
      width: 100,
      render: (seconds: number) => formatDuration(seconds),
      sorter: true,
    },
    {
      title: 'GPU使用率',
      dataIndex: 'gpuUsagePercent',
      key: 'gpuUsagePercent',
      width: 100,
      render: (percent: number) => `${percent}%`,
      sorter: true,
    },
    {
      title: '显存使用',
      dataIndex: 'taskGpuMemoryGb',
      key: 'taskGpuMemoryGb',
      width: 100,
      render: (memory: number, record: API.GpuTaskInfo) => (
        <div>
          <div>{formatMemory(memory * 1024)}</div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--ant-color-text-tertiary)',
            }}
          >
            {record.gpuMemoryPercent}%
          </div>
        </div>
      ),
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: API.GpuTaskInfo) => (
        <Tooltip title="查看详情">
          <EyeOutlined
            style={{ color: '#1890ff', cursor: 'pointer' }}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    const newParams: API.queryGpuTasksSimpleParams = {
      ...queryParams,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    if (sorter.field) {
      newParams.sortBy = sorter.field.toUpperCase();
      newParams.sortOrder = sorter.order === 'ascend' ? 'ASC' : 'DESC';
    }

    onParamsChange(newParams);
  };

  return (
    <>
      <Card title={`查询结果 (${total} 条)`} size="small">
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="taskId"
          scroll={{ x: 1300 }}
          pagination={{
            current: queryParams.page || 1,
            pageSize: queryParams.pageSize || 20,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {selectedTask && (
        <TaskDetailModal ref={detailModalRef} taskInfo={selectedTask} />
      )}
    </>
  );
};

export default TaskResultTable;
