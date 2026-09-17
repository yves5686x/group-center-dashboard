import { Button, Space, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './GpuServerFilter.less';

interface GpuServerFilterProps {
  machineList: API.RealtimeMachine[];
  selectedMachines: API.RealtimeMachine[];
  onSelectionChange: (selectedMachines: API.RealtimeMachine[]) => void;
}

/**
 * 选中标识统一用 serverNameEng。
 *
 * 旧实现用 machineName（展示名）做键，展示名会随后端配置变化，一旦变了，
 * 持久化下来的选中名单就整体失配、看板直接空白。serverNameEng 是聚合层
 * `/gpu`、`/disk` 两个端点的路径参数，天然稳定。
 */
const GpuServerFilter: React.FC<GpuServerFilterProps> = ({
  machineList,
  selectedMachines,
  onSelectionChange,
}) => {
  const [selectedMachineKeys, setSelectedMachineKeys] = useState<Set<string>>(
    new Set(),
  );

  // 标记是否已经手动设置过选择状态（避免自动全选覆盖手动清空）
  const [hasManualSelection, setHasManualSelection] = useState(false);

  // 初始化选中状态 - 只有当没有外部选中状态且没有手动设置过时才默认全选
  useEffect(() => {
    if (
      machineList.length > 0 &&
      selectedMachines.length === 0 &&
      !hasManualSelection
    ) {
      const allMachineKeys = new Set(
        machineList.map((machine) => machine.serverNameEng),
      );
      setSelectedMachineKeys(allMachineKeys);
      onSelectionChange(machineList);
    }
  }, [machineList, selectedMachines.length, hasManualSelection]);

  // 同步外部选中状态
  useEffect(() => {
    const selectedKeys = new Set(
      selectedMachines.map((machine) => machine.serverNameEng),
    );
    setSelectedMachineKeys(selectedKeys);

    // 如果外部传入了空数组，标记为手动选择（避免自动全选）
    if (selectedMachines.length === 0) {
      setHasManualSelection(true);
    }
  }, [selectedMachines]);

  const handleMachineToggle = (machine: API.RealtimeMachine) => {
    const newSelectedKeys = new Set(selectedMachineKeys);

    if (newSelectedKeys.has(machine.serverNameEng)) {
      newSelectedKeys.delete(machine.serverNameEng);
    } else {
      newSelectedKeys.add(machine.serverNameEng);
    }

    setSelectedMachineKeys(newSelectedKeys);
    setHasManualSelection(true); // 标记为手动选择

    // 更新选中的机器列表
    const newSelectedMachines = machineList.filter((item) =>
      newSelectedKeys.has(item.serverNameEng),
    );
    onSelectionChange(newSelectedMachines);
  };

  const handleSelectAll = () => {
    const allMachineKeys = new Set(
      machineList.map((machine) => machine.serverNameEng),
    );
    setSelectedMachineKeys(allMachineKeys);
    setHasManualSelection(true); // 标记为手动选择
    onSelectionChange(machineList);
  };

  const handleClearAll = () => {
    // 清空选择，不选择任何机器
    setSelectedMachineKeys(new Set());
    setHasManualSelection(true); // 标记为手动清空
    onSelectionChange([]);
  };

  const isSelected = (serverNameEng: string) => {
    return selectedMachineKeys.has(serverNameEng);
  };

  return (
    <div className={styles.gpuServerFilter}>
      <div className={styles.filterHeader}>
        <span className={styles.filterTitle}>GPU服务器筛选</span>
        <Space size="small">
          <Button
            size="small"
            type="link"
            onClick={handleSelectAll}
            className={styles.actionButton}
          >
            全选
          </Button>
          <Button
            size="small"
            type="link"
            onClick={handleClearAll}
            className={styles.actionButton}
          >
            清空
          </Button>
        </Space>
      </div>

      <div className={styles.machineButtons}>
        {machineList.map((machine) => (
          <Tooltip
            key={machine.serverNameEng}
            title={
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div>标识：{machine.serverNameEng}</div>
                {machine.position ? <div>位置：{machine.position}</div> : null}
                {/* stale 只说明缓存里的快照过期，和心跳是两回事 */}
                <div>数据状态：{machine.stale ? '可能过期' : '正常'}</div>
              </div>
            }
          >
            <Button
              type={isSelected(machine.serverNameEng) ? 'primary' : 'default'}
              className={`${styles.machineButton} ${
                isSelected(machine.serverNameEng)
                  ? styles.selected
                  : styles.unselected
              }`}
              onClick={() => handleMachineToggle(machine)}
            >
              <Space size={6}>{machine.serverName}</Space>
            </Button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};

export default GpuServerFilter;
