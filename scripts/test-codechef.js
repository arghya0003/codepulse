const fs = require('fs');
const https = require('https');
https.get('https://www.codechef.com/users/equal_poem_63', {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('codechef_profile.html', data);
    console.log('Saved html');
  });
});
