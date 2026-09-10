import React from 'react';

interface Props {
  /**
   * 允许 undefined / null：实时聚合层有一批字段是可选的（后端暂未透出），
   * 直接传 `taskInfo.cudaVersion` 这类值时类型上就是 `string | undefined`。
   * 组件本来就在下面显式处理了 undefined 的情况，类型不应该把它挡住。
   */
  'v-show': boolean | string | number | null | undefined;
  children: React.ReactNode;
}

const VShow: React.FC<Props> = (props) => {
  const { 'v-show': vIf, children } = props;

  const isUndefined = vIf === undefined;
  const boolCheck = typeof vIf === 'boolean' ? vIf : false;
  const intCheck = typeof vIf === 'number' ? vIf !== 0 : false;
  const strCheck = typeof vIf === 'string' ? vIf.length > 0 : false;

  const shouldRender = !isUndefined && (boolCheck || intCheck || strCheck);

  return shouldRender ? <>{children}</> : <></>;
};

export default VShow;
