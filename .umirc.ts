import { defineConfig } from '@umijs/max';

import childConfig from './config/config';

export default defineConfig({
  favicons: ['/favicon.ico'],
  // links: [{ rel: 'icon', href: '/assets/favicon.ico' }],
  plugins: ['@umijs/max-plugin-openapi'],
  antd: { configProvider: {} },
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'Group Center',
  },
  ...childConfig,
  npmClient: 'pnpm',
  mako: {},
  // tailwindcss: {},
  // 全局样式在 src/app.tsx 里 import './global.less'。
  // 以前这里配的是 styles: ['@/global.less']，在 mako 下有两个问题：
  //   1. '@/global.less' 别名不被解析，产物里会留下 <style>@/global.less</style>
  //      这种字面量标签；
  //   2. 改成相对路径后，产物变成 <link href="./src/global.less">，
  //      浏览器去请求 .less 源文件，请求不到。
  // 两者的样式本体其实都已被正确打进 umi.css，只是多出一个坏标签。
});
