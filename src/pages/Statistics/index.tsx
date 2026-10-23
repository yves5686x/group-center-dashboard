import { useReadableColors } from '@/hooks/useReadableColors';
import { PageContainer } from '@ant-design/pro-components';
import { history, useLocation } from '@umijs/max';
import {
  Alert,
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Spin,
  Statistic,
  Tabs,
} from 'antd';
import React, { useEffect, useState } from 'react';

import { get24HourReport } from '@/services/group_center/dashboardStatistics';
import GpuUsageChart from './components/GpuUsageChart';
import ProjectStatistics from './components/ProjectStatistics';
import TimeTrendChart from './components/TimeTrendChart';
import UserActivityTimeChart from './components/UserActivityTimeChart';
import UserStatistics from './components/UserStatistics';
import styles from './index.less';

const { Option } = Select;

interface OverviewStats {
  totalTasks: number;
  activeUsers: number;
  averageGpuUsage: number;
  projectCount: number;
}

const timePeriodOptions = [
  { value: 'ONE_DAY', label: '24小时' },
  { value: 'ONE_WEEK', label: '1周' },
  { value: 'ONE_MONTH', label: '1月' },
  { value: 'SIX_MONTH', label: '6个月' },
  { value: 'ONE_YEAR', label: '1年' },
];

const LegacyStatisticsPage: React.FC<{ modeControl?: React.ReactNode }> = ({
  modeControl,
}) => {
  const colors = useReadableColors();
  const [timePeriod, setTimePeriod] = useState<string>('ONE_WEEK');
  const [activeTab, setActiveTab] = useState<string>('gpu');
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await get24HourReport();

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        const report = response.result;
        setOverviewStats({
          totalTasks: report.totalTasks || 0,
          activeUsers: report.activeUsers || 0,
          averageGpuUsage: 0,
          projectCount: report.topProjects?.length || 0,
        });
      } else {
        setError('获取统计数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewStats = () => {
    if (loading) {
      return (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((item) => (
            <Col xs={24} sm={12} md={6} key={item}>
              <Card>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      );
    }

    if (error) {
      return (
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <a onClick={fetchOverviewStats} style={{ color: colors.primary }}>
              重试
            </a>
          }
        />
      );
    }

    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={overviewStats?.totalTasks || 0}
              valueStyle={{ color: colors.primary }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={overviewStats?.activeUsers || 0}
              valueStyle={{ color: colors.success }}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均GPU使用率"
              value={overviewStats?.averageGpuUsage || 0}
              valueStyle={{ color: colors.warning }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="项目数量"
              value={overviewStats?.projectCount || 0}
              valueStyle={{ color: colors.info }}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <PageContainer
      title="统计信息"
      content="GPU使用情况统计和分析"
      extra={[
        <Select
          key="timePeriod"
          value={timePeriod}
          onChange={setTimePeriod}
          style={{ width: 120 }}
          disabled={loading}
        >
          {timePeriodOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>,
      ]}
      ghost
    >
      <div className={styles.statisticsPage}>
        {modeControl}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 100);
          }}
          size="large"
          items={[
            {
              key: 'gpu',
              label: 'GPU使用统计',
              children: <GpuUsageChart timePeriod={timePeriod} />,
            },
            {
              key: 'user',
              label: '用户统计',
              children: <UserStatistics timePeriod={timePeriod} />,
            },
            {
              key: 'project',
              label: '项目统计',
              children: <ProjectStatistics timePeriod={timePeriod} />,
            },
            {
              key: 'trend',
              label: '时间趋势',
              children: <TimeTrendChart timePeriod={timePeriod} />,
            },
            {
              key: 'activity',
              label: '活动时间分布',
              children: <UserActivityTimeChart timePeriod={timePeriod} />,
            },
          ]}
        />
      </div>
    </PageContainer>
  );
};

const GpuHoursStatistics = React.lazy(
  () => import('./gpuHours/GpuHoursStatistics'),
);
const StatisticsPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // Keep links from the approved local preview working after release.
  const hoursMode =
    (params.get('mode') ?? params.get('preview')) === 'gpu-hours';
  const [visitedTasks, setVisitedTasks] = useState(!hoursMode);
  const [visitedHours, setVisitedHours] = useState(hoursMode);

  useEffect(() => {
    if (hoursMode) setVisitedHours(true);
    else setVisitedTasks(true);
    // Charts kept in the other view need to measure their visible container again.
    const frame = window.requestAnimationFrame(() =>
      window.dispatchEvent(new Event('resize')),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [hoursMode]);

  const modeControl = (
    <div className={styles.statisticsModes}>
      <Segmented
        block
        aria-label="切换统计方式"
        value={hoursMode ? 'gpu-hours' : 'tasks'}
        options={[
          { label: '任务统计', value: 'tasks' },
          { label: 'GPU 卡时统计', value: 'gpu-hours' },
        ]}
        onChange={(mode) => {
          const params = new URLSearchParams(location.search);
          params.delete('preview');
          if (mode === 'gpu-hours') params.set('mode', 'gpu-hours');
          else params.delete('mode');
          const search = params.toString();
          history.replace({
            pathname: location.pathname,
            search: search ? `?${search}` : '',
            hash: location.hash,
          });
        }}
      />
      <p>
        {hoursMode
          ? '按显卡占用时间比较资源使用，支持用户、服务器、项目和每日趋势。'
          : '保留原有 GPU 使用、用户、项目、时间趋势和活动时间分布。'}
      </p>
    </div>
  );

  return (
    <>
      {(visitedTasks || !hoursMode) && (
        <div hidden={hoursMode}>
          <LegacyStatisticsPage modeControl={modeControl} />
        </div>
      )}
      {(visitedHours || hoursMode) && (
        <div hidden={!hoursMode}>
          <React.Suspense fallback={<Spin size="large" />}>
            <GpuHoursStatistics modeControl={modeControl} />
          </React.Suspense>
        </div>
      )}
    </>
  );
};

export default StatisticsPage;
