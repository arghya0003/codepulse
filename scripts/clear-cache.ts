import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function clear() {
  const { redis } = await import("../lib/redis");
  const keys = await redis.keys("platform:*");
  if (keys.length) {
    await redis.del(...keys);
    console.log("Cleared cache", keys);
  } else {
    console.log("No cache keys found");
  }
}

clear();
