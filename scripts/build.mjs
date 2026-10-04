// Renders the profile README and its terminal-style SVG blocks.
// Usage: GH_TOKEN=... node scripts/build.mjs
// Static content lives in profile.json; live numbers come from the GitHub API.
// If dist/snake.svg exists (Platane/snk), it is embedded in the snake block.
import fs from 'node:fs';

const P = JSON.parse(fs.readFileSync('profile.json', 'utf8'));
const token = process.env.GH_TOKEN;
if (!token) throw new Error('GH_TOKEN is not set');

// ---------- data ----------
async function api(path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `bearer ${token}`, 'user-agent': 'profile-build', accept: 'application/vnd.github+json' },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function fetchStats() {
  let after = null, repos = [], calendar, total;
  do {
    const { data, errors } = await (await api('/graphql', {
      query: `query($login:String!,$after:String){user(login:$login){
        contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount}}}}
        repositories(first:100,after:$after,ownerAffiliations:OWNER,isFork:false){totalCount pageInfo{hasNextPage endCursor} nodes{primaryLanguage{name}}}}}`,
      variables: { login: P.user, after },
    })).json();
    if (errors) throw new Error(JSON.stringify(errors));
    const u = data.user;
    calendar = u.contributionsCollection.contributionCalendar;
    total = u.repositories.totalCount;
    repos.push(...u.repositories.nodes);
    after = u.repositories.pageInfo.hasNextPage ? u.repositories.pageInfo.endCursor : null;
  } while (after);
  const langs = {};
  for (const r of repos) if (r.primaryLanguage) langs[r.primaryLanguage.name] = (langs[r.primaryLanguage.name] || 0) + 1;
  return {
    contributions: calendar.totalContributions,
    days: calendar.weeks.map(w => w.contributionDays.map(d => d.contributionCount)),
    repos: total,
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
  };
}

async function commitCount(repo) {
  const res = await api(`/repos/${P.user}/${repo}/commits?per_page=1`);
  const last = /page=(\d+)>; rel="last"/.exec(res.headers.get('link') || '');
  return last ? +last[1] : (await res.json()).length;
}

async function recentCommits(n) {
  // public repos only; the events API drops anything older than 90 days, so read commits directly
  const repos = (await (await api(`/users/${P.user}/repos?type=owner&sort=pushed&per_page=${n * 2}`)).json()).filter(r => !r.fork && r.name !== P.user);
  const lists = await Promise.all(repos.map(async r =>
    (await (await api(`/repos/${r.full_name}/commits?author=${P.user}&per_page=${n}`)).json()).map(c => ({
      sha: c.sha.slice(0, 7), date: c.commit.author.date.slice(0, 10), msg: c.commit.message.split('\n')[0], repo: r.name,
    }))));
  return lists.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

// ---------- svg helpers ----------
const C = {
  base: '#1e1e2e', mantle: '#181825', crust: '#11111b', surface: '#313244', overlay: '#6c7086', text: '#cdd6f4', sub: '#a6adc8',
  mauve: '#cba6f7', green: '#a6e3a1', peach: '#fab387', yellow: '#f9e2af', pink: '#f38ba8', sky: '#89dceb', blue: '#89b4fa',
};
const W = 830, X = 22, FS = 13.5, CW = FS * 0.6;
const esc = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const font = (name, file) => `@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${fs.readFileSync(`assets/fonts/${file}`).toString('base64')}) format('woff2')}`;
const FONTS = {
  mono: font('JBM', 'jbm-400.woff2') + font('JBMB', 'jbm-700.woff2'),
  arcade: font('PS2P', 'press-start.woff2') + font('VT', 'vt323.woff2'),
};
const blink = `<animate attributeName="opacity" values="1;0" calcMode="discrete" dur="1.1s" repeatCount="indefinite"/>`;

function frame(h, body, { label, arcade = false, top = false } = {}) {
  const scan = arcade ? `<defs><pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#ffffff" opacity=".03"/></pattern></defs><rect x="1" y="1" width="${W - 2}" height="${h - 2}" rx="10" fill="url(#scan)"/>` : '';
  const chrome = top ? `<path d="M1 37V11a10 10 0 0 1 10-10h${W - 22}a10 10 0 0 1 10 10v26z" fill="${C.mantle}"/><line x1="1" y1="37" x2="${W - 1}" y2="37" stroke="${C.surface}"/>
    <circle cx="22" cy="19" r="6" fill="${C.pink}"/><circle cx="42" cy="19" r="6" fill="${C.yellow}"/><circle cx="62" cy="19" r="6" fill="${C.green}"/>
    <text x="${W / 2}" y="23" text-anchor="middle" fill="${C.overlay}" font-size="12">${P.user.replace('bleier', '')}@${P.host}: ~</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">
<style>${FONTS.mono}${arcade ? FONTS.arcade : ''}svg{fill:${C.text}}text{font-family:'JBM',ui-monospace,monospace;font-size:${FS}px}.b{font-family:'JBMB','JBM',monospace}.px{font-family:'PS2P',monospace}.vt{font-family:'VT',monospace}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${h - 1}" rx="10" fill="${C.base}" stroke="${C.surface}"/>${chrome}
${body}${scan}
</svg>`;
}

function prompt(y, cmd, extra = '') {
  return `<text x="${X}" y="${y}" xml:space="preserve"><tspan fill="${C.green}">raphael</tspan><tspan fill="${C.blue}">@</tspan><tspan fill="${C.green}">${P.host}</tspan><tspan fill="${C.blue}"> ~</tspan><tspan fill="${C.green}"> $ </tspan>${cmd ? `<tspan>${esc(cmd)}</tspan>` : ''}</text>${extra}`;
}
const promptWidth = `raphael@${P.host} ~ $ `.length * CW;

function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + ' ' + word).length > max) lines.push(word); else lines[lines.length - 1] = cur ? cur + ' ' + word : word;
  }
  return lines;
}

// ---------- blocks ----------
function header(stats) {
  const portrait = JSON.parse(fs.readFileSync('assets/portrait.json', 'utf8'));
  const pFS = 11, pLH = 11.9, pY = 90;
  const lift = c => '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * 1.25 + 12)).toString(16).padStart(2, '0')).join('');
  const art = portrait.map((row, i) => `<text x="${X}" y="${pY + i * pLH}" xml:space="preserve" class="b" style="font-size:${pFS}px">${row.map(([c, t]) => c ? `<tspan fill="${lift(c)}">${esc(t)}</tspan>` : esc(t)).join('')}</text>`).join('\n');
  const artH = portrait.length * pLH;
  const ix = X + portrait[0].reduce((n, [, t]) => n + t.length, 0) * pFS * 0.6 + 40;
  const lines = [
    `<tspan fill="${C.peach}">raphael</tspan>@<tspan fill="${C.peach}">${P.host}</tspan>`,
    `<tspan fill="${C.surface}">----------------</tspan>`,
    ...[...P.info, ['Uptime', `${stats.contributions} contributions / year`]].map(([k, v]) => `<tspan fill="${C.mauve}" class="b">${esc(k)}</tspan>: ${esc(v)}`),
  ];
  const lh = 22, iy = pY + artH / 2 - (lines.length * lh + 24) / 2 + 10;
  const info = lines.map((l, i) => `<text x="${ix}" y="${iy + i * lh}">${l}</text>`).join('\n');
  const sw = [C.surface, C.pink, C.green, C.yellow, C.blue, C.mauve, C.sky, C.text].map((c, i) => `<rect x="${ix + i * 24}" y="${iy + lines.length * lh - 8}" width="24" height="15" fill="${c}"/>`).join('');
  const cmd = 'neofetch', steps = cmd.length;
  const typed = `<clipPath id="ty"><rect x="${X + promptWidth}" y="50" height="24" width="0"><animate attributeName="width" values="${Array.from({ length: steps + 1 }, (_, i) => i * CW).join(';')}" keyTimes="${Array.from({ length: steps + 1 }, (_, i) => (i / steps).toFixed(3)).join(';')}" calcMode="discrete" dur="1.2s" begin=".4s" fill="freeze"/></rect></clipPath>
<text x="${X + promptWidth}" y="66" clip-path="url(#ty)">${cmd}</text>`;
  const h = pY + artH + 20;
  return frame(h, prompt(66, '') + typed + art + info + sw, { top: true, label: `Raphael Bleier, ${P.info.map(i => i[1]).join(', ')}. ${stats.contributions} contributions in the last year.` });
}

function now() {
  const rowH = 23, y0 = 62;
  const rows = P.now.map(([k, v], i) => `<text x="${X}" y="${y0 + i * rowH}" xml:space="preserve"><tspan fill="${C.mauve}" class="b">${esc(k.padEnd(9))}</tspan><tspan fill="${C.overlay}">→ </tspan>${esc(v)}</text>`).join('\n');
  return frame(y0 + P.now.length * rowH + 4, prompt(32, 'cat now.md') + rows, { label: P.now.map(([k, v]) => `${k}: ${v}`).join('. ') });
}

function top(stats) {
  const y0 = 54, rowH = 22, cols = [X, X + 70, X + 160, X + 300];
  const head = `<rect x="${X - 6}" y="${y0 - 15}" width="${W - 2 * X + 12}" height="21" fill="${C.surface}"/>
<text y="${y0}" class="b">${['PID', '%FOCUS', '', 'COMMAND'].map((t, i) => `<tspan x="${cols[i]}">${t}</tspan>`).join('')}</text>`;
  const rows = P.focus.map(([cmd, pct], i) => {
    const y = y0 + (i + 1) * rowH, pid = String(2400 - i * 517).padStart(4, '0');
    return `<text y="${y}" xml:space="preserve"><tspan x="${cols[0]}" fill="${C.overlay}">${pid}</tspan><tspan x="${cols[1]}" fill="${C.peach}">${pct.toFixed(1).padStart(5)}</tspan><tspan x="${cols[3]}" fill="${C.green}">${esc(cmd)}</tspan></text>
<rect x="${cols[2]}" y="${y - 10}" width="${pct * 3.2}" height="10" rx="1" fill="${C.peach}"/>`;
  }).join('\n');
  const ly = y0 + (P.focus.length + 1) * rowH + 12;
  const load = `<text x="${X}" y="${ly}" fill="${C.sub}" style="fill:${C.sub}">load average: ${stats.contributions} contributions · ${stats.repos} repos · ${stats.langs.length} languages</text>`;
  return frame(ly + 22, prompt(30, 'top -o %FOCUS') + head + rows + load, { label: 'Focus: ' + P.focus.map(([c, p]) => `${c} ${p}%`).join(', ') });
}

function scores(stats, counts) {
  const hud = `<text y="64" class="px" style="font-size:10px;fill:${C.pink}"><tspan x="${X}">1UP <tspan fill="${C.text}">RAPHAEL</tspan></tspan></text>
<text x="${W / 2}" y="64" text-anchor="middle" class="px" style="font-size:10px;fill:${C.pink}">HI-SCORE <tspan fill="${C.text}">${String(stats.contributions).padStart(6, '0')}</tspan></text>
<text x="${W - X}" y="64" text-anchor="end" class="px" style="font-size:10px;fill:${C.pink}">CREDIT <tspan fill="${C.text}">${stats.repos}</tspan></text>`;
  const th = `<text y="96" class="px" style="font-size:9px;fill:${C.pink}"><tspan x="${X}">RANK</tspan><tspan x="${X + 66}">GAME</tspan><tspan x="${W - 150}">LANG</tspan></text><text x="${W - X}" y="96" text-anchor="end" class="px" style="font-size:9px;fill:${C.pink}">SCORE</text>`;
  const rankName = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
  const rows = P.scores.map((s, i) => {
    const y = 126 + i * 44;
    return `<text y="${y}" class="vt" style="font-size:22px"><tspan x="${X}" fill="${C.yellow}">${rankName[i]}</tspan><tspan x="${X + 66}" fill="${i ? C.text : C.yellow}">${esc(s.repo.toUpperCase())}</tspan><tspan x="${W - 150}" fill="${C.mauve}">${s.lang}</tspan></text>
<text x="${W - X}" y="${y}" text-anchor="end" class="vt" style="font-size:22px;fill:${C.sky}">${String(counts[i]).padStart(4, '0')}</text>
<text x="${X + 66}" y="${y + 17}" class="vt" style="font-size:17px;fill:${C.overlay}">${esc(s.desc)}</text>`;
  }).join('\n');
  const by = 126 + P.scores.length * 44 + 8;
  const press = `<text x="${X}" y="${by}" class="px" style="font-size:10px;fill:${C.sky}">PRESS START${blink}</text>`;
  return frame(by + 22, prompt(30, './arcade --highscores') + hud + th + rows + press, { arcade: true, label: 'Projects: ' + P.scores.map(s => `${s.repo} (${s.desc})`).join(', ') });
}

function achievements(stats) {
  const fill = t => t.replace('{contributions}', stats.contributions).replace('{repos}', stats.repos).replace('{languages}', stats.langs.length);
  const cols = 3, gap = 12, cw = (W - 2 * X - gap * (cols - 1)) / cols, ch = 84, y0 = 48;
  const cards = P.achievements.map((a, i) => {
    const x = X + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
    const text = wrap(fill(a.text), 24).map((l, j) => `<tspan x="${x + 14}" dy="${j ? 19 : 0}">${esc(l)}</tspan>`).join('');
    return `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${C.crust}" stroke="${a.gold ? C.yellow : C.surface}" stroke-width="2"/>
<text x="${x + 14}" y="${y + 24}" class="px" style="font-size:9px;fill:${C.yellow}">${esc(fill(a.title))}</text>
<text y="${y + 46}" class="vt" style="font-size:19px;fill:${C.sub}">${text}</text>
<text x="${x + cw - 12}" y="${y + 24}" text-anchor="end" class="px" style="font-size:7px;fill:${a.boss ? C.pink : C.green}">${esc(a.state)}</text>`;
  }).join('\n');
  const rows = Math.ceil(P.achievements.length / cols);
  return frame(y0 + rows * (ch + gap) + 8, prompt(30, './arcade --achievements') + cards, { arcade: true, label: 'Achievements: ' + P.achievements.map(a => `${fill(a.title)} - ${fill(a.text)}`).join(', ') });
}

function stack(stats) {
  const y0 = 56, lh = 22;
  const tree = [`<text x="${X}" y="${y0}" class="b" style="fill:${C.blue}">~/stack</text>`,
    ...P.stack.map(([dir, items], i) => `<text x="${X}" y="${y0 + (i + 1) * lh}" xml:space="preserve"><tspan fill="${C.surface}">${i === P.stack.length - 1 ? '└──' : '├──'} </tspan><tspan fill="${C.blue}" class="b">${esc((dir + '/').padEnd(8))}</tspan>${esc(items)}</text>`)].join('\n');
  const total = stats.langs.reduce((n, [, c]) => n + c, 0);
  const palette = [C.blue, C.yellow, C.green, C.mauve, C.pink, C.peach, C.sky];
  const shown = stats.langs.slice(0, palette.length);
  const rest = total - shown.reduce((n, [, c]) => n + c, 0);
  const parts = [...shown.map(([n, c], i) => [n, c, palette[i]]), ...(rest ? [[`${stats.langs.length - shown.length} more`, rest, C.surface]] : [])];
  const by = y0 + (P.stack.length + 1) * lh + 4;
  let x = X;
  const bar = parts.map(([, c, col]) => { const w = (W - 2 * X) * c / total; const r = `<rect x="${x}" y="${by}" width="${w}" height="10" fill="${col}"/>`; x += w; return r; }).join('');
  let lx = X, ly = by + 32;
  const legend = parts.map(([n, c, col]) => {
    const label = `${n} ${Math.round(c / total * 100)}%`, w = 16 + label.length * 7.2 + 18;
    if (lx + w > W - X) { lx = X; ly += 20; }
    const out = `<rect x="${lx}" y="${ly - 9}" width="9" height="9" fill="${col}"/><text x="${lx + 16}" y="${ly}" style="font-size:12px;fill:${C.sub}">${esc(label)}</text>`;
    lx += w; return out;
  }).join('');
  return frame(ly + 18, prompt(30, 'tree ~/stack') + tree + `<clipPath id="lb"><rect x="${X}" y="${by}" width="${W - 2 * X}" height="10" rx="2"/></clipPath><g clip-path="url(#lb)">${bar}</g>` + legend,
    { label: 'Stack: ' + P.stack.map(([d, i]) => `${d}: ${i}`).join('; ') + '. Languages: ' + parts.map(([n, c]) => `${n} ${Math.round(c / total * 100)}%`).join(', ') });
}

function snake(stats) {
  const y0 = 50, gw = W - 2 * X;
  let grid, gh;
  if (fs.existsSync('dist/snake.svg')) {
    const src = fs.readFileSync('dist/snake.svg', 'utf8');
    const [, , , vw, vh] = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(src).map(Number);
    gh = gw * vh / vw;
    grid = src.replace(/^[\s\S]*?<svg\b([^>]*)>/, (_, attrs) => `<svg x="${X}" y="${y0}" width="${gw}" height="${gh}" viewBox="${/viewBox="([^"]+)"/.exec(attrs)[1]}">`);
  } else {
    // fallback without snk: static grid from the contribution calendar
    const weeks = stats.days.slice(-53), cell = (gw - 52 * 3) / 53, max = Math.max(...stats.days.flat(), 1);
    const shades = ['#262637', '#3b5a3a', '#55834f', '#7fb878', C.green];
    grid = weeks.map((w, x) => w.map((n, y) => `<rect x="${X + x * (cell + 3)}" y="${y0 + y * (cell + 3)}" width="${cell}" height="${cell}" fill="${shades[n ? Math.min(4, 1 + Math.floor(n / max * 4)) : 0]}"/>`).join('')).join('');
    gh = 7 * (cell + 3);
  }
  const cy = y0 + gh + 22;
  const cap = `<text x="${X}" y="${cy}" class="px" style="font-size:9px;fill:${C.overlay}">LVL ${new Date().getFullYear()}</text><text x="${W - X}" y="${cy}" text-anchor="end" class="px" style="font-size:9px;fill:${C.overlay}"><tspan fill="${C.green}">${stats.contributions}</tspan> PELLETS EATEN</text>`;
  return frame(cy + 18, prompt(30, 'snake --eat contributions') + grid + cap, { arcade: true, label: `Snake eating ${stats.contributions} contributions of the last year` });
}

function activity(commits) {
  const y0 = 58, lh = 22, maxChars = Math.floor((W - 2 * X) / CW);
  const rows = commits.map((c, i) => {
    const fixed = `${c.sha} ${c.date}  (${c.repo})`.length;
    const msg = c.msg.length > maxChars - fixed ? c.msg.slice(0, maxChars - fixed - 1) + '…' : c.msg;
    return `<text x="${X}" y="${y0 + i * lh}" xml:space="preserve"><tspan fill="${C.yellow}">${c.sha}</tspan> <tspan fill="${C.overlay}">${c.date}</tspan> ${esc(msg)} <tspan fill="${C.sky}">(${esc(c.repo)})</tspan></text>`;
  }).join('\n');
  return frame(y0 + commits.length * lh + 2, prompt(30, 'git log --all --oneline -5') + rows, { label: 'Recent commits: ' + commits.map(c => `${c.repo}: ${c.msg}`).join('; ') });
}

function contact() {
  const y0 = 58, lh = 22;
  const rows = P.contact.map(([k, v], i) => `<text x="${X}" y="${y0 + i * lh}" xml:space="preserve"><tspan fill="${C.mauve}" class="b">${esc(k.padEnd(9))}</tspan><tspan fill="${C.sky}">${esc(v)}</tspan></text>`).join('\n');
  const py = y0 + P.contact.length * lh + 14;
  const cursor = `<rect x="${X + promptWidth}" y="${py - 12}" width="${CW}" height="16" fill="${C.text}">${blink}</rect>`;
  return frame(py + 18, prompt(30, 'cat contact.txt') + rows + prompt(py, '', cursor), { label: 'Contact: ' + P.contact.map(([k, v]) => `${k} ${v}`).join(', ') });
}

// ---------- write ----------
const stats = await fetchStats();
const counts = await Promise.all(P.scores.map(s => commitCount(s.repo)));
const commits = await recentCommits(5);

const blocks = {
  header: header(stats), now: now(), top: top(stats), scores: scores(stats, counts),
  achievements: achievements(stats), stack: stack(stats), snake: snake(stats), activity: activity(commits), contact: contact(),
};
fs.mkdirSync('assets/terminal', { recursive: true });
for (const [name, svg] of Object.entries(blocks)) fs.writeFileSync(`assets/terminal/${name}.svg`, svg);

const alts = Object.fromEntries(Object.entries(blocks).map(([n, svg]) => [n, /aria-label="([^"]*)"/.exec(svg)[1]]));
const img = n => `<img src="./assets/terminal/${n}.svg" width="100%" alt="${alts[n]}" />`;
const links = P.contact.map(([, v, href]) => `<a href="${href}">${esc(v)}</a>`).join(' · ');
fs.writeFileSync('README.md', `<!-- Generated by scripts/build.mjs from profile.json. Edit profile.json, not this file. -->
<div align="center">

${Object.keys(blocks).map(img).join('\n')}

${links}

</div>
`);
console.log('built', Object.keys(blocks).join(', '), `| ${stats.contributions} contributions, ${stats.repos} repos, ${stats.langs.length} languages`);
