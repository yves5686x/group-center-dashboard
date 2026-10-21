import { GetIsDarkMode } from '@/utils/AntD5/AntD5DarkMode';
import { useReadableColors } from './useReadableColors';

/** Chart defaults apply extra opacity; use the rendered text colour at full opacity. */
export const useReadableChartTheme = () => {
  const isDark = GetIsDarkMode();
  const { secondary } = useReadableColors();
  return {
    type: isDark ? ('dark' as const) : ('light' as const),
    axis: {
      labelFill: secondary,
      labelOpacity: 1,
      titleFill: secondary,
      titleOpacity: 1,
    },
    label: { fill: secondary, fillOpacity: 1 },
    legendCategory: {
      itemLabelFill: secondary,
      itemLabelFillOpacity: 1,
      itemValueFill: secondary,
      itemValueFillOpacity: 1,
    },
  };
};
