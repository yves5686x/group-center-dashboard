const isDev = process.env.NODE_ENV === 'development';

const prodRoutes = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    name: '首页',
    path: '/home',
    component: './Home',
    icon: 'HomeOutlined',
  },
  {
    name: 'GPU看板',
    path: '/gpu-dashboard',
    component: './GpuDashboard',
    icon: 'PythonOutlined',
  },
  {
    name: '硬盘看板',
    path: '/disk-dashboard',
    component: './DiskDashboard',
    icon: 'DatabaseOutlined',
  },
  {
    name: '任务查询',
    path: '/task-query',
    component: './TaskQuery',
    icon: 'SearchOutlined',
  },
  {
    name: '统计信息',
    path: '/statistics',
    component: './Statistics',
    icon: 'BarChartOutlined',
  },
  {
    name: '高级管理',
    path: '/advanced-management',
    component: './AdvancedManagement',
    icon: 'SettingOutlined',
  },
  {
    name: '反馈报告',
    path: '/report',
    component: './Report',
    icon: 'DatabaseOutlined',
  },
];

const devRoutes = isDev
  ? [
      {
        name: 'Dark',
        path: '/dark',
        component: './DarkPage',
      },
      {
        name: '权限演示',
        path: '/access',
        component: './Access',
      },
      {
        name: 'CRUD 示例',
        path: '/table',
        component: './Table',
      },
      {
        name: 'Dev Settings',
        path: '/dev_settings',
        component: './DevSettings',
      },
    ]
  : [];

let routesConfig = {
  routes: [...prodRoutes, ...devRoutes],
};

export default routesConfig;
