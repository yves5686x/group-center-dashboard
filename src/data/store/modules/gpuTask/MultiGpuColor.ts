import { create } from 'zustand';

/**
 * 多卡任务标签配色。
 *
 * 同一个多卡任务会出现在 N 张卡上，需要给它们分配同一种颜色才能一眼看出
 * 「这几个是同一个任务」。分组键不再直接绑 topPythonPid（该字段已透出，但 agent
 * 可能返回 -1 表示无法判定），而是改成字符串，由
 * GpuTagColor.getTaskGroupKey 决定用什么分组。
 */
interface IMultiGpuTagColor {
  multiGpuColor: Map<string, string>;

  setGroupColor: (groupKey: string, color: string) => void;
  getGroupColor: (groupKey: string) => string;
  getColorList: () => string[];
}

export const UseMultiGpuTagColorStore = create<IMultiGpuTagColor>()(() => ({
  multiGpuColor: new Map(),

  setGroupColor: (groupKey: string, color: string) => {
    UseMultiGpuTagColorStore.getState().multiGpuColor.set(groupKey, color);
  },

  getGroupColor: (groupKey: string): string => {
    return (
      UseMultiGpuTagColorStore.getState().multiGpuColor.get(groupKey) ?? ''
    );
  },

  getColorList: (): string[] => {
    const colorList: string[] = [];
    for (const [, value] of UseMultiGpuTagColorStore.getState().multiGpuColor) {
      colorList.push(value);
    }
    return colorList;
  },
}));
