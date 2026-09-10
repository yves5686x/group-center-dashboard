import { useGpuTaskFilterProjectNameStore } from '@/data/store/modules/filter/GpuTaskFilterProjectName';
import { MatchStringFilter } from '@/data/store/modules/filter/utils';

// 移除无用的 useEffect，直接在组件中使用 store
export const useProjectFilter = () => {
  const projectName = useGpuTaskFilterProjectNameStore(
    (state) => state.projectName,
  );
  const isFuzzyMatch = useGpuTaskFilterProjectNameStore(
    (state) => state.isFuzzyMatch,
  );

  const checkProjectFilter = (taskInfo: API.RealtimeGpuTask): boolean => {
    return MatchStringFilter(
      taskInfo.projectName ?? '',
      projectName,
      isFuzzyMatch,
    );
  };

  return { checkProjectFilter, projectName, isFuzzyMatch };
};
