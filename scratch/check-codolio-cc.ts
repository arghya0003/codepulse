const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { fetchAllowed } = require("../lib/fetch-allowed");

async function checkCodolio() {
  const handle = process.env.CODOLIO_HANDLE;
  const token = process.env.CODOLIO_BEARER_TOKEN;

  if (!handle || !token) {
    console.error("Missing credentials");
    process.exit(1);
  }

  const url = `https://api.codolio.com/profile?userKey=${handle}`;

  try {
    const res = await fetchAllowed(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "CodePulse/1.0",
        "Content-Type": "application/json"
      }
    });

    const json = await res.json();
    console.log("Codolio platforms:", json.data.platformProfiles.platformProfiles.map(p => p.platform));
    
    const codechef = json.data.platformProfiles.platformProfiles.find(p => p.platform === "codechef");
    if (codechef) {
      console.log("CodeChef found in Codolio!");
      console.log("Has calendar:", !!codechef.dailyActivityStatsResponse?.submissionCalendar);
    } else {
      console.log("CodeChef NOT found in Codolio.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkCodolio();
