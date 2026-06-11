import sharp from 'sharp';

// Battery + lightning bolt app icon on a slate background
const svg = (size, pad = 0) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="url(#bg)"/>
  <!-- battery body -->
  <rect x="${106 + pad}" y="${176 + pad}" width="${280 - 2*pad*280/512}" height="${160 - 2*pad*160/512}" rx="24" fill="none" stroke="#e2e8f0" stroke-width="22"/>
  <rect x="398" y="216" width="36" height="80" rx="10" fill="#e2e8f0"/>
  <!-- lightning bolt -->
  <path d="M268 150 L180 270 L240 270 L222 362 L312 240 L252 240 Z" fill="url(#bolt)"/>
</svg>`;

await sharp(Buffer.from(svg(512))).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(svg(512))).resize(192, 192).png().toFile('public/icons/icon-192.png');
// maskable: no rounded corners, content inside safe zone
const maskable = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(0.72) translate(-256 -256)">
    <rect x="106" y="176" width="280" height="160" rx="24" fill="none" stroke="#e2e8f0" stroke-width="22"/>
    <rect x="398" y="216" width="36" height="80" rx="10" fill="#e2e8f0"/>
    <path d="M268 150 L180 270 L240 270 L222 362 L312 240 L252 240 Z" fill="url(#bolt)"/>
  </g>
</svg>`;
await sharp(Buffer.from(maskable)).png().toFile('public/icons/icon-512-maskable.png');
console.log('icons done');
