import VShow from '@/components/Vue/V-Show';
import { shortenVersion } from '@/utils/format';
import {
  ForkOutlined,
  FundProjectionScreenOutlined,
  PythonOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';
import styles from './TaskDetail.less';

interface Props {
  taskInfo: API.RealtimeGpuTask;
}

const GpuTaskDetailTags: React.FC<Props> = (props) => {
  const { taskInfo } = props;

  // 同 GpuTaskDetailContent：cudaVersion 是可选字段，不能直接 split。
  const cudaVersionShort = shortenVersion(taskInfo.cudaVersion);

  return (
    <>
      <div className={styles.divTags}>
        <VShow v-show={taskInfo.name}>
          <Tag className={styles.tag} icon={<UserOutlined />} color="default">
            {taskInfo.name}
          </Tag>
        </VShow>

        <VShow v-show={taskInfo.cudaVersion}>
          <Tag
            className={styles.tag}
            icon={<VideoCameraOutlined />}
            color="default"
          >
            CUDA {cudaVersionShort}
          </Tag>
        </VShow>

        <VShow v-show={taskInfo.pythonVersion}>
          <Tag className={styles.tag} icon={<PythonOutlined />} color="default">
            Python {taskInfo.pythonVersion}
          </Tag>
        </VShow>

        <VShow v-show={taskInfo.screenSessionName}>
          <Tag
            className={styles.tag}
            icon={<FundProjectionScreenOutlined />}
            color="default"
          >
            {taskInfo.screenSessionName}
          </Tag>
        </VShow>

        <VShow v-show={taskInfo.multiprocessingSpawn}>
          <Tag className={styles.tag} icon={<ForkOutlined />} color="default">
            <b>Multi-Process Spawn</b>
          </Tag>
        </VShow>
      </div>
    </>
  );
};

export default GpuTaskDetailTags;
