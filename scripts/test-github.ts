import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { decrypt } from "../lib/encryption";

async function main() {
  const { db } = await import("../db");
  const { platformProfiles } = await import("../db/schema");

  const [profile] = await db
    .select()
    .from(platformProfiles)
    .where(eq(platformProfiles.platform, "github"))
    .limit(1);

  if (!profile) {
    console.log("No GitHub profile found.");
    return;
  }

  console.log("Profile Handle:", profile.handle);

  if (!profile.accessToken) {
    console.log("No access token found.");
    return;
  }

  const token = decrypt(profile.accessToken);
  console.log("Token starts with:", token.substring(0, 4));

  const query = `
    query {
      viewer {
        login
        name
      }
    }
  `;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "CodePulse/1.0",
      },
      body: JSON.stringify({ query }),
    });

    console.log("GitHub Response Status:", res.status, res.statusText);
    const json = await res.json();
    console.log("GitHub Response Data:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error calling GitHub:", err);
  }
}

main();
