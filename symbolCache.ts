import { JSONBig, path } from "./deps.ts";
import symbolCacheDummy from "./symbolCache.json" with { type: "json" };

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));
const symbolCachePath = path.join(__dirname, "symbolCache.json");
const symbolCacheString = await Deno.readTextFile(symbolCachePath);

const symbolCache = Object
  .fromEntries(
    Object.entries(
      JSONBig({ storeAsString: true })
        .parse(symbolCacheString),
    ).map(([key, value]) => [
      key,
      BigInt(value as string),
    ]),
  ) as Record<keyof typeof symbolCacheDummy, bigint>;
export { symbolCache };

export const hasCachedSymbol = (
  name: string,
): name is keyof typeof symbolCache => name in symbolCache;
