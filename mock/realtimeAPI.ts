import {
  generateRealtimeDiskSnapshot,
  generateRealtimeGpuSnapshot,
  generateRealtimeMachines,
  wrapEnvelope,
} from './FakeData/realtimeFakeData';

/**
 * 实时数据同源聚合层 mock。
 *
 * 覆盖 `/web/open/realtime/**` 三个端点。注意 umi 的 mock 中间件优先级高于
 * proxy，所以 `npm run dev` 下这三个路径一定命中这里；要连真实后端请用
 * `npm run dev:proxy`（MOCK=none + ENABLE_PROXY=true）。
 */
export default {
  'GET /web/open/realtime/machines': (req: any, res: any) => {
    res.json(wrapEnvelope(generateRealtimeMachines()));
  },

  'GET /web/open/realtime/machines/:serverNameEng/gpu': (
    req: any,
    res: any,
  ) => {
    res.json(generateRealtimeGpuSnapshot(req.params.serverNameEng));
  },

  'GET /web/open/realtime/machines/:serverNameEng/disk': (
    req: any,
    res: any,
  ) => {
    res.json(generateRealtimeDiskSnapshot(req.params.serverNameEng));
  },
};
