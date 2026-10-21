import Guide from '@/components/Guide';
import { MachineStatusMonitor, ProxyMonitor } from '@/components/HomeMonitor';
import HomePageSiteWidget from '@/components/SiteList/HomePageSiteWidget/HomePageSiteWidget';
import { trim } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Card, Col, Row } from 'antd';
import Clock from 'react-live-clock';
import styles from './index.less';

const HomePage: React.FC = () => {
  const { name } = useModel('global');
  return (
    <PageContainer ghost>
      <div className={styles.container}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card className={styles.welcomeCard} bordered={false}>
              <div className={styles.welcomeContent}>
                <div className={styles.helloDiv}>
                  <Guide name={trim(name)} />
                </div>
                <div className={styles.clockDiv}>
                  <Clock
                    format="YYYY年MM月DD日 HH:mm:ss"
                    interval={1000}
                    ticking={true}
                  />
                </div>
              </div>
            </Card>
          </Col>

          {/* 预设网页 */}
          <Col span={24}>
            <div className={styles.containerSiteList}>
              <HomePageSiteWidget />
            </div>
          </Col>

          {/* 监视面板 */}
          <Col span={24}>
            <Row gutter={[16, 16]} className={styles.monitorContainer}>
              <Col xs={24} lg={12}>
                <div className={styles.monitorPanel}>
                  <MachineStatusMonitor refreshInterval={30000} />
                </div>
              </Col>
              <Col xs={24} lg={12}>
                <div className={styles.monitorPanel}>
                  <ProxyMonitor refreshInterval={30000} />
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;
