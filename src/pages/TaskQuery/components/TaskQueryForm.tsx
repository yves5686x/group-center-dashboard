import {
  getTaskQueryOptions,
  TaskQueryOptions,
} from '@/services/group_center/gpuTaskQuery';
import {
  getMachineDisplayName,
  sortGpuMachines,
} from '@/utils/machinePresentation';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface TaskQueryFormProps {
  onQuery: (params: API.queryGpuTasksSimpleParams) => void;
  onReset: () => void;
  loading: boolean;
  initialValues?: any;
}

const TaskQueryForm: React.FC<TaskQueryFormProps> = ({
  onQuery,
  onReset,
  loading,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<TaskQueryOptions>({
    users: [],
    servers: [],
  });
  const [optionsError, setOptionsError] = useState(false);

  useEffect(() => {
    let active = true;
    getTaskQueryOptions()
      .then((response) => {
        if (!active) return;
        if (
          !(response.isSucceed ?? (response as any).succeed) ||
          !response.result
        ) {
          setOptionsError(true);
          return;
        }
        setOptions(response.result);
      })
      .catch(() => {
        if (active) setOptionsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // 当initialValues变化时，设置表单值
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const handleSubmit = (values: any) => {
    // 空条件确认统一在页面层 handleQuery 中处理，这里直接提交，
    // 避免两层各弹一次确认框导致用户需要点两次「确定」。
    executeQuery(values);
  };

  const executeQuery = (values: any) => {
    const params: API.queryGpuTasksSimpleParams = {
      userName: values.userName,
      projectName: values.projectName,
      serverNameEng: values.serverNameEng,
      isMultiGpu: values.isMultiGpu,
      page: 1,
      pageSize: values.pageSize ?? 20,
      sortBy: values.sortBy ?? 'TASK_START_TIME',
      sortOrder: values.sortOrder ?? 'DESC',
    };

    // 处理时间范围
    if (values.timeRange && values.timeRange.length === 2) {
      params.startTime = values.timeRange[0].toISOString();
      params.endTime = values.timeRange[1].toISOString();
    }

    onQuery(params);
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  return (
    <Card title="任务查询" size="small">
      {optionsError && (
        <Alert
          type="warning"
          showIcon
          title="用户和服务器列表加载失败"
          description="请确认后端已更新后刷新页面。用户名和项目名称仍可输入关键词查询。"
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          page: 1,
          pageSize: 20,
          sortBy: 'TASK_START_TIME',
          sortOrder: 'DESC',
        }}
      >
        <Row gutter={16}>
          {/* 基础查询条件 */}
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="用户名" name="userName">
              <AutoComplete
                placeholder="选择用户或输入部分用户名"
                allowClear
                options={options.users.map((name) => ({ value: name }))}
                filterOption={(input, option) =>
                  (option?.value ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Form.Item label="项目名称" name="projectName">
              <Input placeholder="输入项目名称关键词（模糊查询）" allowClear />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Form.Item label="服务器名称" name="serverNameEng">
              <Select
                placeholder="全部服务器"
                allowClear
                showSearch
                optionFilterProp="label"
                options={sortGpuMachines(options.servers).map((server) => ({
                  value: server.serverNameEng,
                  label: getMachineDisplayName(server),
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item label="时间范围" name="timeRange">
              <RangePicker
                showTime
                style={{ width: '100%' }}
                placeholder={['开始时间', '结束时间']}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              label="多GPU任务"
              name="isMultiGpu"
              valuePropName="checked"
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </Col>
        </Row>

        {/* 高级查询开关 */}
        <div style={{ marginBottom: 16 }}>
          <Button
            type="link"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ padding: 0 }}
          >
            {showAdvanced ? '隐藏高级查询' : '显示高级查询'}
          </Button>
        </div>

        {/* 高级查询条件 */}
        {showAdvanced && (
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="排序字段" name="sortBy">
                <Select>
                  <Option value="TASK_START_TIME">开始时间</Option>
                  <Option value="TASK_FINISH_TIME">结束时间</Option>
                  <Option value="TASK_RUNNING_TIME_IN_SECONDS">运行时长</Option>
                  <Option value="GPU_USAGE_PERCENT">GPU使用率</Option>
                  <Option value="GPU_MEMORY_PERCENT">显存使用率</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label="排序方向" name="sortOrder">
                <Select>
                  <Option value="DESC">降序</Option>
                  <Option value="ASC">升序</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item label="每页数量" name="pageSize">
                <Select>
                  <Option value={10}>10条</Option>
                  <Option value={20}>20条</Option>
                  <Option value={50}>50条</Option>
                  <Option value={100}>100条</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* 操作按钮 */}
        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              htmlType="submit"
              loading={loading}
            >
              查询
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading}
            >
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TaskQueryForm;
