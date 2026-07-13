/**
 * Demo varlık üretici — telifsiz, tamamen kodla üretilen SVG görseller
 * ve sentezlenmiş kısa ses dosyası (Şartname 37: lisanslı/kurgusal medya).
 *
 * Çalıştırma: node scripts/generate-demo-assets.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "public", "demo");
for (const dir of ["artists", "avatars", "posts", "audio"]) {
  mkdirSync(join(root, dir), { recursive: true });
}

const artists = [
  { key: "rayvold", name: "RAY VOLD", a: "#ff4d5a", b: "#2b3a67", c: "#12141c" },
  { key: "nefes", name: "NEFES", a: "#4da3ff", b: "#1d2b3a", c: "#0c1118" },
  { key: "karga", name: "KARGA", a: "#9d6bff", b: "#241a3d", c: "#0e0a18" },
  { key: "semak", name: "SEMA K", a: "#e8b64c", b: "#3a2d1d", c: "#171208" },
  { key: "golge", name: "GÖLGE 06", a: "#58d68d", b: "#15352a", c: "#081410" },
  { key: "beton", name: "BETON ÇİÇEĞİ", a: "#ff8a5c", b: "#3d241a", c: "#160d08" },
];

const grain = `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0"/></filter>`;

function cover(art, w, h, title = true) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const x = (i / 28) * w;
    const bh = h * (0.08 + 0.35 * Math.abs(Math.sin(i * 1.7 + art.key.length)));
    return `<rect x="${x.toFixed(0)}" y="${(h - bh).toFixed(0)}" width="${(w / 42).toFixed(0)}" height="${bh.toFixed(0)}" fill="${art.a}" opacity="0.16"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<radialGradient id="r" cx="22%" cy="30%" r="90%"><stop offset="0%" stop-color="${art.b}"/><stop offset="60%" stop-color="${art.c}"/><stop offset="100%" stop-color="#07080a"/></radialGradient>
<linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${art.a}" stop-opacity="0.5"/><stop offset="55%" stop-color="${art.a}" stop-opacity="0"/></linearGradient>
${grain}
</defs>
<rect width="${w}" height="${h}" fill="url(#r)"/>
<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.42}" fill="${art.a}" opacity="0.13"/>
<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.28}" fill="none" stroke="${art.a}" stroke-opacity="0.35" stroke-width="2"/>
<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.16}" fill="none" stroke="${art.a}" stroke-opacity="0.5" stroke-width="1.5"/>
<circle cx="${w * 0.78}" cy="${h * 0.3}" r="${h * 0.02}" fill="${art.a}"/>
${bars}
<rect width="${w}" height="${h}" fill="url(#l)"/>
${title ? `<text x="${w * 0.05}" y="${h * 0.88}" font-family="Arial Black, Arial" font-weight="900" font-size="${h * 0.11}" fill="#f5f5f3" opacity="0.92" letter-spacing="4">${art.name}</text>` : ""}
<rect width="${w}" height="${h}" filter="url(#g)"/>
</svg>`;
}

function avatar(art) {
  const initials = art.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
<defs><radialGradient id="r" cx="30%" cy="25%" r="100%"><stop offset="0%" stop-color="${art.b}"/><stop offset="100%" stop-color="${art.c}"/></radialGradient>${grain}</defs>
<rect width="400" height="400" fill="url(#r)"/>
<circle cx="200" cy="200" r="150" fill="none" stroke="${art.a}" stroke-opacity="0.4" stroke-width="3"/>
<circle cx="200" cy="200" r="100" fill="none" stroke="${art.a}" stroke-opacity="0.25" stroke-width="2"/>
<text x="200" y="238" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="110" fill="${art.a}">${initials}</text>
<rect width="400" height="400" filter="url(#g)"/>
</svg>`;
}

for (const art of artists) {
  writeFileSync(join(root, "artists", `${art.key}-cover.svg`), cover(art, 1600, 700));
  writeFileSync(join(root, "artists", `${art.key}-cover-mobile.svg`), cover(art, 800, 1000));
  writeFileSync(join(root, "artists", `${art.key}-avatar.svg`), avatar(art));
}

writeFileSync(
  join(root, "artists", "default-cover.svg"),
  cover({ key: "default", name: "RAPLAB", a: "#ff5f68", b: "#2b3a67", c: "#0c0e14" }, 1600, 700)
);

// Genel avatarlar
const personas = [
  { key: "user", label: "D", a: "#65a7ff", b: "#1d2b3a" },
  { key: "mod", label: "G", a: "#f2c94c", b: "#3a2d1d" },
  { key: "admin", label: "K", a: "#ff5f68", b: "#3d1a1d" },
  { key: "applicant", label: "S", a: "#58d68d", b: "#15352a" },
];
for (const p of personas) {
  writeFileSync(
    join(root, "avatars", `${p.key}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
<rect width="200" height="200" fill="${p.b}"/>
<circle cx="100" cy="80" r="34" fill="${p.a}" opacity="0.85"/>
<path d="M40 170c8-34 32-50 60-50s52 16 60 50" fill="${p.a}" opacity="0.55"/>
</svg>`
  );
}

// Gönderi görselleri
const posts = [
  { file: "rayvold-studio.svg", a: "#ff4d5a", b: "#1a1010", w: 1600, h: 1000, label: "MIX ROOM" },
  { file: "semak-kiyi.svg", a: "#e8b64c", b: "#12202b", w: 1600, h: 1000, label: "KIYI" },
  { file: "karga-video-poster.svg", a: "#9d6bff", b: "#10091e", w: 1280, h: 720, label: "ÇATI" },
  { file: "karga-set-1.svg", a: "#9d6bff", b: "#171027", w: 1200, h: 1200, label: "SET 01" },
  { file: "karga-set-2.svg", a: "#8455e0", b: "#120b20", w: 1200, h: 1200, label: "SET 02" },
  { file: "karga-set-3.svg", a: "#b58aff", b: "#1c1330", w: 1200, h: 1200, label: "SET 03" },
  { file: "karga-set-4.svg", a: "#6f42c8", b: "#0e0819", w: 1200, h: 1200, label: "SET 04" },
];
for (const p of posts) {
  const lines = Array.from({ length: 12 }, (_, i) => {
    const y = (i / 12) * p.h;
    return `<line x1="0" y1="${y}" x2="${p.w}" y2="${y}" stroke="${p.a}" stroke-opacity="0.07"/>`;
  }).join("");
  writeFileSync(
    join(root, "posts", p.file),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}">
<defs><radialGradient id="r" cx="35%" cy="35%" r="95%"><stop offset="0%" stop-color="${p.b}"/><stop offset="100%" stop-color="#060708"/></radialGradient>${grain}</defs>
<rect width="${p.w}" height="${p.h}" fill="url(#r)"/>
${lines}
<circle cx="${p.w * 0.7}" cy="${p.h * 0.4}" r="${p.h * 0.25}" fill="${p.a}" opacity="0.14"/>
<circle cx="${p.w * 0.7}" cy="${p.h * 0.4}" r="${p.h * 0.14}" fill="none" stroke="${p.a}" stroke-opacity="0.5" stroke-width="3"/>
<text x="${p.w * 0.06}" y="${p.h * 0.9}" font-family="Arial Black, Arial" font-weight="900" font-size="${p.h * 0.07}" fill="${p.a}" opacity="0.85" letter-spacing="6">${p.label}</text>
<rect width="${p.w}" height="${p.h}" filter="url(#g)"/>
</svg>`
  );
}

// 30 saniyelik sentez ses (WAV, 8kHz 16-bit mono) — basit lo-fi beat benzeri dalga
const sampleRate = 8000;
const seconds = 30;
const n = sampleRate * seconds;
const data = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const t = i / sampleRate;
  const beat = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35; // 120 BPM vurgu
  const kick = Math.exp(-((t * 2) % 1) * 10) * Math.sin(2 * Math.PI * 55 * t);
  const bass = 0.3 * Math.sin(2 * Math.PI * 82.4 * t) * beat;
  const hat = 0.06 * (Math.random() * 2 - 1) * (Math.exp(-(((t * 4) % 1)) * 18));
  const sample = Math.max(-1, Math.min(1, 0.55 * kick + bass + hat));
  data.writeInt16LE(Math.round(sample * 32767 * 0.8), i * 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);
writeFileSync(join(root, "audio", "teaser.wav"), Buffer.concat([header, data]));

console.log("Demo varlıkları üretildi: public/demo/");
