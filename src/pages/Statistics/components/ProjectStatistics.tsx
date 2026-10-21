import ReadableTag from '@/components/UI/ReadableTag';
import { useReadableChartTheme } from '@/hooks/useReadableChartTheme';
import { useReadableColors } from '@/hooks/useReadableColors';
import { getProjectStatistics } from '@/services/group_center/dashboardStatistics';
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
} from 'antd';
import React, { useEffect, useState } from 'react';
import { formatRuntime, mergeTopKWithOther } from '../utils';

const { Option } = Select;

interface ProjectStatisticsProps {
  timePeriod: string;
}

interface ProjectStat {
  projectName: string;
  totalRuntime: number;
  totalTasks: number;
  activeUsers: string[];
  averageRuntime: number;
  activeUsersCount: number;
  formattedAverageRuntime: number;
}

interface ProjectStatisticsData {
  totalProjects: number;
  activeProjects: number;
  averageTasksPerProject: number;
  topProjects: ProjectStat[];
  refreshTime?: string;
}

const ProjectStatistics: React.FC<ProjectStatisticsProps> = ({
  timePeriod,
}) => {
  const colors = useReadableColors();
  const [projectData, setProjectData] = useState<ProjectStatisticsData | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [topK, setTopK] = useState<number | null>(10);

  useEffect(() => {
    fetchProjectStatistics();
  }, [timePeriod]);

  const fetchProjectStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getProjectStatistics({ timePeriod });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        const projectStats = response.result as ProjectStat[];

        const totalProjects = projectStats.length;
        const activeProjects = projectStats.filter(
          (project) => project.totalTasks > 0,
        ).length;
        const totalTasks = projectStats.reduce(
          (sum, project) => sum + project.totalTasks,
          0,
        );
        const averageTasksPerProject =
          totalProjects > 0 ? totalTasks / totalProjects : 0;

        setProjectData({
          totalProjects,
          activeProjects,
          averageTasksPerProject,
          topProjects: projectStats,
          refreshTime: new Date().toLocaleString('zh-CN'),
        });
      } else {
        setError('获取项目统计数据失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const calculateUsagePercentage = (
    project: ProjectStat,
    allProjects: ProjectStat[],
  ): number => {
    const totalRuntime = allProjects.reduce(
      (sum, p) => sum + p.totalRuntime,
      0,
    );
    return totalRuntime > 0 ? (project.totalRuntime / totalRuntime) * 100 : 0;
  };

  const getCurrentPageProjects = () => {
    if (!projectData) return [];
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return projectData.topProjects.slice(startIndex, endIndex);
  };

  const getProjectTimeDistributionData = () => {
    if (!projectData) return [];

    const allData = projectData.topProjects.map((project) => ({
      type: project.projectName,
      value: project.totalRuntime,
      runtime: project.totalRuntime,
      tasks: project.totalTasks,
      users: project.activeUsersCount,
    }));

    return mergeTopKWithOther(allData, topK, (remaining) => ({
      runtime: remaining.reduce((sum, item) => sum + item.runtime, 0),
      tasks: remaining.reduce((sum, item) => sum + item.tasks, 0),
      users: remaining.reduce((sum, item) => sum + item.users, 0),
    }));
  };

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const chartTheme = useReadableChartTheme();

  const projectTimePieConfig = {
    data: getProjectTimeDistributionData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    autoFit: true,
    theme: chartTheme,
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
          name: '活跃用户',
          field: 'users',
          formatter: (datum: any) => `${datum.users}人`,
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
        <div style={{ marginTop: 16 }}>加载项目统计数据...</div>
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
          <a onClick={fetchProjectStatistics} style={{ color: colors.primary }}>
            重试
          </a>
        }
      />
    );
  }

  if (!projectData || projectData.topProjects.length === 0) {
    return (
      <Empty
        description="暂无项目统计数据"
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
              title="总项目数"
              value={projectData.totalProjects}
              valueStyle={{ color: colors.primary }}
            />
            <Statistic
              title="活跃项目"
              value={projectData.activeProjects}
              valueStyle={{ color: colors.success }}
            />
            <Statistic
              title="项目活跃率"
              value={(
                (projectData.activeProjects / projectData.totalProjects) *
                100
              ).toFixed(1)}
              valueStyle={{ color: colors.warning }}
              suffix="%"
            />
            <Statistic
              title="项目平均任务数"
              value={projectData.averageTasksPerProject.toFixed(1)}
              valueStyle={{ color: colors.info }}
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
            <span>项目时间占比分布</span>
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
                个项目 {topK ? '' : '(显示全部)'} (共{' '}
                {projectData.topProjects.length} 个)
              </span>
            </div>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{ height: 400 }}>
          <Pie {...projectTimePieConfig} />
        </div>
      </Card>

      <Card
        title="项目使用排名"
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
              时间范围: {getTimeRangeDisplayName(timePeriod)}
            </span>
            <span
              style={{
                color: 'var(--ant-color-text-secondary)',
                fontSize: '11px',
                marginTop: '2px',
              }}
            >
              {calculateDateRange(timePeriod)}
            </span>
            {projectData.refreshTime && (
              <span
                style={{
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '11px',
                  marginTop: '2px',
                }}
              >
                统计时间: {projectData.refreshTime}
              </span>
            )}
          </div>
        }
      >
        <List
          dataSource={getCurrentPageProjects()}
          renderItem={(project, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index;
            const usagePercentage = calculateUsagePercentage(
              project,
              projectData.topProjects,
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
                    <ReadableTag
                      accentColor={
                        globalIndex < 3
                          ? '#f50'
                          : globalIndex < 5
                            ? '#2db7f5'
                            : '#87d068'
                      }
                    >
                      #{globalIndex + 1}
                    </ReadableTag>
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
                        {project.projectName}
                      </span>
                      <span
                        style={{
                          color: 'var(--ant-color-text-secondary)',
                          fontSize: '12px',
                        }}
                      >
                        活跃用户: {project.activeUsersCount}人
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'var(--ant-color-text-secondary)',
                        marginBottom: 4,
                      }}
                    >
                      <span>任务数: {project.totalTasks}</span>
                      <span>
                        总运行时间: {formatRuntime(project.totalRuntime)}
                      </span>
                      <span>使用占比: {usagePercentage.toFixed(1)}%</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: 'var(--ant-color-text-secondary)',
                        marginBottom: 4,
                      }}
                    >
                      <span>
                        平均运行时间: {formatRuntime(project.averageRuntime)}
                      </span>
                      <span>活跃用户: {project.activeUsers.join(', ')}</span>
                    </div>

                    <Progress
                      percent={usagePercentage}
                      size="small"
                      strokeColor={
                        usagePercentage > 25
                          ? '#f50'
                          : usagePercentage > 15
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
            total={projectData.topProjects.length}
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

export default ProjectStatistics;
