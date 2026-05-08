const { load } = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('cc.html', 'utf8');
const $ = load(html);

$('script').each((i, el) => {
  const src = $(el).html();
  if (src && src.includes('userDailySubmissions')) {
     const match = src.match(/var userDailySubmissions = (\[.*?\]);/s);
     if (match) {
         console.log(match[1].substring(0, 200));
     }
  }
});
