export const generateRandomId = (prefix: string = 'rand_'): string => {
  // 使用 crypto API 生成更安全的随机值
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  // 降级方案：使用 crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    return `${prefix}${array[0].toString(36)}${array[1].toString(36)}`.slice(0, prefix.length + 12);
  }
  // 最后降级：使用 Math.random（不推荐）
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
};
