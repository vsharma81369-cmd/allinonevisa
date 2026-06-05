/* One-off textual tweaks across all pages + the generator.
   - New logo mark (map-pin + check) replacing the "AIOV" text tile
   - New favicon to match
   - "By reason" -> "By purpose of visit" (nav + mobile), footer -> "By purpose"
   - Remove every em dash (—), replacing with a comma
   Run:  node apply-tweaks.js
*/
const fs = require('fs');

const NEW_MARK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10z"/><path d="M9.3 10.7l1.9 1.9 3.5-3.6"/></svg>';

const OLD_BRAND = '<span class="brand__mark" aria-hidden="true">AIOV</span>';
const NEW_BRAND = '<span class="brand__mark" aria-hidden="true">' + NEW_MARK_SVG + '</span>';

const OLD_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231A1A2E'/%3E%3Ctext x='16' y='21' font-family='Arial' font-size='11' font-weight='700' fill='%23C9A84C' text-anchor='middle'%3EAIOV%3C/text%3E%3C/svg%3E";
const NEW_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%231A1A2E'/%3E%3Cg fill='none' stroke='%23C9A84C' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20s-5-4.7-5-8.3a5 5 0 1 1 10 0c0 3.6-5 8.3-5 8.3z'/%3E%3Cpath d='M9.8 11.3l1.6 1.6 2.8-2.9'/%3E%3C/g%3E%3C/svg%3E";

function tweak(s) {
  s = s.split(OLD_BRAND).join(NEW_BRAND);
  s = s.split(OLD_FAVICON).join(NEW_FAVICON);
  // nav dropdown label
  s = s.split('>By reason <svg class="caret"').join('>By purpose of visit <svg class="caret"');
  s = s.split('class="m-group__head">By reason</p>').join('class="m-group__head">By purpose of visit</p>');
  // footer column heading (kept short)
  s = s.split('<h4>By reason</h4>').join('<h4>By purpose</h4>');
  // remove em dashes -> comma
  s = s.replace(/[ \t]*—[ \t]*/g, ', ');
  return s;
}

const files = fs.readdirSync('.').filter((f) => f.endsWith('.html'));
files.push('main.js', 'build-pages.js');

let total = 0;
files.forEach((f) => {
  if (!fs.existsSync(f)) return;
  const before = fs.readFileSync(f, 'utf8');
  const after = tweak(before);
  if (after !== before) {
    fs.writeFileSync(f, after);
    const emLeft = (after.match(/—/g) || []).length;
    console.log('  tweaked', f, emLeft ? '(em dashes left: ' + emLeft + ')' : '');
    total++;
  }
});
console.log('Done. Files changed:', total);
