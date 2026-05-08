const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const { fetchAllowed } = require("../lib/fetch-allowed");

async function checkCF() {
  const handle = "kablakartik";
  const url = `https://codeforces.com/api/user.rating?handle=${handle}`;
  
  try {
    const res = await fetchAllowed(url);
    const json = await res.json();
    console.log("Status:", json.status);
    console.log("Result length:", json.result?.length);
    if (json.result?.length > 0) {
      console.log("First item:", JSON.stringify(json.result[0], null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkCF();
