import Tag from '@/components/UI/ReadableTag';
import { LinkOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Avatar, Button, Card, Popover, QRCode } from 'antd';
import React from 'react';

import VShow from '@/components/Vue/V-Show';
import { openUrlInNewWindow } from '@/utils/WebBrowser/NewPage';
import styles from './HomeSiteItemWidget.less';

interface Props {
  siteObject: API.DataDashBoardSite;
}

const HomeSiteItemWidget: React.FC<Props> = (props) => {
  const { siteObject } = props;

  const onCardClick = () => {
    openUrlInNewWindow(siteObject.url);
  };

  const QrCodeContent = () => (
    <div style={{ textAlign: 'center' }}>
      <QRCode
        errorLevel="H"
        value={siteObject.url}
        icon={siteObject.iconUrl}
        bordered={false}
        size={200}
      />
      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--ant-color-text-secondary)',
        }}
      >
        扫描二维码访问
      </div>
    </div>
  );

  // 提取域名用于显示标签
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <Card className={styles.card} onClick={onCardClick}>
      <div className={styles.containerDiv}>
        {/* Icon */}
        <div className={styles.iconContainer}>
          <Avatar
            className={styles.avatar}
            size={40}
            src={siteObject.iconUrl}
          />
          <div className={styles.iconOverlay}>
            <LinkOutlined />
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.siteName}>{siteObject.name}</div>
          <Tag className={styles.domainTag} color="blue">
            {getDomain(siteObject.url)}
          </Tag>
        </div>

        {/* QRCode */}
        <VShow v-show={siteObject.supportQrCode}>
          <Popover className={styles.popover} content={<QrCodeContent />}>
            <Button
              className={styles.qrButton}
              type="text"
              icon={<QrcodeOutlined />}
              size="small"
            />
          </Popover>
        </VShow>
      </div>
    </Card>
  );
};

export default HomeSiteItemWidget;
