// Writes the logo files from src/brand/mark.js:
//   public/favicon.svg  - app icon tile (source for `npm run icons` PNGs)
//   public/logo.svg     - mark for light backgrounds
//   public/logo-dark.svg - mark for dark backgrounds
// Run: npm run brand   (then npm run icons)
import { writeFileSync } from 'node:fs';
import { markSVG } from '../src/brand/mark.js';

writeFileSync('public/favicon.svg', markSVG({ tile: true }) + '\n');
writeFileSync('public/logo.svg', markSVG({ tone: 'light' }) + '\n');
writeFileSync('public/logo-dark.svg', markSVG({ tone: 'dark' }) + '\n');
console.log('Wrote public/favicon.svg, public/logo.svg, public/logo-dark.svg');
