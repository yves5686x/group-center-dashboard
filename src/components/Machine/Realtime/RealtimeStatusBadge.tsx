import {
  formatFreshness,
  getTimeStrFromSecondsTimestamp,
} from '@/utils/Time/DateTimeUtils';
import { Space, Tag, Tooltip } from 'antd';
import React from 'react';

interface Props {
  /** 是否过期：agent 宕机回退旧数据、或从无数据 */
  stale: boolean;
  source: API.RealtimeSource;
  /** 数据年龄，秒；-1 表示无数据 */
  freshness: number;
  /** 快照时间，秒级；0 表示从无 */
  snapshotTime: number;
  /** source 为 none / last-known-good 时后端可能给出说明 */
  error?: string | null;
}

const SOURCE_LABEL: Record<API.RealtimeSource, string> = {
  agent: '实时',
  cache: '缓存',
  'last-known-good': '旧数据',
  none: '无数据',
};

const SOURCE_COLOR: Record<API.RealtimeSource, string> = {
  agent: 'green',
  cache: 'blue',
  'last-known-good': 'orange',
  none: 'red',
};

/**
 * 实时快照的状态徽标。
 *
 * 聚合层的数据可能来自四个不同的 source，其中两种（last-known-good / none）
 * 意味着拿不到实时值，必须让用户看见，否则看板会「看起来很正常地骗人」。
 */
const RealtimeStatusBadge: React.FC<Props> = (props) => {
  const { stale, source, freshness, snapshotTime, error } = props;

  const tooltipContent = (
    <div style={{ fontSize: 12, lineHeight: 1.8 }}>
      <div>数据来源：{SOURCE_LABEL[source]}</div>
      <div>数据年龄：{formatFreshness(freshness)}</div>
      <div>快照时间：{getTimeStrFromSecondsTimestamp(snapshotTime)}</div>
      {error ? <div>后端说明：{error}</div> : null}
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="top">
      <Space size={4} style={{ cursor: 'help' }}>
        {/* agent / cache 都是正常数据，不需要额外打扰用户 */}
        {source === 'last-known-good' || source === 'none' ? (
          <Tag color={SOURCE_COLOR[source]} style={{ marginInlineEnd: 0 }}>
            {SOURCE_LABEL[source]}
          </Tag>
        ) : null}

        {stale ? (
          <Tag color="warning" style={{ marginInlineEnd: 0 }}>
            数据可能过期
          </Tag>
        ) : null}
      </Space>
    </Tooltip>
  );
};

export default RealtimeStatusBadge;
