const https = require('https');
const token = 'eyJhbGciOiJIUzI1NiJ9.eyJVc2VyIjp7ImlkIjo2MTQ3MiwiZW1haWwiOiJhcmdoeWFiaGF0dDIwMDNAZ21haWwuY29tIiwicGFzc3dvcmQiOm51bGwsImZpcnN0TmFtZSI6IkFyZ2h5YSIsInNlY29uZE5hbWUiOiJCaGF0dGFjaGFyeWEiLCJwcm9maWxlTmFtZSI6ImthYmxha2FydGlrIiwicHJvZmlsZVZpZXdzIjpudWxsLCJpbWFnZVVybCI6Imh0dHBzOi8vZDJ2MTE5am1kajNzeG8uY2xvdWRmcm9udC5uZXQvNjE0NzJfMTc1ODk2MDkxIiwidXNlckRldGFpbHMiOm51bGwsInByb2ZpbGVWaXNpYmlsaXR5Q29uZmlnIjpudWxsLCJwbGF0Zm9ybVByb2ZpbGVzIjpudWxsLCJjcmVhdGVkQXQiOjE3NTQwNjk0ODUwMDAsInVwZGF0ZWRBdCI6MTc1NDA3MDM0NzAwMH0sIkVtYWlsIjoiYXJnaHlhYmhhdHQyMDAzQGdtYWlsLmNvbSIsInN1YiI6ImFyZ2h5YWJoYXR0MjAwM0BnbWFpbC5jb20iLCJpYXQiOjE3Nzc1NTgwMDMsImV4cCI6MTc3ODk0MDQwM30.oFdn16k6m8MuTtQZoVJ_4-jndhjSEXqOjQq4_QWJkic';

const options = {
  hostname: 'api.codolio.com',
  path: '/profile?userKey=kablakartik',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'User-Agent': 'Mozilla/5.0'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    require('fs').writeFileSync('codolio_response.json', data);
    console.log('Saved to codolio_response.json');
  });
});

req.on('error', err => console.error(err));
req.end();
