import {
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Card, Progress, Tag, theme } from 'antd';
import styles from './DiskUsageCard.less';

interface Props {
  diskUsage: API.RealtimeDiskMount;
}

const DiskUsageCard: React.FC<Props> = ({ diskUsage }) => {
  const { token } = theme.useToken();
  const percent = Number.isFinite(diskUsage.usedPercentage)
    ? Math.max(0, Math.min(100, diskUsage.usedPercentage))
    : 0;
  const hasPurpose =
    !!diskUsage.purpose && diskUsage.purpose.toLowerCase() !== 'unknown';
  const hasWarnings =
    diskUsage.triggerHighPercentageUsed ||
    diskUsage.triggerLowFreeBytes ||
    diskUsage.triggerSizeWarning;
  const title = hasPurpose
    ? `${diskUsage.mountPoint} (${diskUsage.purpose})`
    : diskUsage.mountPoint;

  return (
    <Card
      size="small"
      title={<span className={styles.mountPoint}>{title}</span>}
      className={styles.card}
    >
      <div className={styles.usageSummary}>
        <span>空间使用</span>
        <strong>{Number(percent.toFixed(1))}%</strong>
      </div>
      <Progress
        percent={percent}
        size="small"
        strokeWidth={5}
        showInfo={false}
        strokeColor={
          percent >= 80
            ? token.colorError
            : percent >= 40
              ? token.colorWarning
              : token.colorSuccess
        }
        aria-label="磁盘空间使用率"
      />
      <div className={styles.capacityRow}>
        <span>已用</span>
        <strong>{diskUsage.usedStr}</strong>
      </div>
      <div className={styles.capacityRow}>
        <span>可用</span>
        <span>{diskUsage.freeStr}</span>
      </div>
      <div className={styles.capacityRow}>
        <span>总容量</span>
        <span>{diskUsage.totalStr}</span>
      </div>
      {hasWarnings ? (
        <div className={styles.detailDiv}>
          {diskUsage.triggerHighPercentageUsed ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              已用高占比
            </Tag>
          ) : null}
          {diskUsage.triggerLowFreeBytes ? (
            <Tag icon={<ExclamationCircleOutlined />} color="warning">
              低可用空间
            </Tag>
          ) : null}
          {diskUsage.triggerSizeWarning ? (
            <Tag icon={<CloseCircleOutlined />} color="error">
              需要清理
            </Tag>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};

export default DiskUsageCard;
