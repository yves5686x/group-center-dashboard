import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * GPU 看板的机器选择。
 *
 * 存的是 **serverNameEng**（聚合层的路径参数），不是展示名。展示名来自
 * `serverName`，后端改配置时会变（例如 "3090-GPU1" → "3090 + 1080Ti"），
 * 用它做持久化键会导致老用户的选择整体失配。
 */
interface GpuTaskFilterMachineState {
  // 选中的机器标识列表（serverNameEng）
  selectedMachineNames: string[];

  // 设置选中的机器标识
  setSelectedMachineNames: (machineNames: string[]) => void;

  // 清除所有机器选择（自动全选所有机器）
  clearMachineSelection: (allMachineNames?: string[]) => void;
}

export const useGpuTaskFilterMachineStore = create<GpuTaskFilterMachineState>()(
  persist(
    (set) => ({
      selectedMachineNames: [],

      setSelectedMachineNames: (machineNames: string[]) => {
        set({
          selectedMachineNames: machineNames,
        });
      },

      clearMachineSelection: (allMachineNames?: string[]) => {
        // 如果有传入所有机器名称，则自动全选所有机器
        // 否则保持为空数组（兼容旧逻辑）
        const newSelectedMachineNames = allMachineNames || [];
        set({
          selectedMachineNames: newSelectedMachineNames,
        });
      },
    }),
    {
      name: 'gpu-task-filter-machine-storage',
      // v1 存的是 machineName（展示名），v2 改存 serverNameEng，两者的值域
      // 完全不同且无法可靠互转，所以直接丢弃旧值让页面回到「全选」，而不是
      // 带着一份匹配不上任何机器的名单进去把看板变成空白。
      version: 2,
      migrate: () => ({ selectedMachineNames: [] }),
    },
  ),
);
