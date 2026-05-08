import { fetchAllowed } from "@/lib/fetch-allowed";

export async function fetchCodolioProfile() {
  const handle = process.env.CODOLIO_HANDLE;
  const token = process.env.CODOLIO_BEARER_TOKEN;

  if (!handle || !token) {
    throw new Error("Missing Codolio credentials in environment variables.");
  }

  const url = `https://api.codolio.com/profile?userKey=${handle}`;

  const res = await fetchAllowed(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "CodePulse/1.0",
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`Codolio API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.success && json.status && !json.status.success) {
    throw new Error("Codolio API returned error status");
  }

  return json.data;
}
