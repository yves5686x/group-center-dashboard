import { useGpuTaskFilterCardStore } from '@/data/store/modules/filter/GpuTaskFilterCard';
import { Button, Input, message, Modal, Select, Space, Switch } from 'antd';
import React, { useState } from 'react';

const { Option } = Select;

const GpuCardFilter: React.FC = () => {
  const gpuIdFilter = useGpuTaskFilterCardStore((state) => state.gpuIdFilter);
  const gpuNameFilter = useGpuTaskFilterCardStore(
    (state) => state.gpuNameFilter,
  );
  const setGpuIdFilter = useGpuTaskFilterCardStore(
    (state) => state.setGpuIdFilter,
  );
  const setGpuIdFilterEnabled = useGpuTaskFilterCardStore(
    (state) => state.setGpuIdFilterEnabled,
  );
  const setGpuNameFilter = useGpuTaskFilterCardStore(
    (state) => state.setGpuNameFilter,
  );
  const setGpuNameFilterEnabled = useGpuTaskFilterCardStore(
    (state) => state.setGpuNameFilterEnabled,
  );
  const clearAllCardFilters = useGpuTaskFilterCardStore(
    (state) => state.clearAllCardFilters,
  );

  const [open, setOpen] = useState(false);
  const [selectedGpuIds, setSelectedGpuIds] = useState<number[]>(
    gpuIdFilter.gpuIds,
  );
  const [gpuIdRange, setGpuIdRange] = useState<
    { min: number; max: number } | undefined
  >(gpuIdFilter.range);
  const [gpuName, setGpuName] = useState(gpuNameFilter.gpuName);
  const [isFuzzyMatch, setIsFuzzyMatch] = useState(gpuNameFilter.isFuzzyMatch);
  const [gpuIdFilterEnabled, setGpuIdFilterEnabledLocal] = useState(
    gpuIdFilter.enabled,
  );
  const [gpuNameFilterEnabled, setGpuNameFilterEnabledLocal] = useState(
    gpuNameFilter.enabled,
  );

  const [messageApi, contextHolder] = message.useMessage();

  const getButtonText = () => {
    const filters = [];

    if (gpuIdFilter.enabled) {
      if (gpuIdFilter.range) {
        filters.push(`卡号:${gpuIdFilter.range.min}-${gpuIdFilter.range.max}`);
      } else if (gpuIdFilter.gpuIds.length > 0) {
        filters.push(`卡号:${gpuIdFilter.gpuIds.join(',')}`);
      } else {
        filters.push('卡号:未设定');
      }
    }

    if (gpuNameFilter.enabled) {
      if (gpuNameFilter.gpuName) {
        filters.push(`卡名:${gpuNameFilter.gpuName}`);
      } else {
        filters.push('卡名:未设定');
      }
    }

    return filters.length > 0
      ? `按卡筛选: ${filters.join(' | ')}`
      : '按卡筛选: 未启用';
  };

  const getButtonType = () => {
    return gpuIdFilter.enabled || gpuNameFilter.enabled ? 'primary' : 'default';
  };

  const handleSave = () => {
    // 调试日志：保存前的状态
    console.log('GpuCardFilter - Saving filter state:', {
      gpuIdFilterEnabled,
      selectedGpuIds,
      gpuIdRange,
      gpuNameFilterEnabled,
      gpuName,
      isFuzzyMatch,
    });

    // 保存卡号筛选设置
    if (gpuIdFilterEnabled) {
      setGpuIdFilter(selectedGpuIds, gpuIdRange);
      setGpuIdFilterEnabled(true);
    } else {
      setGpuIdFilterEnabled(false);
    }

    // 保存卡名称筛选设置
    if (gpuNameFilterEnabled) {
      setGpuNameFilter(gpuName, isFuzzyMatch);
      setGpuNameFilterEnabled(true);
    } else {
      setGpuNameFilterEnabled(false);
    }

    setOpen(false);

    messageApi.open({
      type: 'success',
      content: '按卡筛选设置成功',
    });
  };

  const handleClear = () => {
    clearAllCardFilters();
    setSelectedGpuIds([]);
    setGpuIdRange(undefined);
    setGpuName('');
    setIsFuzzyMatch(true);
    setGpuIdFilterEnabledLocal(false);
    setGpuNameFilterEnabledLocal(false);
    setOpen(false);

    messageApi.open({
      type: 'success',
      content: '按卡筛选已清除',
    });
  };

  const handleCancel = () => {
    // 恢复原始状态
    setSelectedGpuIds(gpuIdFilter.gpuIds);
    setGpuIdRange(gpuIdFilter.range);
    setGpuName(gpuNameFilter.gpuName);
    setIsFuzzyMatch(gpuNameFilter.isFuzzyMatch);
    setGpuIdFilterEnabledLocal(gpuIdFilter.enabled);
    setGpuNameFilterEnabledLocal(gpuNameFilter.enabled);
    setOpen(false);
    messageApi.info('取消修改按卡筛选');
  };

  const handleGpuIdSelectionChange = (values: number[]) => {
    setSelectedGpuIds(values);
    setGpuIdRange(undefined); // 清除范围设置
  };

  const handleRangeMinChange = (value: string) => {
    const min = parseInt(value) || 0;
    setGpuIdRange((prev) => ({
      min,
      max: prev?.max || min,
    }));
    setSelectedGpuIds([]); // 清除单选设置
  };

  const handleRangeMaxChange = (value: string) => {
    const max = parseInt(value) || 0;
    setGpuIdRange((prev) => ({
      min: prev?.min || 0,
      max,
    }));
    setSelectedGpuIds([]); // 清除单选设置
  };

  // 生成0-7的卡号选项（最多8卡）
  const gpuIdOptions = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div>
      {contextHolder}

      <Button type={getButtonType()} onClick={() => setOpen(true)}>
        {getButtonText()}
      </Button>

      <Modal
        open={open}
        title="按卡筛选设置"
        onOk={handleSave}
        onCancel={handleCancel}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="clear" type="default" onClick={handleClear}>
            清除所有筛选
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            保存
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 按卡号筛选设置 */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Switch
                  checked={gpuIdFilterEnabled}
                  onChange={setGpuIdFilterEnabledLocal}
                />
                <span style={{ fontWeight: 'bold' }}>按GPU卡号筛选</span>
              </Space>
            </div>

            {gpuIdFilterEnabled && (
              <Space
                direction="vertical"
                style={{ width: '100%', paddingLeft: 24 }}
                size="small"
              >
                <div>
                  <span style={{ marginRight: 8 }}>选择卡号:</span>
                  <Select
                    mode="multiple"
                    value={selectedGpuIds}
                    onChange={handleGpuIdSelectionChange}
                    style={{ width: '100%' }}
                    placeholder="选择GPU卡号"
                    disabled={!!gpuIdRange}
                  >
                    {gpuIdOptions.map((id) => (
                      <Option key={id} value={id}>
                        卡 {id}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--ant-color-text-secondary)',
                  }}
                >
                  或
                </div>

                <div>
                  <span style={{ marginRight: 8 }}>卡号范围:</span>
                  <Space>
                    <Input
                      placeholder="最小卡号"
                      value={gpuIdRange?.min?.toString() || ''}
                      onChange={(e) => handleRangeMinChange(e.target.value)}
                      style={{ width: 80 }}
                      disabled={selectedGpuIds.length > 0}
                    />
                    <span>-</span>
                    <Input
                      placeholder="最大卡号"
                      value={gpuIdRange?.max?.toString() || ''}
                      onChange={(e) => handleRangeMaxChange(e.target.value)}
                      style={{ width: 80 }}
                      disabled={selectedGpuIds.length > 0}
                    />
                  </Space>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--ant-color-text-secondary)',
                  }}
                >
                  {selectedGpuIds.length > 0 &&
                    `• 将显示卡号 ${selectedGpuIds.join(', ')} 的任务`}
                  {gpuIdRange &&
                    `• 将显示卡号 ${gpuIdRange.min}-${gpuIdRange.max} 的任务`}
                  {!selectedGpuIds.length &&
                    !gpuIdRange &&
                    '• 请选择卡号或设置范围'}
                </div>
              </Space>
            )}
          </div>

          {/* 按卡名称筛选设置 */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Switch
                  checked={gpuNameFilterEnabled}
                  onChange={setGpuNameFilterEnabledLocal}
                />
                <span style={{ fontWeight: 'bold' }}>按GPU卡名称筛选</span>
              </Space>
            </div>

            {gpuNameFilterEnabled && (
              <Space
                direction="vertical"
                style={{ width: '100%', paddingLeft: 24 }}
                size="small"
              >
                <div>
                  <Input
                    placeholder="输入GPU卡名称（如：RTX 4090, A100等）"
                    value={gpuName}
                    onChange={(e) => setGpuName(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <Space>
                    <span>匹配模式:</span>
                    <Switch
                      checked={isFuzzyMatch}
                      onChange={setIsFuzzyMatch}
                      checkedChildren="模糊匹配"
                      unCheckedChildren="精确匹配"
                    />
                  </Space>
                </div>

                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--ant-color-text-secondary)',
                  }}
                >
                  {gpuName && `• 将显示GPU卡名称包含 "${gpuName}" 的任务`}
                  {!gpuName && '• 请输入GPU卡名称进行筛选'}
                </div>
              </Space>
            )}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: 'var(--ant-color-text-secondary)',
              marginTop: 16,
            }}
          >
            提示：两种筛选模式可以同时使用，采用AND逻辑
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default GpuCardFilter;
