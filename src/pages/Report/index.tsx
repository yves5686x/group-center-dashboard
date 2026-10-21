import { version as getGroupCenterVersion } from '@/services/group_center/programInfo';
import { cleanVersion } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Col, Row, Spin, version } from 'antd';
import { useEffect, useState } from 'react';
import { UAParser } from 'ua-parser-js';
import packageJson from '../../../package.json';
import styles from './index.less';

export default function ReportPage() {
  const uaString = navigator.userAgent;
  const [groupCenterVersion, setGroupCenterVersion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const uaParser = new UAParser(uaString);

  const uaBrowser = uaParser.getBrowser();
  const uaCpu = uaParser.getCPU();
  const uaEngine = uaParser.getEngine();
  const uaDevice = uaParser.getDevice();
  const uaOs = uaParser.getOS();
  const uaResult = uaParser.getResult();

  // 获取关键库版本信息
  const getLibraryVersions = () => {
    const dependencies = packageJson.dependencies;
    const devDependencies = packageJson.devDependencies;

    return {
      // 核心框架
      umiMax: cleanVersion(dependencies['@umijs/max']),
      react: cleanVersion(devDependencies['@types/react']),
      antd: cleanVersion(dependencies['antd']),
      antdCharts: cleanVersion(dependencies['@ant-design/charts']),
      antdProComponents: cleanVersion(
        dependencies['@ant-design/pro-components'],
      ),

      // 状态管理
      zustand: cleanVersion(dependencies['zustand']),

      // HTTP客户端
      axios: cleanVersion(dependencies['axios']),

      // 样式和UI
      // tailwindcss: cleanVersion(devDependencies['tailwindcss']),
      antdStyle: cleanVersion(dependencies['antd-style']),

      // 开发工具
      typescript: cleanVersion(devDependencies['typescript']),
      eslint: cleanVersion(devDependencies['eslint']),
      prettier: cleanVersion(devDependencies['prettier']),

      // 其他关键库
      reactMenu: cleanVersion(dependencies['@szhsin/react-menu']),
      uaParser: cleanVersion(dependencies['ua-parser-js']),
    };
  };

  const libraryVersions = getLibraryVersions();

  // 获取Node.js版本（在浏览器中无法获取，这里显示为N/A）
  const nodeVersion =
    typeof process !== 'undefined' && process.versions
      ? process.versions.node
      : 'N/A';

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setLoading(true);
        const version = await getGroupCenterVersion();
        setGroupCenterVersion(version);
        setError('');
      } catch (err) {
        console.error('Failed to fetch GroupCenter version:', err);
        setError('Failed to fetch GroupCenter version');
        setGroupCenterVersion('Unknown');
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return (
    <PageContainer ghost content="查看应用版本和浏览器环境，便于反馈问题">
      <div className={styles.reportPage}>
        <Card
          title={`浏览器环境 · antd@${version}`}
          style={{ marginBottom: '16px' }}
        >
          {error && (
            <Alert
              message="GroupCenter Version Error"
              description={error}
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Browser">
                <p>
                  <strong>Name:</strong> {uaBrowser.name}
                </p>
                <p>
                  <strong>Version:</strong> {uaBrowser.version}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Device">
                <p>
                  <strong>Vendor:</strong> {uaDevice.vendor || 'Unknown'}
                </p>
                <p>
                  <strong>Model:</strong> {uaDevice.model || 'Unknown'}
                </p>
                <p>
                  <strong>Type:</strong> {uaDevice.type || 'Unknown'}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Operating System">
                <p>
                  <strong>Name:</strong> {uaOs.name}
                </p>
                <p>
                  <strong>Version:</strong> {uaOs.version}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Engine">
                <p>
                  <strong>Name:</strong> {uaEngine.name}
                </p>
                <p>
                  <strong>Version:</strong> {uaEngine.version}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="CPU">
                <p>
                  <strong>Architecture:</strong>{' '}
                  {uaCpu.architecture || 'Unknown'}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="GroupCenter Version">
                {loading ? (
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="small" />
                  </div>
                ) : (
                  <p>
                    <strong>Version:</strong> {groupCenterVersion}
                  </p>
                )}
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="React App Version">
                <p>
                  <strong>Version:</strong> {packageJson.version}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={16} lg={12}>
              <Card size="small" title="User Agent String">
                <p
                  style={{
                    wordBreak: 'break-all',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--ant-color-bg-container)',
                    color: 'var(--ant-color-text)',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid var(--ant-color-border)',
                    margin: 0,
                  }}
                >
                  {uaString}
                </p>
              </Card>
            </Col>
          </Row>
        </Card>

        <Card title="组件版本" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            {/* 核心框架 */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Umi Max">
                <p>
                  <strong>Version:</strong> {libraryVersions.umiMax}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="React">
                <p>
                  <strong>Version:</strong> {libraryVersions.react}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Ant Design">
                <p>
                  <strong>Version:</strong> {libraryVersions.antd}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Ant Design Charts">
                <p>
                  <strong>Version:</strong> {libraryVersions.antdCharts}
                </p>
              </Card>
            </Col>

            {/* 状态管理和HTTP */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Zustand">
                <p>
                  <strong>Version:</strong> {libraryVersions.zustand}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Axios">
                <p>
                  <strong>Version:</strong> {libraryVersions.axios}
                </p>
              </Card>
            </Col>

            {/* 样式和UI */}
            {/* <Col xs={24} sm={12} md={8} lg={6}>
            <Card size="small" title="Tailwind CSS">
              <p>
                <strong>Version:</strong> {libraryVersions.tailwindcss}
              </p>
            </Card>
          </Col> */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Ant Design Style">
                <p>
                  <strong>Version:</strong> {libraryVersions.antdStyle}
                </p>
              </Card>
            </Col>

            {/* 开发工具 */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="TypeScript">
                <p>
                  <strong>Version:</strong> {libraryVersions.typescript}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="ESLint">
                <p>
                  <strong>Version:</strong> {libraryVersions.eslint}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Prettier">
                <p>
                  <strong>Version:</strong> {libraryVersions.prettier}
                </p>
              </Card>
            </Col>

            {/* 其他关键库 */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="React Menu">
                <p>
                  <strong>Version:</strong> {libraryVersions.reactMenu}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="UA Parser">
                <p>
                  <strong>Version:</strong> {libraryVersions.uaParser}
                </p>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card size="small" title="Node.js">
                <p>
                  <strong>Version:</strong> {nodeVersion}
                </p>
              </Card>
            </Col>
          </Row>
        </Card>

        <Card title="完整环境信息">
          <pre
            style={{
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '300px',
              backgroundColor: 'var(--ant-color-bg-container)',
              color: 'var(--ant-color-text)',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid var(--ant-color-border)',
              margin: 0,
            }}
          >
            {JSON.stringify(uaResult, null, 2)}
          </pre>
        </Card>
      </div>
    </PageContainer>
  );
}
