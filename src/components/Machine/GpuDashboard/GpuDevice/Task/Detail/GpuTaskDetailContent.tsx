import VShow from '@/components/Vue/V-Show';
import { convertFromMBToGB, getMemoryString } from '@/utils/Convert/MemorySize';
import { getTimeStrFromTimestamp } from '@/utils/Time/DateTimeUtils';
import { Divider } from 'antd';
import styles from './TaskDetail.less';

interface Props {
  taskInfo: API.RealtimeGpuTask;
}

const systemMainMemoryString = (item: API.RealtimeGpuTask) => {
  const mainMemMB = item.taskMainMemoryMB;
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

const GpuTaskDetailModal: React.FC<Props> = (props) => {
  const { taskInfo } = props;

  // 聚合层暂未透出 cudaVersion 这一批环境字段，所以下面每一项都用 VShow
  // 包住再取值：字段缺失时整行不渲染，而不是渲染出「undefined」。
  // GpuTaskDetailTags 里的 CUDA 版本号同理走 shortenVersion 做空值保护
  // （原来的 cudaVersion.split('.') 在字段缺失时会把弹窗整个带崩）。

  return (
    <>
      <VShow v-show={taskInfo.id}>
        <div>
          <b>任务 ID: </b>
          {taskInfo.id}
        </div>
      </VShow>

      <div>
        <VShow v-show={taskInfo.pid}>
          <div>
            <b>Process ID: </b>
            {taskInfo.pid}
          </div>
        </VShow>

        <VShow v-show={taskInfo.name}>
          <div>
            <b>用户: </b>
            {taskInfo.name}
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
          {getTimeStrFromTimestamp(taskInfo.startTimestamp)}
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

        {/* <VShow v-show={systemMainMemoryString(taskInfo)}>
          <div>
            <b>进程树内存总量: </b>
            {systemMainMemoryString(taskInfo)}
          </div>
        </VShow> */}

        <VShow v-show={taskInfo.gpuMemoryUsage}>
          <div>
            <b>当前显存使用: </b>
            {getMemoryString(convertFromMBToGB(taskInfo.gpuMemoryUsage))}GiB
          </div>
        </VShow>
        {taskInfo.gpuMemoryUsageMax && (
          <div>
            <b>最大显存占用: </b>
            {getMemoryString(convertFromMBToGB(taskInfo.gpuMemoryUsageMax))}GiB
          </div>
        )}

        {/* 多卡 */}

        <VShow v-show={(taskInfo.worldSize ?? 0) > 1}>
          <TextDivider />

          <div>
            <b>GPU使用数量: </b>
            {taskInfo.worldSize}
            <br />
            <b>多卡任务索引: </b>
            {taskInfo.localRank} ({(taskInfo.localRank ?? 0) + 1} /{' '}
            {taskInfo.worldSize})
            <br />
            <VShow v-show={(taskInfo.topPythonPid ?? 0) > 0}>
              <div>
                <b>主进程PID: </b>
                {taskInfo.topPythonPid}
              </div>{' '}
            </VShow>
          </div>
        </VShow>

        <TextDivider />

        <VShow v-show={taskInfo.pythonBinPath}>
          <div>
            <b>Python解释器路径: </b>
            {taskInfo.pythonBinPath}
          </div>
        </VShow>

        <VShow v-show={taskInfo.pythonVersion}>
          <div>
            <b>Python版本: </b>
            {taskInfo.pythonVersion}
          </div>
        </VShow>

        <VShow v-show={taskInfo.condaEnv}>
          <div>
            <b>Conda虚拟环境名: </b>
            {taskInfo.condaEnv}
          </div>
        </VShow>

        <VShow v-show={taskInfo.driverVersion}>
          <div>
            <b>NVIDIA Driver Version: </b>
            {taskInfo.driverVersion}
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
        <VShow v-show={taskInfo.cudaVisibleDevices}>
          <div>
            <b>CUDA Visible Devices: </b>
            {taskInfo.cudaVisibleDevices}
          </div>
        </VShow>

        <VShow v-show={taskInfo.torchVersion}>
          <div>
            <b>PyTorch Version: </b>
            {taskInfo.torchVersion}
          </div>
        </VShow>

        <VShow v-show={taskInfo.torchCudaVersion}>
          <div>
            <b>PyTorch CUDA Version: </b>
            {taskInfo.torchCudaVersion}
          </div>
        </VShow>

        <TextDivider />

        <VShow v-show={taskInfo.command}>
          <div>
            <b>命令行:</b>
            <br />
            {taskInfo.command}
          </div>
        </VShow>

        <VShow
          v-show={
            taskInfo.zeroAlreadyAlertedGpuUsage ||
            taskInfo.zeroAlreadyAlertedCpuUsage
          }
        >
          <TextDivider />

          <div>
            <b>零占用率监控信息:</b>
          </div>

          <div style={{ marginLeft: '20px' }}>
            <VShow v-show={taskInfo.zeroAlreadyAlertedCpuUsage}>
              <div>
                <b>CPU空占用警告次数: </b>
                {taskInfo.zeroTotalCpuAlertCount}次
              </div>
            </VShow>

            <VShow v-show={taskInfo.zeroAlreadyAlertedGpuUsage}>
              <div>
                <b>GPU空占用警告次数: </b>
                {taskInfo.zeroTotalGpuAlertCount}次
              </div>
            </VShow>

            <div>
              <b>当前CPU使用率: </b>
              {taskInfo.cpuPercent}%
            </div>

            <div>
              <b>当前GPU利用率: </b>
              {taskInfo.gpuUtilization}%
            </div>

            <div>
              <b>最大连续零占用次数: </b>
              {taskInfo.zeroMaxConsecutiveCount}次
            </div>

            <div>
              <b>检测间隔: </b>
              {taskInfo.zeroDetectionIntervalSeconds}秒
            </div>
          </div>
        </VShow>
      </div>
    </>
  );
};

export default GpuTaskDetailModal;
