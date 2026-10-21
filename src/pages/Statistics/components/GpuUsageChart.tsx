import { useReadableChartTheme } from '@/hooks/useReadableChartTheme';
import { useReadableColors } from '@/hooks/useReadableColors';
import { getGpuStatistics } from '@/services/group_center/dashboardStatistics';
import { calculateDateRange, getTimeRangeDisplayName } from '@/utils/dateRange';
import { Column, Pie } from '@ant-design/charts';
import { Alert, Card, Col, Empty, Row, Select, Spin, Statistic } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { mergeTopKWithOther } from '../utils';

const { Option } = Select;

interface GpuUsageChartProps {
  timePeriod: string;
}

interface GpuStat {
  gpuName: string;
  serverName: string;
  totalUsageCount: number;
  totalRuntime: number;
  averageMemoryUsage: number;
  totalMemoryUsage: number;
  formattedAverageMemoryUsage: number;
  formattedTotalMemoryUsage: number;
}

interface GpuStatisticsData {
  totalTasks: number;
  activeGpus: number;
  mostPopularGpu: string;
  mostPopularGpuTasks: number;
  usageByDevice: GpuStat[];
  refreshTime?: string;
}

const GpuUsageChart: React.FC<GpuUsageChartProps> = ({ timePeriod }) => {
  const colors = useReadableColors();
  const [gpuData, setGpuData] = useState<GpuStatisticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState<number | null>(10);

  useEffect(() => {
    fetchGpuStatistics();
  }, [timePeriod]);

  const fetchGpuStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getGpuStatistics({ timePeriod });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        Array.isArray(response.result)
      ) {
        const gpuStats = response.result as GpuStat[];

        const totalTasks = gpuStats.reduce(
          (sum, gpu) => sum + gpu.totalUsageCount,
          0,
        );
        const activeGpus = gpuStats.filter(
          (gpu) => gpu.totalUsageCount > 0,
        ).length;

        const gpuModelTaskCount = new Map<string, number>();
        gpuStats.forEach((gpu) => {
          const gpuModel = gpu.gpuName || '未知GPU';
          const currentCount = gpuModelTaskCount.get(gpuModel) || 0;
          gpuModelTaskCount.set(gpuModel, currentCount + gpu.totalUsageCount);
        });

        let mostPopularGpu = '暂无数据';
        let mostPopularGpuTasks = 0;
        gpuModelTaskCount.forEach((taskCount, gpuModel) => {
          if (taskCount > mostPopularGpuTasks) {
            mostPopularGpu = gpuModel;
            mostPopularGpuTasks = taskCount;
          }
        });

        setGpuData({
          totalTasks,
          activeGpus,
          mostPopularGpu,
          mostPopularGpuTasks,
          usageByDevice: gpuStats,
          refreshTime: new Date().toLocaleString('zh-CN'),
        });
      } else {
        setError('获取GPU统计数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 按服务器聚合（同型号的卡分布在多台服务器上，只看型号看不出在哪台机器）
  const serverSummary = useMemo(() => {
    if (!gpuData) return { map: new Map<string, number>(), list: [] };

    const map = new Map<string, number>();
    gpuData.usageByDevice.forEach((gpu) => {
      const server = gpu.serverName || '未知服务器';
      const currentCount = map.get(server) || 0;
      map.set(server, currentCount + (gpu.totalUsageCount || 0));
    });

    const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return { map, list };
  }, [gpuData]);

  // 每台服务器上用到过的 GPU 型号（汇总卡里展示）
  const serverGpuModels = useMemo(() => {
    const map = new Map<string, Set<string>>();
    gpuData?.usageByDevice.forEach((gpu) => {
      const server = gpu.serverName || '未知服务器';
      const model = gpu.gpuName || '未知GPU';
      if (!map.has(server)) map.set(server, new Set());
      map.get(server)!.add(model);
    });
    return map;
  }, [gpuData]);

  const getPieChartData = () => {
    if (!gpuData) return [];
    const allData = serverSummary.list.map(([server, taskCount]) => ({
      type: server,
      value: taskCount,
    }));
    return mergeTopKWithOther(allData, topK);
  };

  const getColumnChartData = () => {
    if (!gpuData) return [];

    const serverMap = new Map<
      string,
      Array<{ server: string; tasks: number }>
    >();

    gpuData.usageByDevice.forEach((gpu) => {
      const gpuModel = gpu.gpuName || '未知GPU';
      const server = gpu.serverName || '未知服务器';
      const tasks = gpu.totalUsageCount || 0;

      if (!serverMap.has(gpuModel)) {
        serverMap.set(gpuModel, []);
      }

      const serverList = serverMap.get(gpuModel)!;
      const existingServer = serverList.find((item) => item.server === server);
      if (existingServer) {
        existingServer.tasks += tasks;
      } else {
        serverList.push({ server, tasks });
      }
    });

    const result: Array<{
      gpu: string;
      server: string;
      tasks: number;
      category: string;
    }> = [];
    serverMap.forEach((serverList, gpuModel) => {
      serverList.forEach((serverData) => {
        result.push({
          gpu: gpuModel,
          category: JSON.stringify([gpuModel, serverData.server]),
          server: serverData.server,
          tasks: serverData.tasks,
        });
      });
    });
    return result;
  };

  const chartTheme = useReadableChartTheme();

  const pieConfig = {
    data: getPieChartData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    autoFit: true,
    theme: chartTheme,
    label: {
      text: 'type',
      position: 'outside' as const,
      fill: colors.secondary,
      formatter: (text: string, item: any) => {
        return `${text}\n${item?.value || 0}个 (${item?.percentage || '0'}%)`;
      },
    },
    tooltip: {
      title: 'type',
      items: [
        {
          name: '任务数',
          field: 'value',
          formatter: (datum: any) => `${datum?.value || 0}个`,
        },
        {
          name: '占比',
          field: 'percentage',
          formatter: (datum: any) => `${datum?.percentage || '0'}%`,
        },
      ],
    },
    legend: {
      position: 'bottom' as const,
      layout: 'horizontal' as const,
      itemName: {
        formatter: (text: string) =>
          text.length > 15 ? text.substring(0, 15) + '...' : text,
      },
    },
    animation: {
      appear: {
        animation: 'fade-in',
        duration: 1000,
      },
    },
  };

  const columnData = getColumnChartData();
  const columnConfig = {
    data: columnData,
    xField: 'category',
    yField: 'tasks',
    colorField: 'server',
    autoFit: true,
    height: 360,
    paddingTop: 32,
    paddingBottom: 64,
    theme: chartTheme,
    style: { radiusTopLeft: 4, radiusTopRight: 4, maxWidth: 48 },
    label: {
      text: (datum: { tasks: number }) => `${datum.tasks}个`,
      position: 'top',
      fill: colors.secondary,
      fontSize: 12,
      fontWeight: 600,
      dy: -8,
      textBaseline: 'bottom',
    },
    axis: {
      x: {
        title: false,
        labelFormatter: (category: string) => {
          const item = columnData.find((datum) => datum.category === category);
          return item ? `${item.server}\n${item.gpu}` : category;
        },
        labelAutoHide: false,
        labelAutoRotate: false,
        labelAutoEllipsis: false,
        labelFill: colors.secondary,
        labelFontSize: 12,
        labelLineHeight: 18,
      },
      y: {
        title: '任务数',
        labelFormatter: (value: number) => `${Math.round(value)}`,
        labelFill: colors.secondary,
        titleFill: colors.secondary,
      },
    },
    tooltip: {
      title: (datum: { server: string; gpu: string }) =>
        `${datum.server} · ${datum.gpu}`,
      items: [{ name: '任务数', field: 'tasks' }],
    },
    // The server and GPU model are printed under every bar; no colour lookup is needed.
    legend: false as const,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载GPU统计数据...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <a onClick={fetchGpuStatistics} style={{ color: colors.primary }}>
            重试
          </a>
        }
      />
    );
  }

  if (!gpuData || gpuData.usageByDevice.length === 0) {
    return (
      <Empty
        description="暂无GPU统计数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="最受欢迎的GPU"
              value={gpuData.mostPopularGpu}
              valueStyle={{ color: colors.primary }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="最受欢迎GPU任务数"
              value={gpuData.mostPopularGpuTasks}
              valueStyle={{ color: colors.error }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={gpuData.totalTasks}
              valueStyle={{ color: colors.success }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="活跃GPU数量"
              value={gpuData.activeGpus}
              valueStyle={{ color: colors.info }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="各服务器任务数分布"
        style={{ marginBottom: 24 }}
        extra={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span
              style={{
                color: 'var(--ant-color-text-secondary)',
                fontSize: '12px',
              }}
            >
              时间范围: {getTimeRangeDisplayName(timePeriod)}{' '}
              {calculateDateRange(timePeriod)}
            </span>
            {gpuData.refreshTime && (
              <span
                style={{
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '11px',
                  marginTop: '2px',
                }}
              >
                统计时间: {gpuData.refreshTime}
              </span>
            )}
          </div>
        }
      >
        <Row gutter={16}>
          {serverSummary.list.map(([server, taskCount], index) => {
            const taskPercent =
              gpuData.totalTasks > 0
                ? ((taskCount / gpuData.totalTasks) * 100).toFixed(1)
                : '0';
            const gpuModels = Array.from(
              serverGpuModels.get(server) ?? [],
            ).join('、');

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={index}>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        marginBottom: 4,
                      }}
                    >
                      {server}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--ant-color-text-secondary)',
                        marginBottom: 8,
                      }}
                    >
                      {gpuModels}
                    </div>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: colors.primary,
                      }}
                    >
                      {taskCount}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--ant-color-text-secondary)',
                        marginTop: 4,
                      }}
                    >
                      占比: {taskPercent}%
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>各服务器任务数分布</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--ant-color-text-secondary)',
                    }}
                  >
                    显示前
                  </span>
                  <Select
                    value={topK}
                    onChange={setTopK}
                    style={{ width: 100 }}
                    size="small"
                  >
                    <Option value={5}>5</Option>
                    <Option value={10}>10</Option>
                    <Option value={15}>15</Option>
                    <Option value={20}>20</Option>
                    <Option value={25}>25</Option>
                    <Option value={null}>无限制</Option>
                  </Select>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--ant-color-text-secondary)',
                    }}
                  >
                    台服务器
                  </span>
                </div>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            {getPieChartData().length > 0 ? (
              <Pie {...pieConfig} />
            ) : (
              <Empty
                description="暂无GPU任务数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="GPU型号在各服务器的任务数对比"
            style={{ marginBottom: 16 }}
          >
            {columnData.length > 0 ? (
              <div
                role="region"
                aria-label="各服务器 GPU 任务数柱状图，可横向滚动"
                tabIndex={0}
                style={{ overflowX: 'auto' }}
              >
                <div
                  style={{
                    minWidth: Math.max(
                      320,
                      columnData.length *
                        Math.max(
                          128,
                          ...columnData.map(
                            (item) =>
                              Math.max(item.server.length, item.gpu.length) *
                                8 +
                              24,
                          ),
                        ),
                    ),
                  }}
                >
                  <Column {...columnConfig} />
                </div>
              </div>
            ) : (
              <Empty
                description="暂无GPU设备数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GpuUsageChart;
