import { useGpuTaskFilterMultiGpuStore } from '@/data/store/modules/filter/GpuTaskFilterMultiGpu';
import { useProjectFilter } from './ProjectFilter';
import { useUserFilter } from './UserFilter';

// 移除无用的 FilterUseEffect，直接在组件中使用 hooks
export const useFilter = () => {
  const { checkUserFilter } = useUserFilter();
  const { checkProjectFilter } = useProjectFilter();
  const multiGpuFilter = useGpuTaskFilterMultiGpuStore(
    (state) => state.multiGpuFilter,
  );

  const checkMultiGpuFilter = (taskInfo: API.RealtimeGpuTask): boolean => {
    if (multiGpuFilter === 'none') {
      return true; // 不启用过滤器，显示所有任务
    }

    // 多卡任务包括：worldSize > 1 (DDP) 或 multiprocessingSpawn = true (Spawn)
    // multiprocessingSpawn 声明为可选（兼容旧快照），必须用 === true 收窄，
    // 否则返回值会变成 boolean | undefined。
    const isMultiGpu =
      (taskInfo.worldSize ?? 0) > 1 || taskInfo.multiprocessingSpawn === true;

    if (multiGpuFilter === 'single') {
      return !isMultiGpu; // 只显示单卡任务
    } else if (multiGpuFilter === 'multi') {
      return isMultiGpu; // 只显示多卡任务
    }

    return true;
  };

  const checkFilter = (taskInfo: API.RealtimeGpuTask): boolean => {
    let finalResult = true;

    finalResult = finalResult && checkUserFilter(taskInfo);
    finalResult = finalResult && checkProjectFilter(taskInfo);
    finalResult = finalResult && checkMultiGpuFilter(taskInfo);

    return finalResult;
  };

  return { checkFilter };
};
