/**
 * 实时数据同源聚合层接口。
 *
 * 三个端点都在 `/web/open/**` 下，无需鉴权，返回统一信封 ClientResponse。
 * 数据由 group-center 统一 pull agent 并做 5s TTL 缓存，因此：
 *   - 前端不再拼 machineUrl 直连 agent（去 CORS、去拓扑暴露）
 *   - N 个页面共享同一份快照，轮询频率前端自定（建议 2~5s），后端会自动去重
 *
 * 本模块负责把信封拆开，只把 result 交给上层；失败时抛错，由调用方的
 * 轮询 hook 保留上一次成功的数据（客户端侧的 last-known-good）。
 */
import { request } from '@umijs/max';

/** Kotlin 的 isSucceed 可能被 Jackson 序列化成 succeed，两者都认 */
const isEnvelopeSucceed = (envelope: API.RealtimeClientResponse<any>) => {
  return envelope?.isSucceed ?? envelope?.succeed ?? false;
};

/**
 * 拆信封：成功返回 result，失败抛出带后端说明的错误。
 * result 缺失时按失败处理，避免上层拿到 undefined 后到处做空值判断。
 */
const unwrap = <T>(
  envelope: API.RealtimeClientResponse<T>,
  endpoint: string,
): T => {
  if (!envelope) {
    throw new Error(`${endpoint} 返回空响应`);
  }

  if (!isEnvelopeSucceed(envelope)) {
    throw new Error(
      `${endpoint} 返回失败 (serverVersion=${envelope.serverVersion})`,
    );
  }

  if (envelope.result === undefined || envelope.result === null) {
    throw new Error(`${endpoint} 缺少 result`);
  }

  return envelope.result;
};

/** 获取实时机器列表 GET /web/open/realtime/machines */
export async function getRealtimeMachines(options?: { [key: string]: any }) {
  const endpoint = '/web/open/realtime/machines';
  const envelope = await request<
    API.RealtimeClientResponse<API.RealtimeMachine[]>
  >(endpoint, {
    method: 'GET',
    ...(options || {}),
  });

  const machines = unwrap(envelope, endpoint);
  return Array.isArray(machines) ? machines : [];
}

/**
 * 获取单机 GPU 详情（整机所有卡，含空闲卡）
 * GET /web/open/realtime/machines/{serverNameEng}/gpu
 *
 * 替代旧的 gpu_count + 逐卡 gpu_usage_info + 逐卡 gpu_task_info。
 */
export async function getRealtimeGpuSnapshot(
  serverNameEng: string,
  options?: { [key: string]: any },
) {
  const endpoint = `/web/open/realtime/machines/${encodeURIComponent(serverNameEng)}/gpu`;
  const envelope = await request<
    API.RealtimeClientResponse<API.RealtimeGpuSnapshot>
  >(endpoint, {
    method: 'GET',
    ...(options || {}),
  });

  return unwrap(envelope, endpoint);
}

/**
 * 获取单机磁盘 + 内存
 * GET /web/open/realtime/machines/{serverNameEng}/disk
 *
 * 替代旧的 disk_usage + system_info。
 */
export async function getRealtimeDiskSnapshot(
  serverNameEng: string,
  options?: { [key: string]: any },
) {
  const endpoint = `/web/open/realtime/machines/${encodeURIComponent(serverNameEng)}/disk`;
  const envelope = await request<
    API.RealtimeClientResponse<API.RealtimeDiskSnapshot>
  >(endpoint, {
    method: 'GET',
    ...(options || {}),
  });

  return unwrap(envelope, endpoint);
}

export default {
  getRealtimeMachines,
  getRealtimeGpuSnapshot,
  getRealtimeDiskSnapshot,
};
