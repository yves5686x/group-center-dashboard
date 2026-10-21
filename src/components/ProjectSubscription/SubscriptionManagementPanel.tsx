import TaskDetailModal, {
  TaskDetailModalHandles,
} from '@/pages/TaskQuery/components/TaskDetailModal';
import { getTaskByTaskId } from '@/services/group_center/gpuTaskQuery';
import {
  getUserList,
  getUserSubscriptions,
  unsubscribeProject,
} from '@/services/group_center/publicApi';
import {
  getSubscriptionSelectedUser,
  setSubscriptionSelectedUser,
} from '@/utils/storage';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  List,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Text, Title } = Typography;

interface UserInfo {
  name: string;
  nameEng: string;
}

interface SubscriptionInfo {
  userName: string;
  subscriptions: string[];
  count: number;
}

interface TaskDetailInfo {
  taskId: string;
  taskInfo?: API.GpuTaskInfo;
  loading: boolean;
}

const SubscriptionManagementPanel: React.FC = () => {
  const [userList, setUserList] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [taskDetails, setTaskDetails] = useState<
    Record<string, TaskDetailInfo>
  >({});
  const [messageApi, contextHolder] = message.useMessage();
  const taskDetailModalRef = React.useRef<TaskDetailModalHandles>(null);

  // 获取用户列表并尝试恢复上次选择的用户
  useEffect(() => {
    getUserList()
      .then((response) => {
        if (
          (response.isSucceed ?? (response as any).succeed) &&
          Array.isArray(response.result)
        ) {
          setUserList(response.result);

          // 尝试恢复上次选择的用户
          const savedUser = getSubscriptionSelectedUser();
          if (savedUser) {
            // 检查保存的用户是否在用户列表中
            const userExists = response.result.some(
              (user) => user.name === savedUser,
            );
            if (userExists) {
              setSelectedUser(savedUser);
              fetchUserSubscriptions(savedUser);
            }
          }
        } else {
          console.error('Failed to get user list:', response);
          messageApi.error('获取用户列表失败');
        }
      })
      .catch((error) => {
        console.error('Error fetching user list:', error);
        messageApi.error('获取用户列表时发生错误');
      });
  }, [messageApi]);

  // 获取用户订阅列表
  const fetchUserSubscriptions = async (userName: string) => {
    if (!userName) return;

    setLoading(true);
    try {
      const response = await getUserSubscriptions({ userName });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        const subscriptionData = response.result as SubscriptionInfo;
        setSubscriptions(subscriptionData);
      } else {
        const errorMessage =
          typeof response.result === 'string'
            ? response.result
            : '获取订阅列表失败';
        messageApi.error(errorMessage);
        setSubscriptions(null);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      messageApi.error('获取订阅列表时发生错误');
      setSubscriptions(null);
    } finally {
      setLoading(false);
    }
  };

  // 处理用户选择变化
  const handleUserChange = (value: string) => {
    setSelectedUser(value);
    // 保存选择的用户到本地存储
    setSubscriptionSelectedUser(value);
    fetchUserSubscriptions(value);
  };

  // 获取任务详情
  const fetchTaskDetail = async (taskId: string) => {
    if (taskDetails[taskId]?.taskInfo) {
      // 如果已经有缓存的任务信息，直接显示
      taskDetailModalRef.current?.tryToShowModal();
      return;
    }

    // 设置加载状态
    setTaskDetails((prev) => ({
      ...prev,
      [taskId]: { taskId, loading: true },
    }));

    try {
      const response = await getTaskByTaskId({ taskId });

      if (
        (response.isSucceed ?? (response as any).succeed) &&
        response.result
      ) {
        const taskInfo = response.result as API.GpuTaskInfo;
        setTaskDetails((prev) => ({
          ...prev,
          [taskId]: { taskId, taskInfo, loading: false },
        }));
        // 显示详情弹窗
        taskDetailModalRef.current?.tryToShowModal();
      } else {
        messageApi.error('获取任务详情失败');
        setTaskDetails((prev) => ({
          ...prev,
          [taskId]: { taskId, loading: false },
        }));
      }
    } catch (error) {
      console.error('Error fetching task detail:', error);
      messageApi.error('获取任务详情时发生错误');
      setTaskDetails((prev) => ({
        ...prev,
        [taskId]: { taskId, loading: false },
      }));
    }
  };

  // 处理查看任务详情
  const handleViewTaskDetail = (taskId: string) => {
    fetchTaskDetail(taskId);
  };

  // 处理取消订阅
  const handleUnsubscribe = async (projectId: string) => {
    if (!selectedUser) return;

    try {
      const response = await unsubscribeProject({
        projectId: parseInt(projectId),
        userName: selectedUser,
      });

      if (response.isSucceed ?? (response as any).succeed) {
        messageApi.success('取消订阅成功');
        // 重新获取订阅列表
        fetchUserSubscriptions(selectedUser);
      } else {
        const errorMessage = response.result?.message || '取消订阅失败';
        messageApi.error(errorMessage);
      }
    } catch (error) {
      console.error('Error unsubscribing project:', error);
      messageApi.error('取消订阅时发生错误');
    }
  };

  return (
    <>
      {contextHolder}
      <Card
        title="订阅管理"
        style={{
          marginBottom: 16,
          width: '100%',
          maxWidth: '100%',
        }}
        extra={<Text type="secondary">查看和管理用户的项目订阅</Text>}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              选择用户:
            </Text>
            <Select
              style={{
                width: '100%',
                marginTop: 12,
                maxWidth: '400px',
              }}
              size="middle"
              placeholder="请选择用户"
              value={selectedUser || undefined}
              onChange={handleUserChange}
              options={userList.map((user) => ({
                label: `${user.name} (${user.nameEng})`,
                value: user.name,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            />
          </div>

          {selectedUser && subscriptions && (
            <div style={{ width: '100%' }}>
              <Title level={4} style={{ marginBottom: 16 }}>
                用户 {selectedUser} 的订阅项目 ({subscriptions.count} 个)
              </Title>

              {subscriptions.count > 0 ? (
                <List
                  loading={loading}
                  dataSource={subscriptions.subscriptions}
                  style={{ width: '100%' }}
                  renderItem={(projectId) => {
                    const taskDetail = taskDetails[projectId];
                    const isLoading = taskDetail?.loading || false;

                    return (
                      <List.Item
                        style={{
                          padding: '16px 0',
                          borderBottom:
                            '1px solid var(--ant-color-border-secondary)',
                        }}
                        actions={[
                          <Button
                            key="view"
                            type="link"
                            icon={<EyeOutlined />}
                            size="middle"
                            loading={isLoading}
                            onClick={() => handleViewTaskDetail(projectId)}
                          >
                            查看详情
                          </Button>,
                          <Popconfirm
                            key="unsubscribe"
                            title="确认取消订阅"
                            description={`确定要取消订阅项目 ${projectId} 吗？`}
                            onConfirm={() => handleUnsubscribe(projectId)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              size="middle"
                            >
                              取消订阅
                            </Button>
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Text strong style={{ fontSize: '16px' }}>
                              项目 ID: {projectId}
                            </Text>
                          }
                          description={`用户: ${subscriptions.userName}`}
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Empty
                  description="该用户暂无订阅项目"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              )}
            </div>
          )}

          {selectedUser && !subscriptions && !loading && (
            <Empty
              description="暂无订阅数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Space>
      </Card>

      {/* 任务详情弹窗 */}
      {subscriptions?.subscriptions.map((taskId) => {
        const taskDetail = taskDetails[taskId];
        if (taskDetail?.taskInfo) {
          return (
            <TaskDetailModal
              key={taskId}
              ref={taskDetailModalRef}
              taskInfo={taskDetail.taskInfo}
            />
          );
        }
        return null;
      })}
    </>
  );
};

export default SubscriptionManagementPanel;
