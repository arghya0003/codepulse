const fs = require('fs');
const html = fs.readFileSync('cc.html', 'utf8');
const match = html.match(/var all_rating = (\[.*?\]);/);
if (match) {
  const data = JSON.parse(match[1]);
  console.log("First item:", JSON.stringify(data[0], null, 2));
} else {
  console.log("Not found");
}
