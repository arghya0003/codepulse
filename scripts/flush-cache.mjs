import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const patterns = [
  "platform:*",
  "sync:*",
  "ratelimit:*",
];

let totalDeleted = 0;

for (const pattern of patterns) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    const n = await redis.del(...keys);
    console.log(`[${pattern}] deleted ${n} key(s):`, keys);
    totalDeleted += n;
  } else {
    console.log(`[${pattern}] no keys found`);
  }
}

console.log(`\nDone. Total keys deleted: ${totalDeleted}`);
process.exit(0);
