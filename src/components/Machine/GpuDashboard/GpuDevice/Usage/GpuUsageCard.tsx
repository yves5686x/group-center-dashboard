import DisableSelectDiv from '@/components/Public/Layout/DisableSelectDiv';
import LinerDividerLayout from '@/components/Public/Layout/LinerDividerLayout';
import { convertFromMBToGB, getMemoryString } from '@/utils/Convert/MemorySize';
import { green, orange, red } from '@ant-design/colors';
import { Card, Progress, Space, Tooltip, theme } from 'antd';
import React, { useEffect, useState } from 'react';

import styles from './GpuUsageCard.less';

interface Props {
  gpuIndex: number;
  /**
   * 本卡的实时快照，由上层单机 `/gpu` 请求统一下发。
   *
   * 旧实现里 GpuDevice 的 useGpuName 与本组件的 useGpuUsageInfo 各自轮询同一个
   * `gpu_usage_info?gpuIndex=N`，同一份数据被拉了两遍；本组件还额外轮询
   * `system_info`，但拿到的 machineSystemInfo 从头到尾没有被使用过（死轮询）。
   * 卡名筛选同样由 GpuDevice 统一负责，这里不再重复判断一次。
   */
  card: API.RealtimeGpuCard;
}

const useGpuMemoryDetail = (gpuMemoryTotalMB: number, memoryUsage: number) => {
  const [gpuMemoryTotalGiB, setGpuMemoryTotalGiB] = useState(() =>
    convertFromMBToGB(gpuMemoryTotalMB),
  );
  const [gpuMemoryUsageGiB, setGpuMemoryUsageGiB] = useState(
    () => gpuMemoryTotalGiB * (memoryUsage / 100),
  );
  const [gpuMemoryFreeGiB, setGpuMemoryFreeGiB] = useState(
    () => gpuMemoryTotalGiB - gpuMemoryUsageGiB,
  );

  useEffect(() => {
    setGpuMemoryTotalGiB(convertFromMBToGB(gpuMemoryTotalMB));
  }, [gpuMemoryTotalMB]);

  useEffect(() => {
    setGpuMemoryUsageGiB(gpuMemoryTotalGiB * (memoryUsage / 100));
    setGpuMemoryFreeGiB(gpuMemoryTotalGiB - gpuMemoryUsageGiB);
  }, [gpuMemoryTotalGiB, memoryUsage]);

  // 返回三个 useState 的结果
  return { gpuMemoryTotalGiB, gpuMemoryUsageGiB, gpuMemoryFreeGiB };
};

const ProgressComponent = (percent: number) => {
  // 转换为整数
  let finalPercentage = Math.floor(percent ?? 0);
  if (finalPercentage > 100) {
    finalPercentage = 100;
  }
  if (finalPercentage < 0) {
    finalPercentage = 0;
  }

  const calculateColorIndex = (
    percent: number,
    max: number = 8,
    min: number = 3,
  ) => {
    const maxValue = max > min ? max : min;
    const minValue = max > min ? min : max;

    return Math.floor(((maxValue - minValue) * percent) / 100 + minValue);
  };
  const computeColor = (percent: number) => {
    const threshold1 = 40,
      threshold2 = 80;
    if (percent < threshold1) {
      return green[calculateColorIndex(percent / threshold1, 8, 3)];
    } else if (percent >= threshold1 && percent < threshold2) {
      return orange[
        calculateColorIndex(
          (percent - threshold1) / (threshold2 - threshold1),
          8,
          5,
        )
      ];
    } else {
      return red[
        calculateColorIndex((percent - threshold2) / (100 - threshold2), 8, 5)
      ];
    }
  };

  const getPercentageString = (percent: number | undefined) => {
    if (percent === undefined) {
      return '0%';
    }

    return `${percent}`.padStart(2, '0') + '%';
  };

  // format = {(percent) => `${percent} Days`}
  return (
    <div className={styles.gpuUsagePercent}>
      <Progress
        percent={finalPercentage}
        steps={10}
        size="small"
        strokeColor={computeColor(finalPercentage)}
        format={(finalPercentage) => getPercentageString(finalPercentage)}
        showInfo={false}
      />
      <div className={styles.gpuUsagePercentText}>
        <div>{getPercentageString(finalPercentage)}</div>
      </div>
    </div>
  );
};

const GpuUsageCard: React.FC<Props> = (props) => {
  const { gpuIndex, card } = props;
  const { token } = theme.useToken();

  // 聚合层的字段名与旧 agent 不同：gpuMemoryTotalMB→memoryTotalMb、
  // gpuPowerUsage→powerUsage、gpuTDP→tdp、gpuTemperature→temperature。
  const memoryTotalMb = card.memoryTotalMb || 0;
  const memoryUsage = card.memoryUsage || 0;
  const coreUsage = card.coreUsage || 0;
  const powerUsage = card.powerUsage || 0;
  const tdp = card.tdp || 0;
  const temperature = card.temperature || 0;

  const { gpuMemoryTotalGiB, gpuMemoryUsageGiB } = useGpuMemoryDetail(
    memoryTotalMb,
    memoryUsage,
  );

  // 已用显存 MB：优先按百分比换算，与旧实现保持一致
  const memoryUsedMb = Math.round((memoryUsage * memoryTotalMb) / 100);
  const memoryFreeMb = memoryTotalMb - memoryUsedMb;

  // 计算内存使用率
  const getMemoryUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const powerRatio = tdp > 0 ? powerUsage / tdp : 0;
  const powerColor =
    powerRatio > 0.7
      ? token.colorError
      : powerRatio > 0.3
        ? token.colorWarning
        : token.colorSuccess;

  const temperatureColor =
    temperature > 70
      ? token.colorError
      : temperature > 50
        ? token.colorWarning
        : token.colorSuccess;

  const gpuMemoryUsageFormatted = getMemoryString(gpuMemoryUsageGiB);
  const gpuMemoryTotalFormatted = getMemoryString(gpuMemoryTotalGiB);

  const labelStyle: React.CSSProperties = {
    fontWeight: 500,
    color: token.colorTextSecondary,
    fontSize: '12px',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  // 构建GPU信息提示内容
  const gpuTooltipContent = (
    <div style={{ minWidth: 180, padding: '8px 0' }}>
      <div
        style={{
          marginBottom: 12,
          fontWeight: 'bold',
          fontSize: '14px',
          textAlign: 'center',
          color: token.colorText,
        }}
      >
        GPU状态
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={rowStyle}>
          <div style={labelStyle}>功耗</div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: powerColor,
            }}
          >
            {powerUsage}W / {tdp}W
          </div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>温度</div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: temperatureColor,
            }}
          >
            {temperature}°C
          </div>
        </div>
      </div>
    </div>
  );

  // 显存详细信息提示内容
  const memoryTooltipContent = (
    <div style={{ minWidth: 160, padding: '8px 0' }}>
      <div
        style={{
          fontWeight: 'bold',
          marginBottom: 12,
          fontSize: '14px',
          textAlign: 'center',
          color: token.colorText,
        }}
      >
        显存详细信息
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={rowStyle}>
          <div style={labelStyle}>已使用</div>
          <div style={{ color: token.colorText, fontSize: '12px' }}>
            {memoryUsedMb}MB
          </div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>总容量</div>
          <div style={{ color: token.colorText, fontSize: '12px' }}>
            {memoryTotalMb}MB
          </div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>可用</div>
          <div style={{ color: token.colorText, fontSize: '12px' }}>
            {memoryFreeMb}MB
          </div>
        </div>
        <div style={rowStyle}>
          <div style={labelStyle}>使用率</div>
          <div style={{ color: token.colorText, fontSize: '12px' }}>
            {getMemoryUsagePercentage(gpuMemoryUsageGiB, gpuMemoryTotalGiB)}%
          </div>
        </div>
      </div>
    </div>
  );

  const leftContent = (
    <Space className={styles.space} direction="vertical" size="middle">
      {/* 左上 */}
      <div className={styles.innerLine}>
        <Tooltip
          title={gpuTooltipContent}
          placement="topLeft"
          styles={{ root: { maxWidth: 300 } }}
          color={token.colorBgElevated}
        >
          <span style={{ cursor: 'help' }}>
            [{gpuIndex}]{card.gpuName || ''}
          </span>
        </Tooltip>
      </div>

      {/* 左下 */}
      <Tooltip
        title={memoryTooltipContent}
        placement="topLeft"
        styles={{ root: { maxWidth: 250 } }}
        color={token.colorBgElevated}
      >
        <div className={styles.innerLine} style={{ cursor: 'help' }}>
          {gpuMemoryUsageFormatted}/{gpuMemoryTotalFormatted}GiB
        </div>
      </Tooltip>
    </Space>
  );

  const rightContent = (
    <DisableSelectDiv>
      <Space className={styles.space} direction="vertical" size="middle">
        {/* 右上 */}
        <div className={styles.innerLine}>
          <div className={styles.progressTitle}>显存</div>
          {ProgressComponent(memoryUsage)}
        </div>

        {/* 右下 */}
        <div className={styles.innerLine}>
          <div className={styles.progressTitle}>核心</div>
          {ProgressComponent(coreUsage)}
        </div>
      </Space>
    </DisableSelectDiv>
  );

  return (
    <div>
      <Card className={styles.gpuUsageCard}>
        <LinerDividerLayout leftChild={leftContent} rightChild={rightContent} />
        {/* hasData=false：后端标记这张卡没取到数据，数值不可信，必须显式提示 */}
        {card.hasData === false ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: token.colorTextTertiary,
            }}
          >
            该卡未取到数据
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default GpuUsageCard;
