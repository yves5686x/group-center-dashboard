import { PageContainer } from '@ant-design/pro-components';
import { Alert, message, Modal } from 'antd';
import React, { useEffect, useState } from 'react';

import { queryGpuTasksSimple } from '@/services/group_center/gpuTaskQuery';
import TaskQueryForm from './components/TaskQueryForm';
import TaskResultTable from './components/TaskResultTable';
import styles from './index.less';

const TaskQueryPage: React.FC = () => {
  const [queryParams, setQueryParams] = useState<API.queryGpuTasksSimpleParams>(
    {},
  );
  const [queryResults, setQueryResults] = useState<API.GpuTaskInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<any>({});

  // 解析URL参数并设置查询条件
  useEffect(() => {
    const parseUrlParams = () => {
      const searchParams = new URLSearchParams(location.search);
      const params: API.queryGpuTasksSimpleParams = {
        page: 1,
        pageSize: 20,
        sortBy: 'TASK_START_TIME',
        sortOrder: 'DESC',
      };

      // 解析用户名
      const userName = searchParams.get('userName');
      if (userName) {
        params.userName = userName;
      }

      // 解析项目名称
      const projectName = searchParams.get('projectName');
      if (projectName) {
        params.projectName = projectName;
      }

      // 解析设备名称
      const deviceName = searchParams.get('deviceName');
      if (deviceName) {
        params.deviceName = deviceName;
      }

      // 解析任务类型
      const taskType = searchParams.get('taskType');
      if (taskType) {
        params.taskType = taskType as any;
      }

      // 解析多GPU任务
      const isMultiGpu = searchParams.get('isMultiGpu');
      if (isMultiGpu) {
        params.isMultiGpu = isMultiGpu === 'true';
      }

      // 解析分页参数
      const page = searchParams.get('page');
      if (page) {
        params.page = parseInt(page, 10);
      }

      const pageSize = searchParams.get('pageSize');
      if (pageSize) {
        params.pageSize = parseInt(pageSize, 10);
      }

      // 解析排序参数
      const sortBy = searchParams.get('sortBy');
      if (sortBy) {
        params.sortBy = sortBy as any;
      }

      const sortOrder = searchParams.get('sortOrder');
      if (sortOrder) {
        params.sortOrder = sortOrder as any;
      }

      // 检查是否有实际的查询条件（除了默认的分页和排序参数）
      const hasActualQueryParams =
        userName || projectName || deviceName || taskType || isMultiGpu;

      // 如果有URL参数，设置表单字段值并自动执行查询
      if (hasActualQueryParams) {
        console.log('从URL参数自动执行查询:', params);

        // 设置表单字段值
        const formValues: any = {};
        if (userName) formValues.userName = userName;
        if (projectName) formValues.projectName = projectName;
        if (deviceName) formValues.deviceName = deviceName;
        if (taskType) formValues.taskType = taskType;
        if (isMultiGpu) formValues.isMultiGpu = isMultiGpu === 'true';
        if (page) formValues.page = parseInt(page, 10);
        if (pageSize) formValues.pageSize = parseInt(pageSize, 10);
        if (sortBy) formValues.sortBy = sortBy;
        if (sortOrder) formValues.sortOrder = sortOrder;

        // 设置表单初始值
        setFormInitialValues(formValues);

        // 延迟执行查询，确保表单已经设置
        setTimeout(() => {
          handleQuery(params);
        }, 100);
      } else {
        // 没有实际查询条件，只设置表单初始值但不执行查询
        const formValues: any = {};
        if (page) formValues.page = parseInt(page, 10);
        if (pageSize) formValues.pageSize = parseInt(pageSize, 10);
        if (sortBy) formValues.sortBy = sortBy;
        if (sortOrder) formValues.sortOrder = sortOrder;

        if (Object.keys(formValues).length > 0) {
          setFormInitialValues(formValues);
        }
      }
    };

    parseUrlParams();
  }, [location.search]);

  const handleQuery = async (params: API.queryGpuTasksSimpleParams) => {
    // 检查是否为空查询条件
    const isEmptyQuery =
      !params.userName &&
      !params.projectName &&
      !params.deviceName &&
      !params.taskType &&
      !params.startTime &&
      !params.endTime &&
      params.isMultiGpu === undefined;

    if (isEmptyQuery) {
      // 显示确认弹窗
      Modal.confirm({
        title: '空条件查询确认',
        content: '您没有设置任何查询条件，这将查询所有任务。确定要继续吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          executeQuery(params);
        },
      });
    } else {
      executeQuery(params);
    }
  };

  const executeQuery = async (params: API.queryGpuTasksSimpleParams) => {
    setLoading(true);
    setQueryParams(params);

    try {
      console.log('开始查询，参数:', params);
      const result = await queryGpuTasksSimple(params);
      console.log('查询结果:', result);

      if ((result.isSucceed ?? (result as any).succeed) && result.result) {
        // 根据API响应结构调整 - 后端返回的数据结构包含pagination
        const data = result.result.data || result.result.list || [];
        const pagination = result.result.pagination;

        // 使用pagination中的totalItems作为总数
        const total =
          pagination?.totalItems ||
          result.result.total ||
          result.result.totalCount ||
          0;

        setQueryResults(Array.isArray(data) ? data : []);
        setTotalCount(total);
        setQueryError(null);
      } else {
        console.error('查询失败:', result);
        setQueryResults([]);
        setTotalCount(0);
        setQueryError('查询失败：服务返回异常，请稍后重试');
        message.error('查询失败：服务返回异常，请稍后重试');
      }
    } catch (error) {
      console.error('查询异常:', error);
      setQueryResults([]);
      setTotalCount(0);
      setQueryError('查询失败：无法连接服务器，请稍后重试');
      message.error('查询失败：无法连接服务器，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleParamsChange = (newParams: API.queryGpuTasksSimpleParams) => {
    // 当分页参数改变时，重新执行查询
    setQueryParams(newParams);
    handleQuery(newParams);
  };

  const handleReset = () => {
    setQueryParams({});
    setQueryResults([]);
    setTotalCount(0);
    setQueryError(null);
  };

  return (
    <PageContainer
      title="GPU任务查询"
      content="查询和分析GPU任务执行情况"
      ghost
    >
      <div className={styles.taskQueryPage}>
        {/* 查询表单 */}
        <div className={styles.queryFormSection}>
          <TaskQueryForm
            onQuery={handleQuery}
            onReset={handleReset}
            loading={loading}
            initialValues={formInitialValues}
          />
        </div>

        {/* 查询结果 */}
        <div className={styles.resultSection}>
          {queryError && (
            <Alert
              type="error"
              showIcon
              message={queryError}
              style={{ marginBottom: 16 }}
            />
          )}
          <TaskResultTable
            data={queryResults}
            loading={loading}
            total={totalCount}
            queryParams={queryParams}
            onParamsChange={handleParamsChange}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default TaskQueryPage;
