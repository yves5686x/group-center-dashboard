import VShow from '@/components/Vue/V-Show';
import { convertFromMBToGB, getMemoryString } from '@/utils/Convert/MemorySize';
import { getMachineDisplayName } from '@/utils/machinePresentation';
import { getTimeStrFromTimestamp } from '@/utils/Time/DateTimeUtils';
import { Divider } from 'antd';
import styles from './QueryTaskDetail.less';

interface Props {
  taskInfo: API.GpuTaskInfo;
}

const systemMainMemoryString = (item: API.GpuTaskInfo) => {
  const mainMemMB = item.taskMainMemory;
  if (mainMemMB === undefined) {
    return '';
  }
  if (mainMemMB === 0) {
    return '';
  }
  if (mainMemMB < 1024) {
    return `${mainMemMB}MB`;
  }
  return `${convertFromMBToGB(mainMemMB)}GB`;
};

const TextDivider: React.FC = () => {
  return (
    <>
      <Divider className={styles.divider} dashed />
    </>
  );
};

const TaskDetailContent: React.FC<Props> = (props) => {
  const { taskInfo } = props;

  let cudaVersionShort = taskInfo.cudaVersion;
  const cudaVersionShortSpilt = cudaVersionShort?.split('.');
  if (cudaVersionShortSpilt && cudaVersionShortSpilt.length > 2) {
    cudaVersionShort =
      cudaVersionShortSpilt[0] + '.' + cudaVersionShortSpilt[1];
  }

  return (
    <>
      <div>
        <VShow v-show={taskInfo.taskId}>
          <div>
            <b>任务 ID: </b>
            {taskInfo.taskId}
          </div>
        </VShow>

        <VShow v-show={taskInfo.taskPid}>
          <div>
            <b>Process ID: </b>
            {taskInfo.taskPid}
          </div>
        </VShow>

        <VShow v-show={taskInfo.taskUser}>
          <div>
            <b>用户: </b>
            {taskInfo.taskUser}
          </div>
        </VShow>

        <VShow v-show={taskInfo.screenSessionName}>
          <div>
            <b>Screen会话名称: </b>
            {taskInfo.screenSessionName}
          </div>
        </VShow>

        <div>
          <b>启动时间: </b>
          {getTimeStrFromTimestamp(taskInfo.taskStartTime * 1000)}
        </div>

        <VShow v-show={taskInfo.taskFinishTime && taskInfo.taskFinishTime > 0}>
          <div>
            <b>结束时间: </b>
            {getTimeStrFromTimestamp(taskInfo.taskFinishTime * 1000)}
          </div>
        </VShow>

        <div>
          <b>运行时长: </b>
          {taskInfo.taskRunningTimeString}
        </div>

        <TextDivider />

        <VShow v-show={taskInfo.projectName}>
          <div>
            <b>项目名称: </b>
            {taskInfo.projectName}
          </div>
        </VShow>

        <VShow v-show={taskInfo.pyFileName}>
          <div>
            <b>Python文件名: </b>
            {taskInfo.pyFileName}
          </div>
        </VShow>

        <VShow v-show={taskInfo.projectDirectory}>
          <div>
            <b>项目目录路径: </b>
            {taskInfo.projectDirectory}
          </div>
        </VShow>

        <TextDivider />

        <VShow v-show={systemMainMemoryString(taskInfo)}>
          <div>
            <b>当前进程内存: </b>
            {systemMainMemoryString(taskInfo)}
          </div>
        </VShow>

        <VShow v-show={taskInfo.taskGpuMemoryGb}>
          <div>
            <b>当前显存使用: </b>
            {getMemoryString(taskInfo.taskGpuMemoryGb)}GiB
          </div>
        </VShow>

        <VShow v-show={taskInfo.taskGpuMemoryMaxGb}>
          <div>
            <b>最大显存占用: </b>
            {getMemoryString(taskInfo.taskGpuMemoryMaxGb)}GiB
          </div>
        </VShow>

        <VShow v-show={taskInfo.gpuUsagePercent !== undefined}>
          <div>
            <b>GPU利用率: </b>
            {taskInfo.gpuUsagePercent}%
          </div>
        </VShow>

        <VShow v-show={taskInfo.gpuMemoryPercent !== undefined}>
          <div>
            <b>显存使用率: </b>
            {taskInfo.gpuMemoryPercent}%
          </div>
        </VShow>

        {/* 多卡 */}
        <VShow
          v-show={taskInfo.isMultiGpu && taskInfo.multiDeviceWorldSize > 1}
        >
          <TextDivider />

          <div>
            <b>GPU使用数量: </b>
            {taskInfo.multiDeviceWorldSize}
            <br />
            <b>多卡任务索引: </b>
            {taskInfo.multiDeviceLocalRank} ({taskInfo.multiDeviceLocalRank + 1}{' '}
            / {taskInfo.multiDeviceWorldSize})
            <br />
            <VShow v-show={taskInfo.topPythonPid > 0}>
              <div>
                <b>主进程PID: </b>
                {taskInfo.topPythonPid}
              </div>
            </VShow>
          </div>
        </VShow>

        <TextDivider />

        <VShow v-show={taskInfo.pythonVersion}>
          <div>
            <b>Python版本: </b>
            {taskInfo.pythonVersion}
          </div>
        </VShow>

        <VShow v-show={taskInfo.condaEnvName}>
          <div>
            <b>Conda虚拟环境名: </b>
            {taskInfo.condaEnvName}
          </div>
        </VShow>

        <VShow v-show={taskInfo.cudaRoot}>
          <div>
            <b>CUDA Environment Root: </b>
            {taskInfo.cudaRoot}
          </div>
        </VShow>

        <VShow v-show={taskInfo.cudaVersion}>
          <div>
            <b>CUDA Environment Version: </b>
            {taskInfo.cudaVersion}
          </div>
        </VShow>

        <TextDivider />

        <VShow v-show={taskInfo.commandLine}>
          <div>
            <b>命令行:</b>
            <br />
            {taskInfo.commandLine}
          </div>
        </VShow>

        <TextDivider />

        <div>
          <b>任务状态: </b>
          {taskInfo.taskStatus}
        </div>

        <div>
          <b>显卡型号: </b>
          {taskInfo.taskGpuName} (ID: {taskInfo.taskGpuId})
        </div>

        <div>
          <b>服务器: </b>
          {getMachineDisplayName(taskInfo)}
        </div>

        <VShow v-show={taskInfo.isDebugMode}>
          <div>
            <b>调试模式: </b>是
          </div>
        </VShow>
      </div>
    </>
  );
};

export default TaskDetailContent;
