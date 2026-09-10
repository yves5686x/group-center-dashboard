import { useGpuTaskFilterUserNameStore } from '@/data/store/modules/filter/GpuTaskFilterUserName';
import { MatchStringFilter } from '@/data/store/modules/filter/utils';

// 移除无用的 useEffect，直接在组件中使用 store
export const useUserFilter = () => {
  const userNameEng = useGpuTaskFilterUserNameStore(
    (state) => state.userNameEng,
  );
  const isFuzzyMatch = useGpuTaskFilterUserNameStore(
    (state) => state.isFuzzyMatch,
  );

  const checkUserFilter = (taskInfo: API.RealtimeGpuTask): boolean => {
    return MatchStringFilter(taskInfo.name ?? '', userNameEng, isFuzzyMatch);
  };

  return { checkUserFilter, userNameEng, isFuzzyMatch };
};
