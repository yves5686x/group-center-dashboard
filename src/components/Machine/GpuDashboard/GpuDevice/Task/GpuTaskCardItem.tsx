import { ProjectSubscriptionModal } from '@/components/ProjectSubscription';
import RunTimeComponent from '@/components/Time/RunTimeComponent';
import VShow from '@/components/Vue/V-Show';
import { useGpuTaskFilterProjectNameStore } from '@/data/store/modules/filter/GpuTaskFilterProjectName';
import { useGpuTaskFilterUserNameStore } from '@/data/store/modules/filter/GpuTaskFilterUserName';
import { convertFromMBToGB, getMemoryString } from '@/utils/Convert/MemorySize';
import {
  BugOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  DownOutlined,
  FilterOutlined,
  ForkOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import {
  Card,
  Divider,
  Dropdown,
  MenuProps,
  message,
  Popconfirm,
  Popover,
  Space,
  Tag,
} from 'antd';
import React, { useRef, useState } from 'react';
import GpuTaskDetailModal, {
  GpuTaskDetailModalHandles,
} from './Detail/GpuTaskDetailModal';

import DisableSelectDiv from '@/components/Public/Layout/DisableSelectDiv';
import { GetIsDarkMode } from '@/utils/AntD5/AntD5DarkMode';
import { copyToClipboardPromise } from '@/utils/System/Clipboard';
import { getTimeStrFromTimestamp } from '@/utils/Time/DateTimeUtils';
import {
  ControlledMenu as ContextMenu,
  MenuDivider as ContextMenuDivider,
  MenuItem as ContextMenuItem,
} from '@szhsin/react-menu';
import '@szhsin/react-menu/dist/index.css';
import '@szhsin/react-menu/dist/theme-dark.css';
import '@szhsin/react-menu/dist/transitions/zoom.css';
import MultiGpuTag from './Component/MultiGpuTag';
import styles from './GpuTaskCardItem.less';

interface Props {
  index: number;
  taskInfo: API.RealtimeGpuTask;
  shouldRender: boolean;
}

const GpuTaskCardItem: React.FC<Props> = (props) => {
  const { index, taskInfo, shouldRender } = props;

  const [openStartTimePopConfirm, setOpenStartTimePopConfirm] = useState(false);
  const [openUserFilterPopConfirm, setOpenUserFilterPopConfirm] =
    useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const modalFunctionRef = useRef<GpuTaskDetailModalHandles>(null);

  // 如果不需要渲染，直接返回 null（在调用任何 hooks 之前）
  if (!shouldRender) {
    return null;
  }

  const onClickShowDetail = () => {
    modalFunctionRef.current?.tryToShowModal();
  };

  const screenSessionString = taskInfo.screenSessionName
    ? `(${taskInfo.screenSessionName})`
    : '';
  const cardTitle =
    `[${index + 1}] ` +
    screenSessionString +
    `${taskInfo.projectName}-${taskInfo.pyFileName}`;

  const currentGpuMemoryString = getMemoryString(
    convertFromMBToGB(taskInfo.gpuMemoryUsage),
  );
  const maxGpuMemoryString = getMemoryString(
    convertFromMBToGB(taskInfo.gpuMemoryUsageMax),
  );
  const popoverContentGpuMemory = (
    <div style={{ textAlign: 'center' }}>
      <p>{`当前显存占用: ${currentGpuMemoryString} GiB`}</p>
      <p>{`最大显存占用: ${maxGpuMemoryString} GiB`}</p>
    </div>
  );

  const startTimeString = getTimeStrFromTimestamp(taskInfo.startTimestamp);
  const handleCopyStartTimeString = () => {
    const text = startTimeString.trim();
    if (text.length === 0) {
      messageApi.open({
        type: 'error',
        content: '复制失败！',
      });
      return;
    }

    // 复制字符串到剪贴板
    copyToClipboardPromise(text)
      .then(() => {
        messageApi.open({
          type: 'success',
          content: '复制成功！',
        });
      })
      .catch(() => {
        messageApi.open({
          type: 'error',
          content: '复制失败！',
        });
      });

    // 关闭Tip
    setOpenStartTimePopConfirm(false);
  };

  const setUserFilterPopConfirmText = `您是否需要将用户名过滤器设置为:${taskInfo.name}`;

  // 在组件顶层获取store函数
  const setUserNameFilter = useGpuTaskFilterUserNameStore(
    (state) => state.setUserNameEng,
  );
  const setProjectNameFilter = useGpuTaskFilterProjectNameStore(
    (state) => state.setProjectName,
  );

  const handleSetUserFilter = () => {
    setUserNameFilter(taskInfo.name);

    setOpenUserFilterPopConfirm(false);

    messageApi.open({
      type: 'success',
      content: '设置完毕！',
    });
  };

  const handleSetProjectFilter = () => {
    setProjectNameFilter(taskInfo.projectName);

    messageApi.open({
      type: 'success',
      content: '项目名过滤器设置完毕！',
    });
  };

  // 跳转到任务查询页面（按用户）
  const handleNavigateToTaskQueryByUser = () => {
    const params = new URLSearchParams({
      userName: taskInfo.name,
      page: '1',
      pageSize: '20',
      sortBy: 'TASK_START_TIME',
      sortOrder: 'DESC',
    });

    history.push(`/task-query?${params.toString()}`);
  };

  // 跳转到任务查询页面（按项目）
  const handleNavigateToTaskQueryByProject = () => {
    const params = new URLSearchParams({
      projectName: taskInfo.projectName,
      page: '1',
      pageSize: '20',
      sortBy: 'TASK_START_TIME',
      sortOrder: 'DESC',
    });

    history.push(`/task-query?${params.toString()}`);
  };

  // id 是聚合层尚未透出的可选字段，缺失时不能传 0 给订阅接口 ——
  // 0 是个合法数字，后端可能据此订阅到错误的项目。缺 id 就直接禁用入口。
  const projectId = taskInfo.id;
  const canSubscribeProject =
    typeof projectId === 'number' &&
    Number.isFinite(projectId) &&
    projectId > 0;

  // 处理订阅项目
  const handleSubscribeProject = () => {
    if (!canSubscribeProject) {
      return;
    }

    setSubscriptionModalVisible(true);
  };

  // 处理订阅成功
  const handleSubscriptionSuccess = () => {
    messageApi.success('订阅操作成功');
  };

  const moreMenuItems: MenuProps['items'] = [
    {
      key: '1',
      label: '详细信息',
      icon: <InfoCircleOutlined />,
      onClick: onClickShowDetail,
    },
    {
      type: 'divider',
    },
    {
      key: '2',
      label: `设置"${taskInfo.name}"为过滤用户`,
      icon: <FilterOutlined />,
      onClick: handleSetUserFilter,
    },
    {
      key: '3',
      label: `设置"${taskInfo.projectName}"为项目名过滤器`,
      icon: <FilterOutlined />,
      onClick: handleSetProjectFilter,
    },
    {
      type: 'divider',
    },
    {
      key: '4',
      label: `跳转到任务查询（按用户"${taskInfo.name}"）`,
      icon: <SearchOutlined />,
      onClick: handleNavigateToTaskQueryByUser,
    },
    {
      key: '5',
      label: `跳转到任务查询（按项目"${taskInfo.projectName}"）`,
      icon: <SearchOutlined />,
      onClick: handleNavigateToTaskQueryByProject,
    },
    {
      type: 'divider',
    },
    {
      key: '6',
      label: canSubscribeProject
        ? `订阅项目"${taskInfo.projectName}"`
        : '订阅项目（聚合层未提供任务 ID，暂不可用）',
      icon: <PlusOutlined />,
      onClick: handleSubscribeProject,
      disabled: !canSubscribeProject,
    },
  ];
  const MoreMenu = () => (
    <>
      <Dropdown menu={{ items: moreMenuItems }}>
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            <DownOutlined />
          </Space>
        </a>
      </Dropdown>
    </>
  );

  const [isContextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuAnchorPoint, setContextMenuAnchorPoint] = useState({
    x: 0,
    y: 0,
  });

  const isDark = GetIsDarkMode();

  // 判断是否为僵尸进程
  // 两个 zero* 字段是聚合层尚未透出的可选字段，缺失时不能当作已告警。
  const isZombieProcess =
    taskInfo.zeroAlreadyAlertedGpuUsage === true &&
    taskInfo.zeroAlreadyAlertedCpuUsage === true;

  return (
    <div>
      {contextHolder}
      <ContextMenu
        anchorPoint={contextMenuAnchorPoint}
        state={isContextMenuOpen ? 'open' : 'closed'}
        menuStyle={{
          zIndex: 1000,
        }}
        theming={isDark ? 'dark' : undefined}
        direction="right"
        onClose={() => setContextMenuOpen(false)}
      >
        <ContextMenuItem disabled>{taskInfo.projectName}</ContextMenuItem>
        <ContextMenuDivider />
        <ContextMenuItem onClick={onClickShowDetail}>
          <InfoCircleOutlined style={{ marginRight: '8px' }} />
          详细信息
        </ContextMenuItem>
        <ContextMenuDivider />
        <ContextMenuItem onClick={handleSetUserFilter}>
          <FilterOutlined style={{ marginRight: '8px' }} />
          设置"{taskInfo.name}"为过滤用户
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSetProjectFilter}>
          <FilterOutlined style={{ marginRight: '8px' }} />
          设置"{taskInfo.projectName}"为项目名过滤器
        </ContextMenuItem>
        <ContextMenuDivider />
        <ContextMenuItem onClick={handleNavigateToTaskQueryByUser}>
          <SearchOutlined style={{ marginRight: '8px' }} />
          跳转到任务查询（按用户"{taskInfo.name}"）
        </ContextMenuItem>
        <ContextMenuItem onClick={handleNavigateToTaskQueryByProject}>
          <SearchOutlined style={{ marginRight: '8px' }} />
          跳转到任务查询（按项目"{taskInfo.projectName}"）
        </ContextMenuItem>
        <ContextMenuDivider />
        <ContextMenuItem
          onClick={handleSubscribeProject}
          disabled={!canSubscribeProject}
        >
          <PlusOutlined style={{ marginRight: '8px' }} />
          {canSubscribeProject
            ? `订阅项目"${taskInfo.projectName}"`
            : '订阅项目（缺任务 ID，暂不可用）'}
        </ContextMenuItem>
      </ContextMenu>

      {/* Gpu Task Detail Modal */}
      <GpuTaskDetailModal taskInfo={taskInfo} ref={modalFunctionRef} />

      {/* Project Subscription Modal */}
      <ProjectSubscriptionModal
        visible={subscriptionModalVisible && canSubscribeProject}
        onCancel={() => setSubscriptionModalVisible(false)}
        onSuccess={handleSubscriptionSuccess}
        projectId={projectId ?? 0}
        projectName={taskInfo.projectName}
      />

      <Space direction="vertical" size={16}>
        <DisableSelectDiv>
          <Card
            className={styles.taskItemCard}
            size="small"
            title={cardTitle}
            extra={<MoreMenu />}
            styles={{
              header: {
                color: isZombieProcess ? '#ff4d4f' : undefined,
              },
              body: {
                color: isZombieProcess ? '#ff4d4f' : undefined,
              },
            }}
            onContextMenu={(e) => {
              if (
                typeof document.hasFocus === 'function' &&
                !document.hasFocus()
              )
                return;

              e.preventDefault();
              setContextMenuAnchorPoint({ x: e.clientX, y: e.clientY });
              setContextMenuOpen(true);
            }}
          >
            <div style={{ color: isZombieProcess ? '#ff4d4f' : undefined }}>
              <div
                style={{
                  display: 'flex',
                  width: '100%', // 确保填充满父级容器
                  alignItems: 'center', // 确保所有子元素垂直居中
                }}
              >
                {/* 左侧容器 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center', // 水平居中
                    alignItems: 'center', // 垂直居中
                    flexDirection: 'column',
                    flex: 1, // 平分剩余空间
                  }}
                >
                  <Popconfirm
                    placement="bottom"
                    title="用户名过滤器"
                    description={setUserFilterPopConfirmText}
                    okText="好的!"
                    cancelText="什么都不做"
                    icon={<QuestionCircleOutlined style={{ color: 'gray' }} />}
                    open={openUserFilterPopConfirm}
                    onConfirm={handleSetUserFilter}
                    onCancel={() => {
                      setOpenUserFilterPopConfirm(false);
                    }}
                  >
                    <div
                      onClick={() => {
                        setOpenUserFilterPopConfirm(true);
                      }}
                    >
                      <div>{taskInfo.name}</div>
                    </div>
                  </Popconfirm>
                </div>

                {/* 中间的垂直分割线 */}
                <Divider
                  type="vertical"
                  style={{
                    margin: '0 0px', // 分割线两侧的间隔
                  }}
                />

                {/* 右侧容器 */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center', // 水平居中
                    alignItems: 'center', // 垂直居中
                    flexDirection: 'column',
                    flex: 1, // 平分剩余空间
                  }}
                >
                  <Popconfirm
                    placement="bottom"
                    title="启动时间"
                    description={startTimeString}
                    okText="复制"
                    cancelText="我知道了"
                    icon={<QuestionCircleOutlined style={{ color: 'gray' }} />}
                    open={openStartTimePopConfirm}
                    onConfirm={handleCopyStartTimeString}
                    onCancel={() => {
                      setOpenStartTimePopConfirm(false);
                    }}
                  >
                    <div
                      onClick={() => {
                        setOpenStartTimePopConfirm(true);
                      }}
                    >
                      <RunTimeComponent startTime={taskInfo.startTimestamp} />
                    </div>
                  </Popconfirm>
                </div>
              </div>

              <div className={styles.divTags}>
                <Popover
                  placement="bottom"
                  title="显存使用情况"
                  content={popoverContentGpuMemory}
                >
                  <Tag
                    icon={<DatabaseOutlined />}
                    color="default"
                    style={{ color: isZombieProcess ? '#ff4d4f' : undefined }}
                  >
                    {currentGpuMemoryString}GB
                  </Tag>
                </Popover>

                <VShow v-show={taskInfo.debugMode === true}>
                  <Popover
                    placement="bottom"
                    title="调试模式"
                    content="当前代码正在被调试器调试"
                  >
                    <Tag icon={<BugOutlined />} color="processing">
                      调试
                    </Tag>
                  </Popover>
                </VShow>

                <VShow v-show={taskInfo.multiprocessingSpawn === true}>
                  <Popover
                    placement="bottom"
                    title="Multi-Process Spawn"
                    content="这是一个multiprocessing.spawn进程，不是标准的DDP多卡任务。"
                  >
                    <Tag
                      icon={<ForkOutlined />}
                      color="default"
                      style={{ color: isZombieProcess ? '#ff4d4f' : undefined }}
                    >
                      Spawn
                    </Tag>
                  </Popover>
                </VShow>

                <VShow
                  v-show={
                    taskInfo.zeroAlreadyAlertedGpuUsage === true &&
                    taskInfo.zeroAlreadyAlertedCpuUsage === true
                  }
                >
                  <Popover
                    placement="bottom"
                    title="[错误] 僵尸进程"
                    content="GPU和CPU使用率均连续为零，疑似僵尸进程，请及时杀死！"
                  >
                    <Tag icon={<CloseCircleOutlined />} color="error">
                      僵尸进程!
                    </Tag>
                  </Popover>
                </VShow>

                <VShow
                  v-show={
                    taskInfo.zeroAlreadyAlertedCpuUsage === true &&
                    taskInfo.zeroAlreadyAlertedGpuUsage !== true
                  }
                >
                  <Popover
                    placement="bottom"
                    title="[警告] CPU 空占用"
                    content="CPU使用率连续为零，已触发警告！"
                  >
                    <Tag icon={<WarningOutlined />} color="warning">
                      CPU 空占用
                    </Tag>
                  </Popover>
                </VShow>

                <VShow
                  v-show={
                    taskInfo.zeroAlreadyAlertedGpuUsage === true &&
                    taskInfo.zeroAlreadyAlertedCpuUsage !== true
                  }
                >
                  <Popover
                    placement="bottom"
                    title="[警告] GPU 空占用"
                    content="GPU使用率连续为零，已触发警告！"
                  >
                    <Tag icon={<WarningOutlined />} color="warning">
                      GPU 空占用
                    </Tag>
                  </Popover>
                </VShow>

                <MultiGpuTag taskInfo={taskInfo} />

                <VShow v-show={(taskInfo.userEnvEpoch?.length ?? 0) > 0}>
                  <Tag icon={<ClockCircleOutlined />} color="processing">
                    {taskInfo.userEnvEpoch}
                  </Tag>
                </VShow>
              </div>
            </div>
          </Card>
        </DisableSelectDiv>
      </Space>
    </div>
  );
};

export default GpuTaskCardItem;
