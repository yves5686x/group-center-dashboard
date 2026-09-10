import {
  getRealtimeDiskSnapshot,
  getRealtimeGpuSnapshot,
  getRealtimeMachines,
} from '@/services/group_center/realtime';
import { useEffect, useRef, useState } from 'react';

/**
 * 轮询结果。
 *
 * `data` 在请求失败时 **保留上一次成功的值**（客户端侧的 last-known-good），
 * 配合 `error` 让 UI 能同时显示旧数据和「取数失败」的提示，而不是整块变空白。
 */
export interface RealtimePollingState<T> {
  data?: T;
  /** 是否还在等第一次响应 */
  loading: boolean;
  /** 最近一次失败的原因；成功后清空 */
  error?: string;
  /** 最近一次成功刷新的本地时间（毫秒），用于「最后更新」展示 */
  lastFetchedAt?: number;
}

/**
 * 通用轮询 hook。
 *
 * 后端对每个端点做了 5s TTL 缓存与去重，前端 2~5s 轮询不会压垮 agent。
 * 单次请求未返回时会跳过本轮 tick，避免慢响应堆积。
 */
const usePolling = <T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean = true,
): RealtimePollingState<T> => {
  const [state, setState] = useState<RealtimePollingState<T>>({
    loading: enabled,
  });

  // fetcher 通常是内联箭头函数，每次渲染都是新引用；用 ref 固定住，
  // 否则 effect 会被反复重建、定时器不断重启。
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const aliveRef = useRef(true);
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      aliveRef.current = false;
      setState({ loading: false });
      return;
    }

    aliveRef.current = true;

    const tick = async () => {
      if (inflightRef.current) {
        return;
      }
      inflightRef.current = true;

      try {
        const data = await fetcherRef.current();
        if (!aliveRef.current) return;
        setState({ data, loading: false, lastFetchedAt: Date.now() });
      } catch (error: any) {
        if (!aliveRef.current) return;
        // 保留上一次成功的 data，只更新错误信息
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? String(error),
        }));
      } finally {
        inflightRef.current = false;
      }
    };

    tick();
    const timer = setInterval(tick, intervalMs);

    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [intervalMs, enabled]);

  return state;
};

/** 机器列表默认轮询间隔：5s（列表页只需要在线/过期徽标，不必太快） */
export const MACHINE_LIST_POLL_INTERVAL = 5000;
/** GPU 详情默认轮询间隔：2s（与旧的逐卡轮询节奏保持一致） */
export const GPU_SNAPSHOT_POLL_INTERVAL = 2000;
/** 磁盘详情默认轮询间隔：5s（磁盘与内存变化慢） */
export const DISK_SNAPSHOT_POLL_INTERVAL = 5000;

/** 轮询实时机器列表 GET /web/open/realtime/machines */
export const useRealtimeMachineList = (
  intervalMs: number = MACHINE_LIST_POLL_INTERVAL,
) => usePolling(() => getRealtimeMachines(), intervalMs);

/**
 * 轮询单机 GPU 详情 GET /web/open/realtime/machines/{serverNameEng}/gpu
 *
 * 一次拿到整机所有卡（含空闲卡），替代旧的 gpu_count + 逐卡两个端点。
 * serverNameEng 为空时不发请求。
 */
export const useRealtimeGpuSnapshot = (
  serverNameEng?: string,
  intervalMs: number = GPU_SNAPSHOT_POLL_INTERVAL,
) =>
  usePolling(
    () => getRealtimeGpuSnapshot(serverNameEng as string),
    intervalMs,
    !!serverNameEng,
  );

/**
 * 轮询单机磁盘 + 内存 GET /web/open/realtime/machines/{serverNameEng}/disk
 *
 * 替代旧的 disk_usage + system_info。serverNameEng 为空时不发请求。
 */
export const useRealtimeDiskSnapshot = (
  serverNameEng?: string,
  intervalMs: number = DISK_SNAPSHOT_POLL_INTERVAL,
) =>
  usePolling(
    () => getRealtimeDiskSnapshot(serverNameEng as string),
    intervalMs,
    !!serverNameEng,
  );
