import { SubscriptionManagementPanel } from '@/components/ProjectSubscription';
import { PageContainer } from '@ant-design/pro-components';
import styles from './index.less';

const AdvancedManagement: React.FC = () => (
  <PageContainer ghost content="查看和管理用户的项目订阅">
    <div className={styles.container}>
      <SubscriptionManagementPanel />
    </div>
  </PageContainer>
);

export default AdvancedManagement;
