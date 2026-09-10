// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';

/**
 * @deprecated 机器列表已迁移到同源聚合层，请改用
 * `services/group_center/realtime.ts` 的 `getRealtimeMachines()`
 * （GET /web/open/realtime/machines）。
 *
 * 保留本函数仅为后端回滚时对照；前端已无任何调用。
 * 注意本文件由 `npm run openapi` 生成，重新生成会冲掉这段注释。
 */
/** Get Public Machine List for Web Frontend Retrieve list of all machines with public information for web frontend display GET /web/open/front_end/publicMachineList */
export async function getPublicMachineList(options?: { [key: string]: any }) {
  return request<API.FrontEndMachine[]>(
    '/web/open/front_end/publicMachineList',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** Get Dashboard Site Class List Retrieve list of dashboard site classes for frontend configuration GET /web/open/front_end/publicSiteClassList */
export async function getPublicSiteClassList(options?: { [key: string]: any }) {
  return request<API.DataDashBoardSiteClass[]>(
    '/web/open/front_end/publicSiteClassList',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
