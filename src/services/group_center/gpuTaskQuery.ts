// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

export type TaskQueryOptions = {
  users: string[];
  servers: { serverNameEng: string; serverName: string }[];
};

export async function getTaskQueryOptions() {
  return request<API.ClientResponse & { result?: TaskQueryOptions }>(
    '/web/open/gpu-tasks/options',
    { method: 'GET' },
  );
}

/** Get Total Task Count Retrieve the total number of GPU tasks in the database GET /web/open/gpu-tasks/count */
export async function getTotalTaskCount(options?: { [key: string]: any }) {
  return request<API.ClientResponse>('/web/open/gpu-tasks/count', {
    method: 'GET',
    ...(options || {}),
  });
}

/** Get Device Task Statistics Retrieve detailed statistics for GPU tasks on a specific device GET /web/open/gpu-tasks/device-stats/${param0} */
export async function getDeviceTaskStats(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getDeviceTaskStatsParams,
  options?: { [key: string]: any },
) {
  const { deviceName: param0, ...queryParams } = params;
  return request<API.ClientResponse>(
    `/web/open/gpu-tasks/device-stats/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    },
  );
}

/** GPU Task Simple Query 
            Simple GPU task query with commonly used parameters via URL query string.
            Provides basic filtering capabilities for quick searches without complex request body.
            Supports filtering by user, project, device, task type, and time range.
         GET /web/open/gpu-tasks/query */
export async function queryGpuTasksSimple(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.queryGpuTasksSimpleParams,
  options?: { [key: string]: any },
) {
  return request<API.ClientResponse>('/web/open/gpu-tasks/query', {
    method: 'GET',
    params: {
      // page has a default value: 1
      page: '1',
      // pageSize has a default value: 20
      pageSize: '20',
      // sortBy has a default value: TASK_START_TIME
      sortBy: 'TASK_START_TIME',
      // sortOrder has a default value: DESC
      sortOrder: 'DESC',
      ...params,
    },
    ...(options || {}),
  });
}

/** GPU Task Advanced Query 
            Advanced GPU task query with flexible filtering, time range, and logical combinations.
            Supports complex query conditions including:
            - Multiple field filters with different operators (equals, like, contains, etc.)
            - Time range filtering (start time and end time)
            - Pagination with customizable page size and sorting
            - Logical combinations (AND/OR) of multiple conditions
            - Statistics inclusion option for query results
         POST /web/open/gpu-tasks/query */
export async function queryGpuTasks(
  body: API.GpuTaskQueryRequest,
  options?: { [key: string]: any },
) {
  return request<API.ClientResponse>('/web/open/gpu-tasks/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** Get Recent Tasks Retrieve GPU tasks from the last N hours GET /web/open/gpu-tasks/recent */
export async function getRecentTasks(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getRecentTasksParams,
  options?: { [key: string]: any },
) {
  return request<API.ClientResponse>('/web/open/gpu-tasks/recent', {
    method: 'GET',
    params: {
      // hours has a default value: 24
      hours: '24',
      ...params,
    },
    ...(options || {}),
  });
}

/** Get Task by Task ID Retrieve a specific GPU task by exact task ID match GET /web/open/gpu-tasks/task/${param0} */
export async function getTaskByTaskId(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getTaskByTaskIdParams,
  options?: { [key: string]: any },
) {
  const { taskId: param0, ...queryParams } = params;
  return request<API.ClientResponse>(`/web/open/gpu-tasks/task/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** Get User Task Statistics Retrieve detailed statistics for a specific user's GPU tasks GET /web/open/gpu-tasks/user-stats/${param0} */
export async function getUserTaskStats(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getUserTaskStatsParams,
  options?: { [key: string]: any },
) {
  const { userName: param0, ...queryParams } = params;
  return request<API.ClientResponse>(
    `/web/open/gpu-tasks/user-stats/${param0}`,
    {
      method: 'GET',
      params: { ...queryParams },
      ...(options || {}),
    },
  );
}
