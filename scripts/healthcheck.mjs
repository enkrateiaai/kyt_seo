import http from 'http';
const host = process.env.HOSTNAME || '127.0.0.1';
const req = http.get(`http://${host}:3000/`, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.setTimeout(3000, () => { req.destroy(); process.exit(1); });
