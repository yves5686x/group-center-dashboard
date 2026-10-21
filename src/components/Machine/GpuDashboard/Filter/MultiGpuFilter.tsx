import { useGpuTaskFilterMultiGpuStore } from '@/data/store/modules/filter/GpuTaskFilterMultiGpu';
import { Button, message, Modal, Select, Space } from 'antd';
import React, { useState } from 'react';

const { Option } = Select;

const MultiGpuFilter: React.FC = () => {
  const multiGpuFilter = useGpuTaskFilterMultiGpuStore(
    (state) => state.multiGpuFilter,
  );
  const setMultiGpuFilter = useGpuTaskFilterMultiGpuStore(
    (state) => state.setMultiGpuFilter,
  );

  const [open, setOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'none' | 'single' | 'multi'
  >(multiGpuFilter);

  const [messageApi, contextHolder] = message.useMessage();

  const getButtonText = () => {
    switch (multiGpuFilter) {
      case 'none':
        return '多卡任务: 不启用';
      case 'single':
        return '多卡任务: 只显示单卡任务';
      case 'multi':
        return '多卡任务: 只显示多卡任务';
      default:
        return '多卡任务: 不启用';
    }
  };

  const getButtonType = () => {
    return multiGpuFilter !== 'none' ? 'primary' : 'default';
  };

  const handleSave = () => {
    setMultiGpuFilter(selectedFilter);
    setOpen(false);

    messageApi.open({
      type: 'success',
      content: '多卡任务过滤器设置成功',
    });
  };

  const handleClear = () => {
    setSelectedFilter('none');
    setMultiGpuFilter('none');
    setOpen(false);

    messageApi.open({
      type: 'success',
      content: '多卡任务过滤器已清除',
    });
  };

  const handleCancel = () => {
    setSelectedFilter(multiGpuFilter);
    setOpen(false);
    messageApi.info('取消修改多卡任务过滤器');
  };

  return (
    <div>
      {contextHolder}

      <Button type={getButtonType()} onClick={() => setOpen(true)}>
        {getButtonText()}
      </Button>

      <Modal
        open={open}
        title="多卡任务过滤器"
        onOk={handleCancel}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="clear" type="default" onClick={handleClear}>
            清除过滤器
          </Button>,
          <Button key="save" type="primary" onClick={handleSave}>
            保存
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <p>选择多卡任务过滤模式：</p>
          <Select
            value={selectedFilter}
            onChange={(value: 'none' | 'single' | 'multi') =>
              setSelectedFilter(value)
            }
            style={{ width: '100%' }}
          >
            <Option value="none">不启用</Option>
            <Option value="single">只显示单卡任务</Option>
            <Option value="multi">只显示多卡任务</Option>
          </Select>

          <div
            style={{
              fontSize: '12px',
              color: 'var(--ant-color-text-secondary)',
              marginTop: '8px',
            }}
          >
            {selectedFilter === 'none' && '• 显示所有任务（单卡和多卡）'}
            {selectedFilter === 'single' && '• 仅显示单GPU卡运行的任务'}
            {selectedFilter === 'multi' && '• 仅显示多GPU卡并行运行的任务'}
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default MultiGpuFilter;
