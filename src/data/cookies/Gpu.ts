import '@/services/group_center/realtimeTypings.d';
import { getCookie, setCookie } from 'typescript-cookie';

// https://www.npmjs.com/package/typescript-cookie

const COOKIE_KEY = 'latestGpuDashboardGpu';

/**
 * 这里存的是机器标识（serverNameEng）而不是整个机器对象。
 *
 * 旧实现把 `API.FrontEndMachine` 整个序列化进 cookie，于是 agentOnline、
 * snapshotTime 这类**每次轮询都在变**的字段被冻在了写入那一刻，读回来时
 * 已经和实时状态对不上；而且机器一旦改名，存下来的对象就再也匹配不上。
 * 聚合层用 serverNameEng 作为路径参数，它才是稳定的身份键。
 */
const getLatestRunGpuStr = async () => {
  return getCookie(COOKIE_KEY);
};

const setLatestRunGpuStr = async (content: string) => {
  return setCookie(COOKIE_KEY, content);
};

/**
 * 读回标识列表。
 *
 * 兼容旧格式：历史上这个 cookie 里存的是机器对象数组，升级后第一次读到的
 * 仍然是旧值。这里把对象里的 machineName / serverNameEng 取出来，让老用户
 * 不至于因为格式变更而丢掉自己上次的选择。
 */
export const getLatestRunGpu = async (): Promise<string[]> => {
  const jsonString = await getLatestRunGpuStr();
  if (!jsonString || jsonString.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        // 旧格式：整个机器对象
        return item?.serverNameEng ?? item?.machineName ?? '';
      })
      .filter((name): name is string => typeof name === 'string' && !!name);
  } catch {
    return [];
  }
};

export const setLatestRunGpu = async (serverNameEngList: string[]) => {
  const jsonString = JSON.stringify(serverNameEngList);

  return await setLatestRunGpuStr(jsonString);
};

export default {
  getLatestRunGpu,
  setLatestRunGpu,
};
