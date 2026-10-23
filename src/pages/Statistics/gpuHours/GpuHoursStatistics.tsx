import ReadableTag from '@/components/UI/ReadableTag';
import { useReadableColors } from '@/hooks/useReadableColors';
import {
  loadRealGpuUsage,
  type RealUsageData,
} from '@/services/group_center/gpuUsageData';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { TableColumnsType } from 'antd';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { UsageGroup, UsageSummary } from '../utils/gpuHours';
import { dailyUsage, groupUsage, summarizeUsage } from '../utils/gpuHours';
import styles from './GpuHoursStatistics.less';

type Metric = 'gpuHours' | 'taskHours' | 'taskCount';
const metricInfo = {
  gpuHours: {
    label: 'GPU 卡时',
    unit: '卡时',
    description: '使用了多少显卡资源',
  },
  taskHours: {
    label: '任务时长',
    unit: '小时',
    description: '每个任务运行了多久',
  },
  taskCount: {
    label: '任务数',
    unit: '个',
    description: '启动了多少个独立任务',
  },
};
const periods = [
  { value: 1, label: '最近 24 小时' },
  { value: 7, label: '最近 1 周' },
  { value: 30, label: '最近 1 月' },
];
const number = (value: number, metric: Metric = 'gpuHours') =>
  value.toLocaleString('zh-CN', {
    maximumFractionDigits: metric === 'taskCount' ? 0 : 1,
  });
const formatDate = (value: number) =>
  new Date(value).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const RankBars: React.FC<{
  rows: UsageGroup[];
  metric: Metric;
  compact?: boolean;
  limit?: number;
}> = ({ rows, metric, compact = false, limit }) => {
  const ordered = [...rows]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit ?? rows.length);
  const max = Math.max(...ordered.map((r) => r[metric]), 1);
  return ordered.length ? (
    <div
      className={`${styles.rankBars} ${compact ? styles.compactBars : ''}`}
      role="list"
      aria-label={`${metricInfo[metric].label}排名`}
    >
      {ordered.map((row, index) => (
        <div className={styles.rankRow} role="listitem" key={row.name}>
          <div className={styles.rankLabel}>
            <span className={styles.rankIndex}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <strong>{row.name}</strong>
            {row.estimated && <span className={styles.estimate}>含估算</span>}
          </div>
          <div className={styles.rankTrack} aria-hidden="true">
            <div
              className={styles.rankFill}
              style={{ width: `${(row[metric] / max) * 100}%` }}
            />
          </div>
          <span className={styles.rankValue}>
            {number(row[metric], metric)}{' '}
            <small>{metricInfo[metric].unit}</small>
          </span>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      description="所选范围暂无记录"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  );
};

const UsageTable: React.FC<{
  rows: UsageGroup[];
  metric: Metric;
  dimension: '用户' | '项目';
}> = ({ rows, metric, dimension }) => {
  const columns: TableColumnsType<UsageGroup> = [
    {
      title: dimension,
      dataIndex: 'name',
      width: 160,
      render: (name, row) => (
        <div className={styles.tableName}>
          <strong>{name}</strong>
          {row.estimated && <ReadableTag>含估算</ReadableTag>}
        </div>
      ),
    },
    {
      title: 'GPU 卡时',
      dataIndex: 'gpuHours',
      width: 130,
      align: 'right',
      sorter: (a, b) => a.gpuHours - b.gpuHours,
      render: (value) => (
        <strong className={styles.primaryNumber}>{number(value)}</strong>
      ),
    },
    {
      title: '任务时长（小时）',
      dataIndex: 'taskHours',
      width: 160,
      align: 'right',
      sorter: (a, b) => a.taskHours - b.taskHours,
      render: (value) => number(value),
    },
    {
      title: '任务数',
      dataIndex: 'taskCount',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.taskCount - b.taskCount,
    },
    {
      title: '使用的显卡型号',
      dataIndex: 'models',
      width: 230,
      render: (models: string[]) => (
        <Space size={[0, 4]} wrap>
          {models.map((model) => (
            <ReadableTag key={model}>{model}</ReadableTag>
          ))}
        </Space>
      ),
    },
    {
      title: '常用服务器',
      dataIndex: 'favoriteServer',
      width: 120,
      render: (server) => <strong>{server}</strong>,
    },
  ];
  return (
    <Table<UsageGroup>
      rowKey="name"
      size="middle"
      columns={columns}
      dataSource={[...rows].sort((a, b) => b[metric] - a[metric])}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        hideOnSinglePage: true,
        showTotal: (total) => `共 ${total} 个${dimension}`,
      }}
      scroll={{ x: 890 }}
    />
  );
};

const GpuHoursStatistics: React.FC<{
  modeControl?: React.ReactNode;
}> = ({ modeControl }) => {
  const { token } = theme.useToken();
  const colors = useReadableColors();
  const featuredColors = useReadableColors(token.colorPrimaryBg);
  const [days, setDays] = useState(7);
  const [server, setServer] = useState('all');
  const [metric, setMetric] = useState<Metric>('gpuHours');
  const [tab, setTab] = useState('users');
  const [search, setSearch] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [liveData, setLiveData] = useState<RealUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setLiveData(null);
    setProgress(0);
    loadRealGpuUsage(days, {
      signal: controller.signal,
      requirePreviewSource: process.env.GROUP_CENTER_REAL_PREVIEW === '1',
      onProgress: setProgress,
    })
      .then((result) => {
        if (!controller.signal.aborted) setLiveData(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : '读取真实数据失败',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [days, revision]);
  // Empty values are hidden while loading; there is no sample-data fallback.
  const period = liveData?.period ?? { start: 0, end: 0 };
  const records = liveData?.records ?? [];
  const serverDefinitions = liveData?.servers ?? [];
  const filteredRecords = useMemo(
    () => records.filter((r) => server === 'all' || r.server === server),
    [server, records],
  );
  const data = useMemo(
    () => ({
      total: summarizeUsage(filteredRecords, period),
      users: groupUsage(filteredRecords, period, 'user'),
      projects: groupUsage(filteredRecords, period, 'project'),
      servers: groupUsage(filteredRecords, period, 'server'),
      models: groupUsage(filteredRecords, period, 'model'),
      daily: dailyUsage(filteredRecords, period),
    }),
    [filteredRecords, period],
  );
  const bySearch = (rows: UsageGroup[]) =>
    rows.filter((r) =>
      [r.name, ...r.models, ...r.servers].some((s) =>
        s.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    );
  const userRows = bySearch(data.users);
  const projectRows = bySearch(data.projects);
  const serverRows = serverDefinitions
    .filter((s) => server === 'all' || s.name === server)
    .map((s) => ({
      ...s,
      ...(data.servers.find((r) => r.name === s.name) ?? {
        gpuHours: 0,
        taskHours: 0,
        taskCount: 0,
        userCount: 0,
        estimated: false,
      }),
    }));
  const serverColumns: TableColumnsType<(typeof serverRows)[number]> = [
    {
      title: '服务器',
      dataIndex: 'name',
      width: 140,
      render: (name, row) => (
        <div className={styles.tableName}>
          <strong className={styles.serverName}>{name}</strong>
          {row.estimated && <ReadableTag>含估算</ReadableTag>}
        </div>
      ),
    },
    { title: '显卡型号', dataIndex: 'model', width: 150 },
    {
      title: '显卡数',
      dataIndex: 'cards',
      align: 'right',
      width: 90,
      render: (value) => value ?? '—',
    },
    {
      title: '忙碌卡时',
      dataIndex: 'gpuHours',
      align: 'right',
      width: 130,
      render: (value) => (
        <strong className={styles.primaryNumber}>{number(value)}</strong>
      ),
    },
    {
      title: '任务时长（小时）',
      dataIndex: 'taskHours',
      align: 'right',
      width: 160,
      render: (value) => number(value),
    },
    { title: '任务数', dataIndex: 'taskCount', align: 'right', width: 90 },
    { title: '活跃用户', dataIndex: 'userCount', align: 'right', width: 100 },
  ];
  const rankingContent = (dimension: '用户' | '项目', rows: UsageGroup[]) => (
    <>
      <Row gutter={[16, 16]} className={styles.section}>
        <Col xs={24} xl={16}>
          <Card
            title={`${dimension}${metricInfo[metric].label}排名`}
            extra={
              <span className={styles.muted}>
                按{metricInfo[metric].label}排序
                {rows.length > 8 ? ' · 前 8 名' : ''}
              </span>
            }
          >
            <RankBars rows={rows} metric={metric} limit={8} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="显卡型号 · 占用卡时">
            <RankBars rows={data.models} metric="gpuHours" compact />
            <p className={styles.cardNote}>
              不同型号分别统计，卡时不折算为相同算力。
            </p>
          </Card>
        </Col>
      </Row>
      <Card
        title={`${dimension}使用明细`}
        extra={
          <Input.Search
            aria-label={`搜索${dimension}、型号或服务器`}
            placeholder={`搜索${dimension}、型号或服务器`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className={styles.search}
          />
        }
      >
        <UsageTable rows={rows} metric={metric} dimension={dimension} />
      </Card>
    </>
  );
  const dailyMax = Math.max(...data.daily.map((d) => d[metric]), 1);
  const summaryCards: {
    label: string;
    value: number;
    unit: string;
    caption: string;
    key: keyof UsageSummary;
  }[] = [
    {
      label: 'GPU 占用卡时',
      value: data.total.gpuHours,
      unit: '卡时',
      caption: '按物理显卡去重，包含运行中的任务',
      key: 'gpuHours',
    },
    {
      label: '任务运行时长',
      value: data.total.taskHours,
      unit: '小时',
      caption: '多卡合为一个任务，各任务时长相加',
      key: 'taskHours',
    },
    {
      label: '独立任务数',
      value: data.total.taskCount,
      unit: '个',
      caption: '同一个多卡任务只计算一次',
      key: 'taskCount',
    },
    {
      label: '活跃用户',
      value: data.total.userCount,
      unit: '人',
      caption: `${data.projects.length} 个项目 · ${data.servers.length} 台服务器`,
      key: 'userCount',
    },
  ];

  return (
    <PageContainer
      title="统计信息"
      content="从任务数量，到实际使用的 GPU 时间"
      ghost
      extra={[
        <Button
          key="refresh"
          loading={loading}
          onClick={() => setRevision((n) => n + 1)}
        >
          刷新数据
        </Button>,
        <Button
          key="rules"
          icon={<QuestionCircleOutlined />}
          onClick={() => setShowRules(true)}
        >
          怎么算？
        </Button>,
      ]}
    >
      <div
        className={styles.page}
        style={{ '--usage-accent': colors.primary } as React.CSSProperties}
      >
        {modeControl}
        <Alert
          type="info"
          showIcon
          className={styles.dataBanner}
          title="GPU 使用时间统计"
          description={
            liveData
              ? `已读取 ${liveData.historicalRows} 条已结束记录、${liveData.liveRows} 条运行中记录。多卡任务合并计数，GPU 卡时按每张卡的占用时间计算。`
              : '正在获取历史任务与实时快照。'
          }
        />
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <Select
              aria-label="统计时间范围"
              value={days}
              onChange={setDays}
              disabled={loading}
              options={periods}
              className={styles.periodSelect}
            />
            <Select
              aria-label="筛选服务器"
              value={server}
              onChange={setServer}
              className={styles.serverSelect}
              options={[
                { label: '全部服务器', value: 'all' },
                ...serverDefinitions.map((s) => ({
                  label: s.name,
                  value: s.name,
                })),
              ]}
            />
          </div>
          <span className={styles.muted}>
            {!liveData ? (
              '尚未加载数据'
            ) : (
              <>
                {formatDate(period.start)} — {formatDate(period.end)} · 上海时间
              </>
            )}
          </span>
        </div>
        {loading ? (
          <Card>
            <div className={styles.loading}>
              <Spin />
              <span>已读取 {progress} 条历史记录，正在获取实时快照…</span>
            </div>
          </Card>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            title="真实数据加载失败"
            description={error}
            action={
              <Button onClick={() => setRevision((n) => n + 1)}>重试</Button>
            }
          />
        ) : (
          <>
            {liveData &&
              (liveData.unavailableServers.length > 0 ||
                liveData.staleServers.length > 0) && (
                <Alert
                  className={styles.dataBanner}
                  type="warning"
                  showIcon
                  title="部分实时数据未完整更新"
                  description={[
                    liveData.unavailableServers.length
                      ? `${liveData.unavailableServers.join('、')} 未取得实时快照，仍计入已结束任务。`
                      : '',
                    liveData.staleServers.length
                      ? `${liveData.staleServers.join('、')} 使用最后有效快照，运行时间截止该快照时刻。`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              )}
            <Row gutter={[16, 16]} className={styles.overview}>
              {summaryCards.map((card, i) => (
                <Col xs={12} xl={6} key={card.key}>
                  <Card className={i === 0 ? styles.featuredCard : undefined}>
                    <Statistic
                      title={card.label}
                      value={card.value}
                      precision={i < 2 ? 1 : 0}
                      suffix={card.unit}
                      styles={{
                        content: {
                          color:
                            i === 0 ? featuredColors.primary : token.colorText,
                        },
                      }}
                    />
                    <p className={styles.cardNote}>{card.caption}</p>
                  </Card>
                </Col>
              ))}
            </Row>
            <div className={styles.metricBar}>
              <div>
                <strong>统计指标</strong>
                <span className={styles.muted}>
                  {metricInfo[metric].description}
                </span>
              </div>
              <Segmented<Metric>
                aria-label="切换统计指标"
                value={metric}
                onChange={setMetric}
                options={(Object.keys(metricInfo) as Metric[]).map((value) => ({
                  label: metricInfo[value].label,
                  value,
                }))}
              />
            </div>
            <Tabs
              activeKey={tab}
              onChange={(value) => {
                setTab(value);
                setSearch('');
              }}
              size="large"
              items={[
                {
                  key: 'users',
                  label: '用户统计',
                  children: rankingContent('用户', userRows),
                },
                {
                  key: 'servers',
                  label: '服务器与显卡',
                  children: (
                    <>
                      <Card
                        title={`各服务器的${metricInfo[metric].label}对比`}
                        className={styles.section}
                      >
                        <RankBars rows={data.servers} metric={metric} />
                      </Card>
                      <Card title="服务器使用明细">
                        <Table
                          rowKey="name"
                          columns={serverColumns}
                          dataSource={serverRows}
                          pagination={false}
                          size="middle"
                          scroll={{ x: 860 }}
                        />
                        <p className={styles.cardNote}>
                          忙碌卡时合并同一张显卡上的重叠时间，同卡多进程只计算一次。
                        </p>
                      </Card>
                    </>
                  ),
                },
                {
                  key: 'projects',
                  label: '项目统计',
                  children: rankingContent('项目', projectRows),
                },
                {
                  key: 'trend',
                  label: '时间趋势',
                  children: (
                    <>
                      <Card
                        title={`每日${metricInfo[metric].label}`}
                        extra={
                          <span className={styles.muted}>
                            跨天任务按当天使用时间拆分
                          </span>
                        }
                        className={styles.section}
                      >
                        <div className={styles.trendScroll}>
                          <div
                            className={styles.trend}
                            style={{ minWidth: data.daily.length * 74 }}
                            role="list"
                            aria-label="每日统计"
                          >
                            {data.daily.map((day) => (
                              <div
                                className={styles.day}
                                key={day.date}
                                role="listitem"
                              >
                                <strong>{number(day[metric], metric)}</strong>
                                <div className={styles.dayTrack}>
                                  <div
                                    className={styles.dayFill}
                                    style={{
                                      height: `${(day[metric] / dailyMax) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span>
                                  {day.date.slice(5).replace('-', '/')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className={styles.cardNote}>
                          单位：{metricInfo[metric].unit}
                          。首尾日期可能仅覆盖部分时段；每日任务数表示当天有运行的任务，跨天任务会出现在多天。
                        </p>
                      </Card>
                      <Card title="每日使用明细">
                        <Table
                          rowKey="date"
                          dataSource={data.daily}
                          pagination={{ pageSize: 10, hideOnSinglePage: true }}
                          size="middle"
                          scroll={{ x: 620 }}
                          columns={[
                            { title: '日期', dataIndex: 'date' },
                            {
                              title: 'GPU 卡时',
                              dataIndex: 'gpuHours',
                              align: 'right',
                              render: (v) => number(v),
                            },
                            {
                              title: '任务时长（小时）',
                              dataIndex: 'taskHours',
                              align: 'right',
                              render: (v) => number(v),
                            },
                            {
                              title: '当日任务数',
                              dataIndex: 'taskCount',
                              align: 'right',
                            },
                            {
                              title: '活跃用户',
                              dataIndex: 'userCount',
                              align: 'right',
                            },
                          ]}
                        />
                      </Card>
                    </>
                  ),
                },
              ]}
            />
            <div className={styles.footnote}>
              <span>1 张卡 × 1 小时 = 1 卡时</span>
              <span>只计所选时段；运行中任务计至最后一次可靠采集。</span>
              <span>
                用户共享显卡时，各用户的占用时间可能重叠；服务器总卡时另行去重。
              </span>
              {data.total.estimated && (
                <span>
                  “含估算”包含运行中任务的连续占用推算或不完整多卡分组；未观测到的显卡不补计。
                </span>
              )}
              <span>
                只计已有结束记录或当前快照能确认的任务；没有结束记录且已不在快照中的历史占用无法补齐。
              </span>
              {liveData &&
                (liveData.uncertainGroups > 0 ||
                  liveData.incompleteGroups > 0) && (
                  <span>
                    分组信息不足：{liveData.uncertainGroups}{' '}
                    组；多卡记录可能不完整：{liveData.incompleteGroups} 组。
                  </span>
                )}
            </div>
          </>
        )}
      </div>
      <Modal
        title="GPU 卡时怎么算？"
        open={showRules}
        onCancel={() => setShowRules(false)}
        footer={
          <Button type="primary" onClick={() => setShowRules(false)}>
            明白了
          </Button>
        }
      >
        <div className={styles.rules}>
          <div className={styles.formula}>
            <strong>2 张卡 × 10 小时</strong>
            <span>=</span>
            <strong>20 卡时</strong>
          </div>
          <p>
            这个任务的运行时长是 10 小时、任务数是 1 个，占用 GPU 资源为 20
            卡时。
          </p>
          <p>
            多卡记录按每张卡分别累加；同一张卡上的多个进程合并重叠时间。卡数变化时，按各阶段实际使用的卡数计算。
          </p>
          <p>
            按周、月查看时，只计算任务落在这个时间范围内的部分。正在运行的任务计至最后可靠采集时间。
          </p>
          <p>
            卡时表示占用时间。2080 Ti、3090、4090
            分开统计，不把同样的卡时理解为同样的计算量。
          </p>
          <p className={styles.muted}>
            任务按服务器、用户、主进程和启动批次合并，逐卡区间去重。运行中任务按已知开始时间推算连续占用，并标为估算；缺失的多卡记录不补计。
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default GpuHoursStatistics;
