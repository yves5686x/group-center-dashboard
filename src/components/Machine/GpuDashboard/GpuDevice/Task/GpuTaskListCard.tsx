import VShow from '@/components/Vue/V-Show';
import React from 'react';
import { useFilter } from './Filter';
import GpuTaskCardItem from './GpuTaskCardItem';
import styles from './GpuTaskListCard.less';

interface Props {
  /**
   * 本卡上的任务，由上层的单机快照统一下发。
   *
   * 旧实现在这里各自轮询 `gpu_task_info?gpuIndex=N`，8 卡机器就是 8 个独立
   * 定时器直打 agent；聚合层已经一次返回整机所有卡的任务，所以这里不再取数。
   */
  tasks?: API.RealtimeGpuTask[];
}

const GpuTaskListCard: React.FC<Props> = (props) => {
  const { tasks } = props;

  const { checkFilter } = useFilter();

  // 在父组件中进行过滤检查，避免子组件中的 hooks 调用不一致
  const filteredTaskList = (tasks ?? []).filter((taskInfo) =>
    checkFilter(taskInfo),
  );

  return (
    <div>
      <VShow v-show={filteredTaskList.length > 0}>
        {filteredTaskList.map((taskInfo, i) => (
          <div className={styles.gpuTaskItemDiv} key={taskInfo.pid ?? i}>
            <GpuTaskCardItem
              index={i}
              taskInfo={taskInfo}
              shouldRender={true}
            />
          </div>
        ))}
      </VShow>
    </div>
  );
};

export default GpuTaskListCard;
