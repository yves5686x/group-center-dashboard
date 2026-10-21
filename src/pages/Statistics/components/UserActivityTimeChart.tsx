import { useReadableColors } from '@/hooks/useReadableColors';
import { getUserActivityTimeDistribution } from '@/services/group_center/dashboardStatistics';
import { GetIsDarkMode } from '@/utils/AntD5/AntD5DarkMode';
import { calculateDateRange, getTimeRangeDisplayName } from '@/utils/dateRange';
import { STATUS_COLORS } from '@/utils/StatusColors';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import { formatRuntime } from '../utils';

interface UserActivityTimeChartProps {
  timePeriod: string;
}

interface UserActivityTimeData {
  userName: string;
  earliestStartTime: string;
  latestStartTime: string;
  activityTimeRange: string;
  totalTasks: number;
  totalRuntime: number;
}

interface UserActivityTimeResponse {
  users: UserActivityTimeData[];
  totalUsers: number;
  refreshTime: string;
}

const parseTimeRange = (timeRange: string) => {
  const [startTime, endTime] = timeRange.split('-');
  const cleanEndTime = endTime.replace('次日', '').trim();
  return { startTime, endTime: cleanEndTime };
};

const isCrossDay = (timeRange: string): boolean => {
  if (timeRange.includes('次日')) return true;
  const { startTime, endTime } = parseTimeRange(timeRange);
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);
  return startHour > endHour;
};

const UserActivityTimeChart: React.FC<UserActivityTimeChartProps> = ({
  timePeriod,
}) => {
  const colors = useReadableColors();
  const { token } = theme.useToken();
  const [activityData, setActivityData] =
    useState<UserActivityTimeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivityTimeData();
  }, [timePeriod]);

  const fetchActivityTimeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getUserActivityTimeDistribution({ timePeriod });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        setActivityData(response.result as UserActivityTimeResponse);
      } else {
        setError('获取用户活动时间数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeChartData = () => {
    if (!activityData) return [];

    return activityData.users.map((user, index) => {
      const { startTime, endTime } = parseTimeRange(user.activityTimeRange);
      const crossDay = isCrossDay(user.activityTimeRange);

      return {
        user: user.userName,
        startTime,
        endTime,
        crossDay,
        totalTasks: user.totalTasks,
        totalRuntime: user.totalRuntime,
        index,
      };
    });
  };

  const calculateStats = () => {
    if (!activityData) return null;

    const totalTasks = activityData.users.reduce(
      (sum, user) => sum + user.totalTasks,
      0,
    );
    const totalRuntime = activityData.users.reduce(
      (sum, user) => sum + user.totalRuntime,
      0,
    );
    const crossDayUsers = activityData.users.filter((user) =>
      isCrossDay(user.activityTimeRange),
    ).length;

    return {
      totalTasks,
      totalRuntime,
      crossDayUsers,
      averageTasksPerUser:
        activityData.totalUsers > 0 ? totalTasks / activityData.totalUsers : 0,
    };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载用户活动时间数据...</div>
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
          <a onClick={fetchActivityTimeData} style={{ color: colors.primary }}>
            重试
          </a>
        }
      />
    );
  }

  if (!activityData || activityData.users.length === 0) {
    return (
      <Empty
        description="暂无用户活动时间数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const stats = calculateStats();
  const chartData = getTimeRangeChartData();
  const isDark = GetIsDarkMode();

  const scrollbarStyles = {
    scrollbarWidth: 'thin' as const,
    scrollbarColor: isDark
      ? 'rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1)',
  };

  return (
    <div>
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={activityData.totalUsers}
                valueStyle={{ color: colors.primary }}
                suffix="人"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="总任务数"
                value={stats.totalTasks}
                valueStyle={{ color: colors.success }}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="跨天用户数"
                value={stats.crossDayUsers}
                valueStyle={{ color: colors.warning }}
                suffix="人"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="人均任务数"
                value={stats.averageTasksPerUser.toFixed(1)}
                valueStyle={{ color: colors.info }}
                precision={1}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title="用户活动时间分布"
        extra={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span style={{ color: token.colorTextSecondary, fontSize: '12px' }}>
              时间范围: {getTimeRangeDisplayName(timePeriod)}
            </span>
            <span
              style={{
                color: token.colorTextSecondary,
                fontSize: '11px',
                marginTop: '2px',
              }}
            >
              {calculateDateRange(timePeriod)}
            </span>
            {activityData.refreshTime && (
              <span
                style={{
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '11px',
                  marginTop: '2px',
                }}
              >
                统计时间: {activityData.refreshTime}
              </span>
            )}
          </div>
        }
      >
        <style>
          {`
            .activity-time-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .activity-time-scroll::-webkit-scrollbar-track {
              background: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
              border-radius: 4px;
            }
            .activity-time-scroll::-webkit-scrollbar-thumb {
              background: ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'};
              border-radius: 4px;
            }
            .activity-time-scroll::-webkit-scrollbar-thumb:hover {
              background: ${isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
            }
          `}
        </style>
        <div
          className="activity-time-scroll"
          style={{
            maxHeight: '600px',
            overflowY: 'auto',
            minHeight: '400px',
            padding: '0 8px',
            marginRight: '-8px',
            ...scrollbarStyles,
          }}
        >
          {chartData.map((item) => {
            const startHour = parseInt(item.startTime.split(':')[0]);
            const startMinute = parseInt(item.startTime.split(':')[1]);
            const endHour = parseInt(item.endTime.split(':')[0]);
            const endMinute = parseInt(item.endTime.split(':')[1]);

            const startPosition =
              ((startHour * 60 + startMinute) / (24 * 60)) * 100;
            const endPosition = ((endHour * 60 + endMinute) / (24 * 60)) * 100;

            return (
              <Card
                key={item.user}
                size="small"
                style={{
                  marginBottom: 20,
                  borderLeft: item.crossDay
                    ? `4px solid ${STATUS_COLORS.error}`
                    : `4px solid ${STATUS_COLORS.success}`,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '16px' } }}
                hoverable
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 4px 12px ${token.colorBgElevated}`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.transform = '';
                }}
              >
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={4}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginBottom: 8,
                        color: token.colorText,
                      }}
                    >
                      {item.user}
                    </div>
                    {item.crossDay && (
                      <div style={{ fontSize: '12px', color: colors.error }}>
                        ⚠️ 跨天活动
                      </div>
                    )}
                  </Col>

                  <Col xs={24} sm={14}>
                    <div
                      style={{
                        position: 'relative',
                        height: 60,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          right: 0,
                          height: 10,
                          backgroundColor: token.colorFillSecondary,
                          borderRadius: 5,
                          transform: 'translateY(-50%)',
                        }}
                      />

                      {item.crossDay ? (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: `${startPosition}%`,
                              right: 0,
                              height: 10,
                              backgroundColor: STATUS_COLORS.error,
                              borderRadius: '0 5px 5px 0',
                              transform: 'translateY(-50%)',
                              opacity: 0.8,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: 0,
                              right: `${100 - endPosition}%`,
                              height: 10,
                              backgroundColor: STATUS_COLORS.error,
                              borderRadius: '5px 0 0 5px',
                              transform: 'translateY(-50%)',
                              opacity: 0.8,
                            }}
                          />
                        </>
                      ) : (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: `${startPosition}%`,
                            right: `${100 - endPosition}%`,
                            height: 10,
                            backgroundColor: token.colorPrimary,
                            borderRadius: 5,
                            transform: 'translateY(-50%)',
                            opacity: 0.8,
                          }}
                        />
                      )}

                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          fontSize: '10px',
                          color: token.colorTextSecondary,
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: 8,
                        }}
                      >
                        {[0, 6, 12, 18, 24].map((hour) => (
                          <span key={hour}>{hour}:00</span>
                        ))}
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${startPosition}%`,
                          width: 3,
                          height: 20,
                          backgroundColor: item.crossDay
                            ? STATUS_COLORS.error
                            : token.colorPrimary,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: 1.5,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          left: `${startPosition}%`,
                          transform: 'translateX(-50%)',
                          fontSize: '11px',
                          color: item.crossDay ? colors.error : colors.primary,
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold',
                          backgroundColor: token.colorBgContainer,
                          padding: '2px 4px',
                          borderRadius: 2,
                          boxShadow: `0 1px 3px ${token.colorBgElevated}`,
                        }}
                      >
                        {item.startTime}
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${endPosition}%`,
                          width: 3,
                          height: 20,
                          backgroundColor: item.crossDay
                            ? STATUS_COLORS.error
                            : token.colorPrimary,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: 1.5,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          left: `${endPosition}%`,
                          transform: 'translateX(-50%)',
                          fontSize: '11px',
                          color: item.crossDay ? colors.error : colors.primary,
                          whiteSpace: 'nowrap',
                          fontWeight: 'bold',
                          backgroundColor: token.colorBgContainer,
                          padding: '2px 4px',
                          borderRadius: 2,
                          boxShadow: `0 1px 3px ${token.colorBgElevated}`,
                        }}
                      >
                        {item.endTime}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: token.colorTextSecondary,
                        marginTop: 32,
                      }}
                    >
                      {item.crossDay ? (
                        <span>
                          跨天活动: {item.startTime} → 次日 {item.endTime}
                        </span>
                      ) : (
                        <span>
                          活动区间: {item.startTime} - {item.endTime}
                        </span>
                      )}
                    </div>
                  </Col>

                  <Col xs={24} sm={6}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: colors.success,
                            }}
                          >
                            {item.totalTasks}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: token.colorTextSecondary,
                            }}
                          >
                            任务数
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ textAlign: 'center' }}>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: colors.primary,
                            }}
                          >
                            {formatRuntime(item.totalRuntime)}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: token.colorTextSecondary,
                            }}
                          >
                            运行时间
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default UserActivityTimeChart;
