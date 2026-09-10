import { ClearOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';
import React, { useState } from 'react';

import { useGpuTaskFilterCardStore } from '@/data/store/modules/filter/GpuTaskFilterCard';
import { useGpuTaskFilterMachineStore } from '@/data/store/modules/filter/GpuTaskFilterMachine';
import { useGpuTaskFilterMultiGpuStore } from '@/data/store/modules/filter/GpuTaskFilterMultiGpu';
import { useGpuTaskFilterProjectNameStore } from '@/data/store/modules/filter/GpuTaskFilterProjectName';
import { useGpuTaskFilterUserNameStore } from '@/data/store/modules/filter/GpuTaskFilterUserName';
import GpuTaskFilterPanel from '@/pages/GpuDashboard/GpuTaskFilterPanel';
import styles from './FilterGroup.less';
import GpuCardFilter from './GpuCardFilter';
import GpuServerFilter from './GpuServerFilter';

interface FilterGroupProps {
  machineList: API.RealtimeMachine[];
  selectedMachines: API.RealtimeMachine[];
  onSelectionChange: (machines: API.RealtimeMachine[]) => void;
}

const FilterGroup: React.FC<FilterGroupProps> = ({
  machineList,
  selectedMachines,
  onSelectionChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  // 获取所有过滤器的清除方法
  const clearUserFilter = useGpuTaskFilterUserNameStore(
    (state) => state.clearUserFilter,
  );
  const clearProjectFilter = useGpuTaskFilterProjectNameStore(
    (state) => state.clearProjectFilter,
  );
  const clearAllCardFilters = useGpuTaskFilterCardStore(
    (state) => state.clearAllCardFilters,
  );
  const clearMultiGpuFilter = useGpuTaskFilterMultiGpuStore(
    (state) => state.clearMultiGpuFilter,
  );
  const clearMachineSelection = useGpuTaskFilterMachineStore(
    (state) => state.clearMachineSelection,
  );

  // 禁用所有筛选器
  const handleDisableAllFilters = () => {
    // 清除用户名过滤器
    clearUserFilter();

    // 清除工程名过滤器
    clearProjectFilter();

    // 清除按卡筛选器
    clearAllCardFilters();

    // 清除多GPU筛选器
    clearMultiGpuFilter();

    // 对于GPU服务器筛选器，全选所有机器而不是清空
    // 持久化的是 serverNameEng，不是展示名
    const allMachines = machineList;
    clearMachineSelection(allMachines.map((machine) => machine.serverNameEng));
    onSelectionChange(allMachines);
  };

  return (
    <div className={styles.filterGroupContainer}>
      {/* 筛选器显示/隐藏按钮和清除按钮 */}
      <div className={styles.filterToggle}>
        <Space size="small">
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            {showFilters ? '隐藏筛选器' : '显示筛选器'}
          </Button>
          <Button
            type="default"
            icon={<ClearOutlined />}
            onClick={handleDisableAllFilters}
            size="small"
            danger
          >
            禁用所有筛选器
          </Button>
        </Space>
      </div>

      {/* 筛选器组 */}
      <div
        className={`${styles.filterContent} ${showFilters ? styles.filterContentVisible : styles.filterContentHidden}`}
      >
        <Card size="small" className={styles.filterCard} title="筛选器">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* GPU服务器筛选 */}
            <div className={styles.filterSection}>
              <div className={styles.filterLabel}>GPU服务器筛选</div>
              <Space
                direction="vertical"
                size="middle"
                style={{ width: '100%' }}
              >
                {/* 按GPU服务器 */}
                <div className={styles.filterSubSection}>
                  <div className={styles.filterSubLabel}>按GPU服务器</div>
                  <GpuServerFilter
                    machineList={machineList}
                    selectedMachines={selectedMachines}
                    onSelectionChange={onSelectionChange}
                  />
                </div>

                {/* 按卡筛选器 */}
                <div className={styles.filterSubSection}>
                  <div className={styles.filterSubLabel}>按卡筛选</div>
                  <GpuCardFilter />
                </div>
              </Space>
            </div>

            {/* 任务筛选器（用户名和工程名过滤） */}
            <div className={styles.filterSection}>
              <div className={styles.filterLabel}>任务筛选</div>
              <GpuTaskFilterPanel />
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default FilterGroup;
