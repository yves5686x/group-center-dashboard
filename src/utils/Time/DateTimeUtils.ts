export const padTime = (num: number) => {
  return String(num).padStart(2, '0');
};

export const getCurrentTimeStamp = () => {
  return Date.now();
};

export const getPreviousTimeStamp = (
  currentTimestamp: number,
  hour: number,
  minute: number,
) => {
  return currentTimestamp - hour * 60 * 60 * 1000 - minute * 60 * 1000;
};

export const convertToPythonTimestamp = (timestamp: number) => {
  return timestamp / 1000;
};

export const getTimeStrFromTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);

  const date_part_1 = date.getFullYear();
  const date_part_2 = padTime(date.getMonth() + 1);
  const date_part_3 = padTime(date.getDate());
  const dateString = `${date_part_1}-${date_part_2}-${date_part_3}`;

  const time_part_1 = padTime(date.getHours());
  const time_part_2 = padTime(date.getMinutes());
  const time_part_3 = padTime(date.getSeconds());
  const timeString = `${time_part_1}:${time_part_2}:${time_part_3}`;

  return `${dateString} ${timeString}`;
};

/**
 * 秒级时间戳转毫秒级。
 *
 * 实时聚合层里 snapshotTime / serverTime / freshness 是秒级，而
 * tasks[].startTimestamp 是毫秒级，两者混在同一个响应体里。所有秒级字段
 * 都必须先过这个函数再交给任何基于 Date 的格式化逻辑，否则会得到 1970 年。
 *
 * 0 / 负数 / 非数字统一视为「无时间」，返回 0，调用方据此显示「未知」。
 */
export const secondsToMillis = (seconds?: number | null): number => {
  if (
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return 0;
  }
  return seconds * 1000;
};

/** 秒级时间戳格式化为本地时间字符串；无有效时间时返回「未知」 */
export const getTimeStrFromSecondsTimestamp = (
  seconds?: number | null,
): string => {
  const millis = secondsToMillis(seconds);
  if (millis === 0) {
    return '未知';
  }
  return getTimeStrFromTimestamp(millis);
};

/**
 * 数据年龄（秒）格式化为人类可读字符串。
 * 聚合层用 -1 表示「从无数据」。
 */
export const formatFreshness = (freshness?: number | null): string => {
  if (typeof freshness !== 'number' || !Number.isFinite(freshness)) {
    return '未知';
  }
  if (freshness < 0) {
    return '无数据';
  }
  if (freshness < 60) {
    return `${Math.round(freshness)}秒前`;
  }
  if (freshness < 3600) {
    return `${Math.floor(freshness / 60)}分钟前`;
  }
  if (freshness < 86400) {
    return `${Math.floor(freshness / 3600)}小时前`;
  }
  return `${Math.floor(freshness / 86400)}天前`;
};
