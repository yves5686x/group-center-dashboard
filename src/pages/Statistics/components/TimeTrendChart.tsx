import { getTimeTrendStatistics } from '@/services/group_center/dashboardStatistics';
import { GetIsDarkMode } from '@/utils/AntD5/AntD5DarkMode';
import { calculateDateRange, getTimeRangeDisplayName } from '@/utils/dateRange';
import { Line } from '@ant-design/charts';
import {
  Alert,
  Card,
  Col,
  Collapse,
  Empty,
  Pagination,
  Row,
  Spin,
  Statistic,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { formatRuntime } from '../utils';

const { Panel } = Collapse;

interface TimeTrendChartProps {
  timePeriod: string;
}

interface DailyStat {
  date: string;
  totalTasks: number;
  totalRuntime: number;
  activeUsers: string[];
  peakGpuUsage: number;
  activeUsersCount: number;
  formattedPeakGpuUsage: number;
}

interface TimeTrendData {
  period: string;
  dailyStats: DailyStat[];
  totalTasks: number;
  totalRuntime: number;
  totalUsers: number;
  averageDailyTasks: number;
  averageDailyRuntime: number;
  refreshTime?: string;
}

const TimeTrendChart: React.FC<TimeTrendChartProps> = ({ timePeriod }) => {
  const [trendData, setTrendData] = useState<TimeTrendData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    fetchTimeTrendStatistics();
  }, [timePeriod]);

  const fetchTimeTrendStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTimeTrendStatistics({ timePeriod });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        setTrendData({
          ...(response.result as TimeTrendData),
          refreshTime: new Date().toLocaleString('zh-CN'),
        });
      } else {
        setError('获取时间趋势统计数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getTaskTrendData = () => {
    if (!trendData?.dailyStats) return [];

    return trendData.dailyStats.map((day) => ({
      date: day.date.split(' ')[0],
      tasks: day.totalTasks,
      runtime: Math.floor(day.totalRuntime / 3600),
      users: day.activeUsersCount,
    }));
  };

  const isDark = GetIsDarkMode();

  const lineConfig = {
    data: getTaskTrendData(),
    xField: 'date',
    yField: 'tasks',
    autoFit: true,
    theme: isDark ? 'dark' : 'light',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
        fontSize: 12,
      },
    },
    tooltip: {
      title: 'date',
      items: [
        {
          name: '任务数',
          field: 'tasks',
          formatter: (datum: any) => `${datum.tasks}个`,
        },
        {
          name: '运行时间',
          field: 'runtime',
          formatter: (datum: any) => `${datum.runtime}h`,
        },
        {
          name: '活跃用户',
          field: 'users',
          formatter: (datum: any) => `${datum.users}人`,
        },
      ],
    },
    xAxis: {
      type: 'cat',
      label: {
        autoRotate: true,
      },
    },
    yAxis: {
      label: {
        formatter: (v: number) => `${Math.round(v)}个`,
      },
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  const getCurrentPageData = () => {
    if (!trendData?.dailyStats) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return trendData.dailyStats.slice(startIndex, endIndex);
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) {
      setPageSize(size);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载时间趋势统计数据...</div>
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
          <a onClick={fetchTimeTrendStatistics} style={{ color: '#1890ff' }}>
            重试
          </a>
        }
      />
    );
  }

  if (!trendData?.dailyStats?.length) {
    return (
      <Empty
        description="暂无时间趋势统计数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const tableCellStyle = (
    isDarkMode: boolean,
    align: 'left' | 'right' = 'left',
  ) => ({
    padding: '8px',
    border: isDarkMode
      ? '1px solid rgba(255, 255, 255, 0.12)'
      : '1px solid #f0f0f0',
    textAlign: align,
  });

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="总任务数"
              value={trendData.totalTasks}
              valueStyle={{ color: 'var(--ant-color-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card>
            <Statistic
              title="总运行时间"
              value={formatRuntime(trendData.totalRuntime)}
              valueStyle={{ color: 'var(--ant-color-success)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="活跃用户数"
              value={trendData.totalUsers}
              valueStyle={{ color: 'var(--ant-color-warning)' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="任务数趋势"
        extra={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span style={{ color: '#666', fontSize: '12px' }}>
              时间范围: {getTimeRangeDisplayName(timePeriod)}
            </span>
            <span style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
              {calculateDateRange(timePeriod)}
            </span>
            {trendData.refreshTime && (
              <span
                style={{ color: '#999', fontSize: '11px', marginTop: '2px' }}
              >
                统计时间: {trendData.refreshTime}
              </span>
            )}
          </div>
        }
      >
        <div style={{ height: 400 }}>
          <Line {...lineConfig} />
        </div>
      </Card>

      <Collapse style={{ marginTop: 24 }}>
        <Panel header="详细数据" key="1">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: isDark
                      ? 'rgba(255, 255, 255, 0.04)'
                      : '#fafafa',
                  }}
                >
                  <th style={tableCellStyle(isDark)}>日期</th>
                  <th style={tableCellStyle(isDark, 'right')}>任务数</th>
                  <th style={tableCellStyle(isDark, 'right')}>总运行时间</th>
                  <th style={tableCellStyle(isDark, 'right')}>峰值GPU使用率</th>
                  <th style={tableCellStyle(isDark, 'right')}>活跃用户数</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().map((day, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index;
                  return (
                    <tr key={globalIndex}>
                      <td style={tableCellStyle(isDark)}>
                        {day.date.split(' ')[0]}
                      </td>
                      <td style={tableCellStyle(isDark, 'right')}>
                        {day.totalTasks}
                      </td>
                      <td style={tableCellStyle(isDark, 'right')}>
                        {formatRuntime(day.totalRuntime)}
                      </td>
                      <td style={tableCellStyle(isDark, 'right')}>
                        {day.peakGpuUsage.toFixed(1)}%
                      </td>
                      <td style={tableCellStyle(isDark, 'right')}>
                        {day.activeUsersCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {trendData.dailyStats.length > 0 && (
            <div
              style={{
                marginTop: 16,
                textAlign: 'right',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={trendData.dailyStats.length}
                showSizeChanger
                showQuickJumper
                showTotal={(total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                }
                onChange={handlePageChange}
                onShowSizeChange={handlePageChange}
                pageSizeOptions={['10', '20', '50', '100']}
              />
            </div>
          )}
        </Panel>
      </Collapse>
    </div>
  );
};

export default TimeTrendChart;
