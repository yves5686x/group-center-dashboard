import { getUserStatistics } from '@/services/group_center/dashboardStatistics';
import { GetIsDarkMode } from '@/utils/AntD5/AntD5DarkMode';
import { calculateDateRange, getTimeRangeDisplayName } from '@/utils/dateRange';
import { Pie } from '@ant-design/charts';
import {
  Alert,
  Card,
  Empty,
  List,
  Pagination,
  Progress,
  Select,
  Spin,
  Statistic,
  Tag,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { formatRuntime, mergeTopKWithOther } from '../utils';

const { Option } = Select;

interface UserStatisticsProps {
  timePeriod: string;
}

interface UserStat {
  userName: string;
  totalTasks: number;
  totalRuntime: number;
  averageRuntime: number;
  favoriteGpu: string;
  favoriteServer?: string;
  gpuModels?: string[];
  favoriteProject: string;
  formattedAverageRuntime: number;
}

interface UserStatisticsData {
  totalUsers: number;
  activeUsers: number;
  averageTasksPerUser: number;
  topUsers: UserStat[];
  refreshTime?: string;
}

const UserStatistics: React.FC<UserStatisticsProps> = ({ timePeriod }) => {
  const [userData, setUserData] = useState<UserStatisticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [topK, setTopK] = useState<number | null>(10);

  useEffect(() => {
    fetchUserStatistics();
  }, [timePeriod]);

  const fetchUserStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getUserStatistics({ timePeriod });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        const userStats = response.result as UserStat[];

        const totalUsers = userStats.length;
        const activeUsers = userStats.filter(
          (user) => user.totalTasks > 0,
        ).length;
        const totalTasks = userStats.reduce(
          (sum, user) => sum + user.totalTasks,
          0,
        );
        const averageTasksPerUser =
          totalUsers > 0 ? totalTasks / totalUsers : 0;

        setUserData({
          totalUsers,
          activeUsers,
          averageTasksPerUser,
          topUsers: userStats,
          refreshTime: new Date().toLocaleString('zh-CN'),
        });
      } else {
        setError('获取用户统计数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const calculateUsagePercentage = (
    user: UserStat,
    allUsers: UserStat[],
  ): number => {
    const totalRuntime = allUsers.reduce((sum, u) => sum + u.totalRuntime, 0);
    return totalRuntime > 0 ? (user.totalRuntime / totalRuntime) * 100 : 0;
  };

  const getCurrentPageUsers = () => {
    if (!userData) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return userData.topUsers.slice(startIndex, endIndex);
  };

  const getUserTimeDistributionData = () => {
    if (!userData) return [];

    const allData = userData.topUsers.map((user) => ({
      type: user.userName,
      value: user.totalRuntime,
      runtime: user.totalRuntime,
      tasks: user.totalTasks,
      favoriteGpu: user.favoriteGpu,
      favoriteServer: user.favoriteServer,
    }));

    return mergeTopKWithOther(allData, topK, (remaining) => ({
      runtime: remaining.reduce((sum, item) => sum + item.runtime, 0),
      tasks: remaining.reduce((sum, item) => sum + item.tasks, 0),
      favoriteGpu: '',
      favoriteServer: '',
    }));
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const isDark = GetIsDarkMode();

  const userTimePieConfig = {
    data: getUserTimeDistributionData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    autoFit: true,
    theme: isDark ? 'dark' : 'light',
    label: {
      text: 'type',
      position: 'outside' as const,
      formatter: (text: string, item: any) => {
        const percent = item.percentage || '0';
        return `${text} ${percent}%`;
      },
    },
    tooltip: {
      title: 'type',
      items: [
        {
          name: '运行时间',
          field: 'runtime',
          formatter: (datum: any) => formatRuntime(datum.runtime),
        },
        {
          name: '占比',
          field: 'percentage',
          formatter: (datum: any) => `${datum.percentage}%`,
        },
        {
          name: '任务数',
          field: 'tasks',
          formatter: (datum: any) => `${datum.tasks}个`,
        },
        {
          name: '常用显卡型号',
          field: 'favoriteGpu',
          formatter: (datum: any) => datum.favoriteGpu || 'N/A',
        },
        {
          name: '常用服务器',
          field: 'favoriteServer',
          formatter: (datum: any) => datum.favoriteServer || 'N/A',
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载用户统计数据...</div>
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
          <a onClick={fetchUserStatistics} style={{ color: '#1890ff' }}>
            重试
          </a>
        }
      />
    );
  }

  if (!userData || userData.topUsers.length === 0) {
    return (
      <Empty
        description="暂无用户统计数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              flexWrap: 'wrap',
            }}
          >
            <Statistic
              title="总用户数"
              value={userData.totalUsers}
              valueStyle={{ color: 'var(--ant-color-primary)' }}
            />
            <Statistic
              title="活跃用户"
              value={userData.activeUsers}
              valueStyle={{ color: 'var(--ant-color-success)' }}
            />
            <Statistic
              title="用户活跃率"
              value={(
                (userData.activeUsers / userData.totalUsers) *
                100
              ).toFixed(1)}
              valueStyle={{ color: 'var(--ant-color-warning)' }}
              suffix="%"
            />
            <Statistic
              title="人均任务数"
              value={userData.averageTasksPerUser.toFixed(1)}
              valueStyle={{ color: 'var(--ant-color-info)' }}
              precision={1}
            />
          </div>
        </Card>
      </div>

      <Card
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>用户时间占比分布</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '12px', color: '#666' }}>显示前</span>
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
              <span style={{ fontSize: '12px', color: '#666' }}>
                个用户 {topK ? '' : '(显示全部)'} (共 {userData.topUsers.length}{' '}
                个)
              </span>
            </div>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ height: 400 }}>
          <Pie {...userTimePieConfig} />
        </div>
      </Card>

      <Card
        title="用户使用排名"
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
            <span style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
              {calculateDateRange(timePeriod)}
            </span>
            {userData.refreshTime && (
              <span
                style={{ color: '#999', fontSize: '11px', marginTop: '2px' }}
              >
                统计时间: {userData.refreshTime}
              </span>
            )}
          </div>
        }
      >
        <List
          dataSource={getCurrentPageUsers()}
          renderItem={(user, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index;
            const usagePercentage = calculateUsagePercentage(
              user,
              userData.topUsers,
            );
            return (
              <List.Item>
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ width: 40, textAlign: 'center' }}>
                    <Tag
                      color={
                        globalIndex < 3
                          ? '#f50'
                          : globalIndex < 5
                            ? '#2db7f5'
                            : '#87d068'
                      }
                    >
                      #{globalIndex + 1}
                    </Tag>
                  </div>

                  <div style={{ flex: 1, margin: '0 16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 'bold' }}>
                        {user.userName}
                      </span>
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        常用显卡型号: {user.favoriteGpu || 'N/A'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: 4,
                      }}
                    >
                      <span>任务数: {user.totalTasks}</span>
                      <span>
                        总运行时间: {formatRuntime(user.totalRuntime)}
                      </span>
                      <span>使用占比: {usagePercentage.toFixed(1)}%</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: 4,
                      }}
                    >
                      <span>常用项目: {user.favoriteProject || 'N/A'}</span>
                      <span>
                        平均运行时间: {formatRuntime(user.averageRuntime)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px 16px',
                        fontSize: 12,
                        color: 'var(--ant-color-text-secondary)',
                        marginBottom: 4,
                      }}
                    >
                      <span>
                        常用服务器: {user.favoriteServer || '暂无数据'}
                      </span>
                      <span>
                        使用过的显卡型号:{' '}
                        {user.gpuModels?.join('、') ||
                          user.favoriteGpu ||
                          '暂无数据'}
                      </span>
                    </div>

                    <Progress
                      percent={usagePercentage}
                      size="small"
                      strokeColor={
                        usagePercentage > 15
                          ? '#f50'
                          : usagePercentage > 10
                            ? '#2db7f5'
                            : '#87d068'
                      }
                      showInfo={false}
                    />
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={userData.topUsers.length}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  );
};

export default UserStatistics;
