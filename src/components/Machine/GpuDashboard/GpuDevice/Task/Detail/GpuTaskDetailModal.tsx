import { copyToClipboardPromise } from '@/utils/System/Clipboard';
import { Button, message, Modal } from 'antd';
import React, { useCallback, useState } from 'react';
import GpuTaskDetailContent from './GpuTaskDetailContent';
import GpuTaskDetailTags from './GpuTaskDetailTags';

export interface GpuTaskDetailModalHandles {
  tryToShowModal: () => void;
}

interface Props {
  taskInfo: API.RealtimeGpuTask;
}

const GpuTaskDetailModal = React.forwardRef<GpuTaskDetailModalHandles, Props>(
  (props, ref) => {
    const { taskInfo } = props;

    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const contentDivRef = React.useRef<HTMLDivElement>(null);

    const [messageApi, contextHolder] = message.useMessage();

    const showModal = () => {
      setOpen(true);
    };

    const onClickCopyAll = () => {
      setLoading(true);

      if (contentDivRef.current) {
        const text = contentDivRef.current.innerText;
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
          })
          .finally(() => {
            setLoading(false);
            setOpen(false);
          });
      }
    };

    const onClickCancel = () => {
      setOpen(false);
    };

    const tryToShowModal = useCallback(() => {
      showModal();
    }, []);

    // 当组件挂载后，将这个组件的实例传递给父组件
    React.useImperativeHandle(ref, () => ({
      tryToShowModal,
    }));

    const title = `[${taskInfo.name}]${taskInfo.projectName}-${taskInfo.pyFileName};`;

    return (
      <>
        {contextHolder}

        <Modal
          open={open}
          title={title}
          onOk={onClickCancel}
          onCancel={onClickCancel}
          footer={[
            <Button key="back" onClick={onClickCancel}>
              关闭
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={loading}
              onClick={onClickCopyAll}
            >
              复制全部
            </Button>,
            //   <Button key="link" type="primary" loading={loading} onClick={copyAll}>
            //     复制全部
            //   </Button>,
          ]}
        >
          <div>
            <div ref={contentDivRef}>
              <GpuTaskDetailContent taskInfo={taskInfo} />
            </div>

            <GpuTaskDetailTags taskInfo={taskInfo} />
          </div>
        </Modal>
      </>
    );
  },
);

export default GpuTaskDetailModal;
