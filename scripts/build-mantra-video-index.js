#!/usr/bin/env node
/**
 * Builds reverse index: mantra slug → videos that use it
 * Writes result to scripts/mantra-video-index.json
 */
const Redis = require('/Users/viktornikulin/my-dashboard/node_modules/ioredis');
const fs = require('fs');
const path = require('path');

const REDIS_URL = 'redis://default:nkSTGw41uEWtb5vs0WDHPPJ779TDNdKa@redis-15054.crce198.eu-central-1-3.ec2.cloud.redislabs.com:15054';

const client = new Redis(REDIS_URL);

client.on('ready', async () => {
  const keys = await client.keys('mantras:*');
  const reverse = {};

  for (const key of keys) {
    const videoId = key.replace('mantras:', '');
    const [title, slug, raw, isFree] = await Promise.all([
      client.get('title:' + videoId),
      client.get('vidslug:' + videoId),
      client.get(key),
      client.get('free:' + videoId),
    ]);
    const mantras = JSON.parse(raw);
    for (const m of mantras) {
      if (!reverse[m.slug]) reverse[m.slug] = [];
      reverse[m.slug].push({
        videoId,
        title: title || videoId,
        slug: slug || videoId,
        free: isFree === '1' || isFree === 'true',
      });
    }
  }

  // Sort each list by title
  for (const slug of Object.keys(reverse)) {
    reverse[slug].sort((a, b) => a.title.localeCompare(b.title, 'de'));
  }

  const outPath = path.join(__dirname, 'mantra-video-index.json');
  fs.writeFileSync(outPath, JSON.stringify(reverse, null, 2), 'utf8');

  const stats = Object.entries(reverse)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([s, v]) => `  ${v.length}\t${s}`)
    .join('\n');
  console.log('Reverse index built:\n' + stats);
  console.log('\nWritten to', outPath);

  client.disconnect();
});

client.on('error', e => { console.error(e.message); process.exit(1); });
