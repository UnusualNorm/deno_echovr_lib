import symbolCacheStrings from "./symbolCache.json" with { type: "json" };

const symbolCache = Object
  .fromEntries(
    Object.entries(
      symbolCacheStrings,
    ).map(([key, value]) => [
      key,
      BigInt(value),
    ]),
  ) as Record<keyof typeof symbolCacheStrings, bigint>;
export { symbolCache };

export const hasCachedSymbol = (
  name: string,
): name is keyof typeof symbolCache => name in symbolCache;
