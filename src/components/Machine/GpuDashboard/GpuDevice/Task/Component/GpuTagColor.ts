import { UseMultiGpuTagColorStore } from '@/data/store/modules/gpuTask/MultiGpuColor';
import {
  blue,
  cyan,
  geekblue,
  gold,
  green,
  magenta,
  purple,
  volcano,
} from '@ant-design/colors';

const getRandomIndex = (length: number) => {
  return Math.floor(Math.random() * length);
};

const getColorFromArray = (color: string[], m: number, n: number) => {
  return color.slice(m, n);
};

const colorStartIndex = 6;
const colorEndIndex = 10;

const colorList = [
  ...getColorFromArray(gold, colorStartIndex, colorEndIndex),
  ...getColorFromArray(volcano, colorStartIndex, colorEndIndex),
  ...getColorFromArray(blue, colorStartIndex, colorEndIndex),
  ...getColorFromArray(green, colorStartIndex, colorEndIndex),
  ...getColorFromArray(cyan, colorStartIndex, colorEndIndex),
  ...getColorFromArray(geekblue, colorStartIndex, colorEndIndex),
  ...getColorFromArray(purple, colorStartIndex, colorEndIndex),
  ...getColorFromArray(magenta, colorStartIndex, colorEndIndex),
];

const colorSelectNewColor = (alreadyExistColors: string[]) => {
  // 从colorList中随机选择一个颜色，并且不在alreadyExistColors中，如果存在就要重新选择

  let currentColorList = colorList.filter(
    (color) => !alreadyExistColors.includes(color),
  );

  if (currentColorList.length === 0) {
    currentColorList = colorList;
  }

  const colorIndex = getRandomIndex(currentColorList.length);

  // 必须从「还没被用过的」列表里取；原来的 colorList[colorIndex] 会绕过上面
  // 的去重，导致两个不同的多卡任务撞上同一种颜色。
  return currentColorList[colorIndex];
};

/**
 * 多卡任务的分组键。
 *
 * 同一个 DDP 任务会在 N 张卡上各出现一次，需要一个稳定的键把它们关联起来。
 * 旧实现用 agent 的 topPythonPid（主进程 PID）。该字段已由聚合层透出，
 * 但 agent 可能返回 -1（表示「无法判定」），所以仍按可用性依次退回：
 * topPythonPid(>0) → screen 会话名 → 项目名/文件名。
 * 正常情况下会优先命中 topPythonPid，降级分支只兜异常数据。
 */
export const getTaskGroupKey = (taskInfo: API.RealtimeGpuTask): string => {
  const { topPythonPid, screenSessionName, projectName, pyFileName } = taskInfo;

  if (typeof topPythonPid === 'number' && topPythonPid > 0) {
    return `pid:${topPythonPid}`;
  }

  if (screenSessionName) {
    return `screen:${screenSessionName}`;
  }

  return `task:${projectName ?? ''}/${pyFileName ?? ''}`;
};

/**
 * 取某个多卡任务分组的标签颜色，第一次遇到时分配一个新颜色并记住。
 *
 * 注意这里用 getState() 而不是 hook 选择器：本函数会在渲染过程中被调用，
 * 但它本身不是组件也不是 hook，在里面注册订阅会破坏 React 的 hook 顺序。
 */
export const getTaskGroupColor = (groupKey: string): string => {
  const { getGroupColor, setGroupColor, getColorList } =
    UseMultiGpuTagColorStore.getState();

  let color = getGroupColor(groupKey);
  if (color === '') {
    color = colorSelectNewColor(getColorList());
    setGroupColor(groupKey, color);
  }

  return color;
};
