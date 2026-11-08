// azuna board. no dependencies, one file.
const $ = (id) => document.getElementById(id);
const fmt = (n) => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const rate = (b) => b >= 1048576 ? (b/1048576).toFixed(1)+'M/s' : b >= 1024 ? (b/1024).toFixed(0)+'k/s' : b+'B/s';
const bytes = (b) => b >= 1e12 ? (b/1e12).toFixed(1)+'T' : b >= 1e9 ? (b/1e9).toFixed(0)+'G' : (b/1e6).toFixed(0)+'M';

const LINES = [
  "nothing is on fire, which is the whole job",
  "the printer is unplugged. this is on purpose. probably.",
  "someone visited the server today. it was you.",
  "every hour you don't break prod is an hour well spent",
  "there is a fan curve in here somewhere that hates you",
  "the vault has 480 notes and zero duplicates. allegedly.",
];

function clock() {
  const n = new Date();
  $('clock').textContent = n.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
  $('date').textContent = n.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
}

function spark(vals, w, h, color, fill) {
  if (!vals.length) return '';
  const max = Math.max(...vals, 1);
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    ${fill ? `<path d="${area}" fill="${color}" opacity=".10"/>` : ''}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}

function bars(vals, w, h, color) {
  if (!vals.length) return '';
  const max = Math.max(...vals, 1);
  const bw = w / vals.length * 0.62, gap = w / vals.length;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">` +
    vals.map((v, i) => {
      const bh = Math.max(1.5, (v / max) * (h - 2));
      return `<rect x="${(i*gap + (gap-bw)/2).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${color}" opacity="${0.35 + 0.65*(v/max)}"/>`;
    }).join('') + `</svg>`;
}

function weather(d) {
  const w = d && d.weather;
  const codes = {0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'fog',48:'freezing fog',
    51:'drizzle',53:'drizzle',55:'heavy drizzle',61:'light rain',63:'rain',65:'heavy rain',
    71:'light snow',73:'snow',75:'heavy snow',80:'showers',81:'showers',82:'violent showers',
    95:'thunderstorm',96:'thunderstorm with hail'};
  if (!w) {
    $('wx').innerHTML = '<span class="wx-desc">weather unavailable</span>';
    $('verdict').textContent = '';
    $('sunline').textContent = '';
    return;
  }
  $('wx').innerHTML = `<span class="wx-temp">${w.temp}&deg;</span><span class="wx-desc">${codes[w.code]||''} &middot; wind ${w.wind} mph &middot; rain ${w.pop}%</span>`;
  const good = w.temp >= 45 && w.pop <= 40 && w.wind <= 22;
  const v = $('verdict');
  v.textContent = good ? 'riding weather. go before it changes its mind.'
    : (w.pop > 60 ? 'wet. the bike stays in.' : 'marginal. you have ridden worse.');
  v.className = 'verdict ' + (good ? 'good' : 'no');
  if (w.sunset) $('sunline').textContent = 'sunset ' + new Date(w.sunset).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

function render(d) {
  weather(d);
  // traffic
  const t = d.traffic || {};
  $('t-today').textContent = fmt(t.today || 0);
  $('t-hour').textContent = fmt(t.last_hour || 0);
  $('t-e4').textContent = fmt(t.e4 || 0);
  $('t-e5').textContent = fmt(t.e5 || 0);
  $('t-chart').innerHTML = spark((t.hourly || []).slice(new Date().getHours() - 11), 300, 64, '#5ac8d2', true);
  $('t-paths').innerHTML = (t.top || []).map(p => `<li><span>${p.path}</span><b>${fmt(p.n)}</b></li>`).join('') || '<li class="muted">no hits yet today</li>';

  // server
  const h = d.host || {};
  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  const bar = (id, label, value, text, hotAt) => {
    const el = $(id);
    if (!el) return;
    el.style.width = Math.min(100, value).toFixed(1) + '%';
    el.className = value >= hotAt ? 'hot' : '';
    if (label) $(label).textContent = text;
  };
  bar('s-cpu', 's-cpulbl', h.cpu_pct ?? 0, h.cpu_pct != null ? h.cpu_pct + '%' : '—', 85);
  bar('s-mem', 's-memlbl', pct(h.mem_used, h.mem_total), Math.round(pct(h.mem_used, h.mem_total)) + '%', 90);
  bar('s-disk', 's-disklbl', pct(h.disk_used, h.disk_total), bytes(h.disk_used) + '/' + bytes(h.disk_total), 85);
  if (h.swap_total) {
    bar('s-swap', 's-swaplbl', pct(h.swap_used, h.swap_total), bytes(h.swap_used) + '/' + bytes(h.swap_total), 50);
  } else {
    $('s-swap').style.width = '0%';
    $('s-swaplbl').textContent = 'none';
  }
  $('s-load').textContent = h.load ?? '-';
  $('s-temp').innerHTML = h.temp_c ? h.temp_c + '&deg;' : '&mdash;';
  $('s-up').textContent = h.uptime_days ? 'up ' + h.uptime_days + 'd' : '';
  const dk = d.docker || {};
  $('s-docker').textContent = (dk.running || 0) + '/' + (dk.total || 0);
  $('s-net').innerHTML = (h.net_in != null)
    ? `${rate(h.net_in)}<small>in</small> <span class="sep">/</span> ${rate(h.net_out)}<small>out</small>`
    : '&mdash;';
  const hot = d.hot || [];
  $('s-hot').innerHTML = hot.length
    ? hot.map(c => `<li><span>${c.name}</span><b>${c.cpu}% cpu</b></li>`).join('')
    : '';
  $('s-down').innerHTML = (dk.down || []).slice(0, 3).map(n => `<li><span>${n}</span><b class="bad">down</b></li>`).join('');

  // tokens
  const k = d.tokens || {days:[]};
  const days = k.days || [];
  $('k-in').textContent = fmt(k.today_in || 0);
  $('k-out').textContent = fmt(k.today_out || 0);
  $('k-cost').textContent = '$' + (k.today_cost || 0).toFixed(2);
  $('k-calls').textContent = fmt(k.today_calls || 0);
  $('k-chart').innerHTML = bars(days.map(x => x.in + x.out), 340, 92, '#c8a06a');

  // carousel (vault, plan, token history, location)
  hydrateCarousel(d);

  // printer
  const p = d.printer;
  if (!p) {
    $('pr-state').textContent = 'offline';
    $('pr-body').className = 'muted';
    $('pr-body').textContent = 'moonraker is not answering, which tracks.';
  } else {
    const idle = (p.progress || 0) === 0 && !p.file;
    if (idle) {
      $('pr-state').textContent = 'idle';
      $('pr-body').className = 'muted';
      $('pr-body').textContent = p.state === 'standby'
        ? 'unplugged for upgrades. moonraker is up, the printer is not.'
        : 'connected, nothing printing.';
      return;
    }
    $('pr-state').textContent = p.state;
    $('pr-body').className = '';
    $('pr-body').innerHTML = `
      <div class="bignum">${p.progress ?? 0}<small>percent</small></div>
      <div class="muted" style="font-size:.75rem">${p.file || 'no job'}</div>
      <div class="row2">
        <div><b>${p.hotend ? Math.round(p.hotend) : '—'}&deg;</b><small>hotend</small></div>
        <div><b>${p.bed ? Math.round(p.bed) : '—'}&deg;</b><small>bed</small></div>
      </div>`;
  }

  $('az-stamp').textContent = 'updated ' + new Date(d.generated).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
}

async function brief_() {
  try {
    const r = await fetch('data/brief.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function plan_() {
  try {
    const r = await fetch('data/plan.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function location_() {
  try {
    const r = await fetch('data/location.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

let carouselSlides = [], carouselAt = 0;

async function hydrateCarousel(d) {
  const [plan, loc] = await Promise.all([plan_(), location_()]);
  renderCarousel({ notes: d.notes || {}, plan, tokens: d.tokens || {}, loc });
}

function slideVault(b) {
  const n = b.notes || {};
  const days = n.days_since_note != null ? Math.floor(n.days_since_note) : null;
  const focus = (n.focus || []).map(f => `<li>${f}</li>`).join('');
  const recent = (n.recent || []).map(r => `<li>${r}</li>`).join('');
  return `
    <div class="streak"><b>${days != null ? days : '&mdash;'}</b><small>days since a journal entry</small></div>
    <ul class="focus">${focus || '<li class="muted">no quarter goals set</li>'}</ul>
    <h3>recently, by me</h3>
    <ul class="recent">${recent || '<li class="muted">nothing logged</li>'}</ul>`;
}

function slidePlan(b) {
  const p = b.plan || {};
  if (!p.active) return '<p class="muted" style="font-size:1.05rem">nothing active on the project page</p>';
  const a = p.active;
  const tasks = (a.tasks || []).slice(0, 3).map(t => `<li>${t}</li>`).join('');
  const next = (p.next || []).slice(0, 3).map(t => `<li>${t}</li>`).join('');
  return `
    <h3>the one thing</h3>
    <p class="big">${a.title}</p>
    <ul class="focus">${tasks || '<li class="muted">no next action written down</li>'}</ul>
    ${next ? `<h3>then</h3><ul class="recent">${next}</ul>` : ''}`;
}

function slideTokens(b) {
  const days = ((b.tokens || {}).days || []).slice(-14);
  if (!days.length) return '<p class="muted">no token history yet</p>';
  const max = Math.max(...days.map(d => d.cost || 0), 0.01);
  const bars = days.map(d => {
    const hgt = Math.max(2, Math.round(((d.cost || 0) / max) * 100));
    return `<i style="height:${hgt}%" title="${d.d}: $${(d.cost || 0).toFixed(2)}"></i>`;
  }).join('');
  const total = days.reduce((s, d) => s + (d.cost || 0), 0);
  return `
    <div class="bignum">$${total.toFixed(2)}<small>last 14 days</small></div>
    <div class="bars">${bars}</div>
    <div class="axis"><span>${days[0].d}</span><span>${days[days.length-1].d}</span></div>`;
}

function slideLocation(b) {
  const l = b.loc || {};
  if (!l.place) return '<p class="muted">no location feed yet<br><span class="tiny">dawarich when it is running</span></p>';
  return `
    <h3>you are at</h3>
    <p class="big">${l.place}</p>
    <p class="muted">${l.since ? 'since ' + l.since : ''}</p>`;
}

function renderCarousel(b) {
  const el = $('slide'), lab = $('c-label'), sub = $('c-sub'), dots = $('dots');
  if (!el) return;
  carouselSlides = [
    { label: 'vault', sub: 'streak and focus', html: slideVault(b) },
    { label: 'plan', sub: 'one thing at a time', html: slidePlan(b) },
    { label: 'tokens', sub: 'spend', html: slideTokens(b) },
    { label: 'location', sub: 'live', html: slideLocation(b) },
  ].filter(s => s.html);
  const show = (i) => {
    const s = carouselSlides[i % carouselSlides.length];
    el.classList.add('fade');
    setTimeout(() => {
      el.innerHTML = s.html;
      lab.textContent = s.label;
      sub.textContent = s.sub || '';
      dots.innerHTML = carouselSlides.map((_, k) => `<i class="${k === i % carouselSlides.length ? 'on' : ''}"></i>`).join('');
      el.classList.remove('fade');
    }, 260);
  };
  if (!carouselSlides.length) return;
  if (!window.__carouselTimer) {
    show(0);
    window.__carouselTimer = setInterval(() => { carouselAt = (carouselAt + 1) % carouselSlides.length; show(carouselAt); }, 12000);
  } else {
    show(carouselAt);
  }
}

function renderBrief(b) {
  const el = $('brief');
  if (!el) return;
  const text = b && b.text ? b.text.trim() : '';
  if (!text) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<span class="dot"></span><p>${text}</p>`;
}

async function calendar_() {
  try {
    const r = await fetch('data/calendar.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

function whenLabel(iso) {
  const d = new Date(iso), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tmrw = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
  if (sameDay) return 'today ' + time;
  if (tmrw) return 'tmrw ' + time;
  return d.toLocaleDateString(undefined, {weekday:'short'}) + ' ' + time;
}

function renderCalendar(cal) {
  const el = $('up-next');
  if (!el) return;
  const evs = (cal && cal.events) ? cal.events.slice(0, 3) : [];
  if (!evs.length) { el.innerHTML = ''; return; }
  el.innerHTML = evs.map(e =>
    `<li><span class="when">${whenLabel(e.start)}</span><span class="what">${e.summary}</span></li>`
  ).join('');
}

async function tokens_() {
  try {
    const r = await fetch('data/tokens.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function pull() {
  try {
    const r = await fetch('board.json?t=' + Date.now(), {cache:'no-store'});
    const d = await r.json();
    const t = await tokens_();
    if (t) d.tokens = t;
    render(d);
    renderCalendar(await calendar_());
    renderBrief(await brief_());
  } catch (e) {
    $('az-line').textContent = 'collector has not run yet';
  }
}

$('az-line').textContent = LINES[Math.floor(Math.random()*LINES.length)];
clock();
setInterval(clock, 1000);
pull();
setInterval(pull, 30000);
