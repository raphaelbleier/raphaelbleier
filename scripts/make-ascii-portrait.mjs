import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/make-ascii-portrait.mjs <input.pgm> <output.svg>');
}

const input = fs.readFileSync(inputPath);
const header = input.subarray(0, 64).toString();
const dimensions = header.match(/^P5\s+(\d+)\s+(\d+)\s+255\s/);
if (!dimensions || input.subarray(0, 2).toString() !== 'P5') {
  throw new Error('Expected an 8-bit binary PGM image');
}

const headerEnd = dimensions[0].length;
const [, width, height] = dimensions.map(Number);
const pixels = input.subarray(headerEnd);
const ramp = ' .:-=+*#%@';
const fontSize = 7;
const lineHeight = 7.8;
const margin = 14;

const rows = Array.from({ length: height }, (_, y) => {
  const text = Array.from({ length: width }, (_, x) => {
    const luminance = Math.max(0, Math.min(1, (pixels[y * width + x] - 75) / 120));
    return ramp[Math.round(luminance * (ramp.length - 1))];
  }).join('');
  return `<text x="${margin}" y="${margin + (y + 1) * lineHeight}" fill="#e6edf3">${text}</text>`;
}).join('');

const svgWidth = width * 4.25 + margin * 2;
const svgHeight = height * lineHeight + margin * 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="ASCII portrait of Raphael Bleier">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <rect x="5" y="5" width="${svgWidth - 10}" height="${svgHeight - 10}" fill="none" stroke="#38bdf8" stroke-width="1"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${fontSize}" xml:space="preserve">${rows}</g>
  <text x="14" y="${svgHeight - 11}" fill="#38bdf8" font-family="ui-monospace, monospace" font-size="8">raphael@github:~$</text>
</svg>`;

fs.writeFileSync(outputPath, svg);
