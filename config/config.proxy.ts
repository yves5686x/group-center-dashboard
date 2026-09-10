import { getEnvBool } from './utils';

const disableProxy = getEnvBool('DISABLE_PROXY');
const enableProxy = getEnvBool('ENABLE_PROXY');
const finalResult = !disableProxy && enableProxy;

console.log('DISABLE_PROXY', disableProxy);
console.log('ENABLE_PROXY', enableProxy);
console.log('[Proxy]', finalResult);

let proxyConfig = finalResult
  ? {
      proxy: {
        '/api': {
          target: process.env.GROUP_CENTER_URL + '/api/',
          changeOrigin: true,
          pathRewrite: { '^/api': '' },
        },
        '/web': {
          target: process.env.GROUP_CENTER_URL + '/web/',
          changeOrigin: true,
          pathRewrite: { '^/web': '' },
        },
        // '/gpu' 代理规则已删除：它原本服务于「前端直连 agent」的旧架构
        // （machineUrl 形如 /gpu/3090）。实时数据改走同源聚合层后前端不再直连
        // agent，这条规则既无用又有害 —— 它会匹配所有 /gpu* 前缀路径，把前端
        // 路由 /gpu-dashboard 也拐到后端，导致页面 404。
      },
    }
  : {};

export default proxyConfig;
