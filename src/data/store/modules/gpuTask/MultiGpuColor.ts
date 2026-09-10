import { create } from 'zustand';

/**
 * 多卡任务标签配色。
 *
 * 同一个多卡任务会出现在 N 张卡上，需要给它们分配同一种颜色才能一眼看出
 * 「这几个是同一个任务」。旧实现用 agent 的 topPythonPid（主进程 PID）作为
 * 分组键，但同源聚合层目前没有透出这个字段，所以键改成字符串，由
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
