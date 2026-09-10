// 示例方法，没有实际意义
export function trim(str: string) {
  return str.trim();
}

/**
 * 过滤掉版本号中的 ^ 符号
 * @param version 版本号字符串
 * @returns 过滤后的版本号
 */
export function removeVersionCaret(version: string): string {
  return version.replace(/^\^/, '');
}

/**
 * 过滤掉版本号中的 ~ 符号
 * @param version 版本号字符串
 * @returns 过滤后的版本号
 */
export function removeVersionTilde(version: string): string {
  return version.replace(/^~/, '');
}

/**
 * 过滤掉版本号中的所有符号（^、~等）
 * @param version 版本号字符串
 * @returns 过滤后的版本号
 */
export function cleanVersion(version: string): string {
  return version.replace(/^[\^~]/, '');
}

/**
 * 把版本号缩短为前 N 段，例如 12.4.1 → 12.4。
 *
 * 入参允许为 undefined / null / 空串：聚合层虽已透出 cudaVersion、pythonVersion
 * 这一批字段，但 agent 对某些任务会返回空串（如 cudaVisibleDevices），
 * 且 last-known-good 回退可能给出旧结构。原来的写法直接
 * `version.split('.')`，字段缺失时会抛 TypeError 把整个详情弹窗带崩，
 * 这里统一返回空串，由调用方的 VShow 决定是否渲染。
 */
export function shortenVersion(
  version?: string | null,
  segments: number = 2,
): string {
  if (!version) {
    return '';
  }

  const parts = version.split('.');
  if (parts.length <= segments) {
    return version;
  }

  return parts.slice(0, segments).join('.');
}
