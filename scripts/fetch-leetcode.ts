async function fetchIt() {
  const res = await fetch("https://alfa-leetcode-api.onrender.com/userProfile/kablakartik");
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
fetchIt();
