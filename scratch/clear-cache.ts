const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { Redis } = require("@upstash/redis");

async function clearCache() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("Missing Redis credentials.");
    process.exit(1);
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    console.log("Clearing Redis cache...");
    await redis.flushdb();
    console.log("Cache cleared successfully!");
  } catch (err) {
    console.error("Failed to clear cache:", err);
  } finally {
    process.exit(0);
  }
}

clearCache();
