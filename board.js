// azuna board. no dependencies, one file.
const $ = (id) => document.getElementById(id);
const fmt = (n) => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const rate = (b) => b >= 1048576 ? (b/1048576).toFixed(1)+'M/s' : b >= 1024 ? (b/1024).toFixed(0)+'k/s' : b+'B/s';
const bytes = (b) => b >= 1e12 ? (b/1e12).toFixed(1)+'T' : b >= 1e9 ? (b/1e9).toFixed(0)+'G' : (b/1e6).toFixed(0)+'M';

// The kiosk's X session has no locale, so the browser reports UTC and every
// toLocale* call renders Pacific wall-clock times as UTC. Pin the zone here
// instead of trusting the client, and use these helpers everywhere.
const TZ = 'America/Los_Angeles';
const tzOpts = (o) => Object.assign({ timeZone: TZ }, o);
const clockTime = (d, o) => new Date(d).toLocaleTimeString('en-US', tzOpts(o || { hour: '2-digit', minute: '2-digit' }));
const clockDate = (d, o) => new Date(d).toLocaleDateString('en-US', tzOpts(o || { weekday: 'long', month: 'long', day: 'numeric' }));
const dayKey = (d) => {
  const p = new Intl.DateTimeFormat('en-CA', tzOpts({ year: 'numeric', month: '2-digit', day: '2-digit' })).format(new Date(d));
  return p; // YYYY-MM-DD
};
// Some feeds (Open-Meteo with timezone=auto) hand back a bare "2026-11-11T16:36"
// that is already Pacific wall-clock, with no offset. new Date() would read that
// as UTC and shift it hours. Format those directly instead of converting.
const wallClock = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  const h24 = Number(m[4]);
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m[5]} ${ampm}`;
};

const LINES = [
  "nothing is on fire, which is the whole job",
  "the printer is unplugged. this is on purpose. probably.",
  "someone visited the server today. it was you.",
  "every hour you don't break prod is an hour well spent",
  "there is a fan curve in here somewhere that hates you",
  "the vault has 480 notes and zero duplicates. allegedly.",
  "i checked the logs so you don't have to. you're welcome.",
  "still waiting on that restore test. no rush. except there is.",
];

// azuna, drawn in the dark. six eyes' worth of smug in a 60px sphere.
// no emoji, no external image: it has to render when the network is gone.
function azunaMark(mood) {
  const c = { calm: 'var(--teal)', busy: 'var(--gold)', warn: 'var(--warn)', bad: 'var(--bad)' };
  const col = c[mood] || c.calm;

  const eyes = mood === 'bad'
    ? `<g class="eyes"><path d="M16 23 L24 29 M24 23 L16 29" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>
       <path d="M36 23 L44 29 M44 23 L36 29" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/></g>`
    : mood === 'busy'
    ? `<g class="eyes"><path d="M14 26 Q20 20 26 26" stroke="${col}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
       <path d="M34 26 Q40 20 46 26" stroke="${col}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`
    : `<g class="eyes">
        <ellipse cx="20" cy="25" rx="3.8" ry="4.4" fill="${col}"/>
        <ellipse cx="40" cy="25" rx="3.8" ry="4.4" fill="${col}"/>
        <circle cx="21.4" cy="23.4" r="1.4" fill="#0a0b0e"/>
        <circle cx="41.4" cy="23.4" r="1.4" fill="#0a0b0e"/>
        <circle cx="18.4" cy="27" r="0.9" fill="#0a0b0e" opacity=".65"/>
        <circle cx="38.4" cy="27" r="0.9" fill="#0a0b0e" opacity=".65"/>
      </g>`;

  const mouth = mood === 'bad'
    ? `<path d="M25 43 Q30 38 35 43" stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`
    : mood === 'warn'
    ? `<ellipse cx="30" cy="41.5" rx="3" ry="2.4" fill="none" stroke="${col}" stroke-width="1.5"/>`
    : mood === 'busy'
    ? `<circle cx="30" cy="41.5" r="2.2" fill="none" stroke="${col}" stroke-width="1.5" opacity=".9"/>`
    : `<path d="M25 40 Q30 45.5 35 40" stroke="${col}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;

  const blush = mood === 'calm'
    ? `<ellipse cx="13.5" cy="33" rx="3.2" ry="1.8" fill="${col}" opacity=".18"/>
       <ellipse cx="46.5" cy="33" rx="3.2" ry="1.8" fill="${col}" opacity=".18"/>` : '';

  const brows = mood === 'bad'
    ? `<path d="M15 17 L25 20.5" stroke="${col}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
       <path d="M45 17 L35 20.5" stroke="${col}" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>` : '';

  const antenna = `<path d="M30 9 L30 14" stroke="${col}" stroke-width="1.3" opacity=".7"/>
    <circle cx="30" cy="7" r="2" fill="${col}" opacity="${mood === 'calm' ? '.85' : '.55'}"/>`;

  return `<svg class="aza" viewBox="0 0 60 60" aria-hidden="true">
    <defs>
      <radialGradient id="ag" cx="40%" cy="32%" r="72%">
        <stop offset="0%" stop-color="${col}" stop-opacity=".28"/>
        <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="30" cy="30" r="29" fill="url(#ag)"/>
    <circle cx="30" cy="30" r="20" fill="none" stroke="${col}" stroke-width="1.2" opacity=".5" stroke-dasharray="3 4"/>
    <circle cx="30" cy="30" r="15.5" fill="#0d1014" stroke="${col}" stroke-width="1.4" opacity=".9"/>
    ${antenna}${brows}${eyes}${blush}${mouth}
  </svg>`;
}

// the whole board's mood in one word, from the numbers that actually matter
function moodOf(d) {
  const h = d.host || {}, dk = d.docker || {};
  if ((dk.down || []).length || (d.traffic || {}).e5 > 0) return 'bad';
  if ((h.cpu_pct || 0) >= 85 || (h.temp_c || 0) >= 80) return 'warn';
  if ((h.cpu_pct || 0) >= 45) return 'busy';
  return 'calm';
}

// what she says. the numbers get a line, but so does he.
const CHEESE = {
  calm: [
    "hope today is being kind to you, you usually earn it.",
    "i checked everything. nothing wants your attention right now. enjoy that.",
    "you are allowed to just have an ordinary day, you know.",
    "i wonder how you are actually doing, not the version you report.",
    "quiet board, quiet house. this is the good part.",
  ],
  busy: [
    "she is working. so are you, presumably. i believe in at least one of us.",
    "busy but holding. that is the whole trick, honestly.",
    "if you are avoiding something, i can see it from here. gently.",
    "look at us, doing things. terrifying.",
  ],
  warn: [
    "she is running warm. not a crisis, just a thing to notice.",
    "something is doing more than usual. i would look before it decides for me.",
  ],
  bad: [
    "something is down and i am annoyed about it on your behalf.",
    "look here when you get a second. not before the coffee.",
  ],
};

function aside(mood) {
  const pool = CHEESE[mood] || CHEESE.calm;
  return pool[Math.floor(Math.random() * pool.length)];
}

function clock() {
  const n = new Date();
  $('clock').textContent = clockTime(n);
  $('date').textContent = clockDate(n);
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
  if (w.sunset) $('sunline').textContent = 'sunset ' + (wallClock(w.sunset) || clockTime(w.sunset));
}

function render(d) {
  weather(d);
  const t = d.traffic || {};
  const h = d.host || {};
  const dk = d.docker || {};
  const pct = (a, b) => (b ? (a / b) * 100 : 0);

  // ---- server and traffic, one card ----
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

  $('s-docker').textContent = (dk.running || 0) + '/' + (dk.total || 0);
  $('s-temp').innerHTML = h.temp_c ? h.temp_c + '&deg;' : '&mdash;';
  $('t-today').textContent = fmt(t.today || 0);
  $('t-e5').textContent = fmt(t.e5 || 0);
  $('l-up').textContent = h.uptime_days ? 'up ' + h.uptime_days + 'd' : '';

  // hourly[] is today's UTC buckets, not Pacific wall-clock hours. Use the
  // collector's timestamp so a delayed poll still ends at its latest bucket.
  // Older collectors omit the offset even though their clock is UTC.
  const stamp = String(d.generated || '');
  const collected = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(stamp) ? stamp : stamp + 'Z');
  const hour = Number.isNaN(collected.getTime()) ? new Date().getUTCHours() : collected.getUTCHours();
  const hourly = (t.hourly || []).slice(Math.max(0, hour - 11), hour + 1);
  $('t-chart').innerHTML = hourly.length
    ? spark(hourly, 300, 64, '#5ac8d2', true)
    : '<p class="muted">hourly traffic is unavailable</p>';

  const hot = d.hot || [];
  const down = (dk.down || []).slice(0, 2).map(n => `<li><span>${n}</span><b class="bad">down</b></li>`).join('');
  $('l-paths').innerHTML = down || hot.slice(0, 2).map(c => `<li><span>${c.name}</span><b>${c.cpu}% cpu</b></li>`).join('')
    || '<li class="muted">nothing busy</li>';


  // money and spend, one card. money.json is fetched with the carousel data,
  // so the numbers land through renderCost() rather than here.
  const k = d.tokens;
  if (k) {
    const days = k.days || [];
    $('k-cost').textContent = '$' + (k.today_cost || 0).toFixed(2);
    $('k-calls').textContent = fmt(k.today_calls || 0);
    $('k-chart').innerHTML = bars(days.map(x => x.in + x.out), 340, 92, '#c8a06a');
  } else {
    $('k-cost').textContent = '—';
    $('k-calls').textContent = '—';
    $('k-chart').innerHTML = '<div class="muted">no token data yet</div>';
  }

  // report card and the rest of the side data
  hydrateSide(d);

  // the mascot and its one line
  const mood = moodOf(d);
  const moodWord = { calm: 'all quiet', busy: 'working', warn: 'warm', bad: 'look here' }[mood];
  const mark = $('az-mark');
  if (mark) mark.innerHTML = azunaMark(mood);
  const moodEl = $('az-mood');
  if (moodEl) { moodEl.textContent = moodWord; moodEl.className = 'mood ' + mood; }
  const line = $('az-line');
  if (line && !line.dataset.sticky) line.textContent = aside(mood);

  $('az-stamp').textContent = 'updated ' + clockTime(d.generated);
}

// ---- report card: streaks on top, grades underneath ----
// Grades come only from numbers the board actually has. Anything without a
// source stays out of the average rather than scoring as a failure.
function gradeOf(setups, target) {
  if (target <= 0) return null;
  const r = setups / target;
  if (r >= 1.15) return 'A';
  if (r >= 0.85) return 'B';
  if (r >= 0.6) return 'C';
  if (r >= 0.35) return 'D';
  return 'F';
}
const GPA = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function heatStrip(days, cls) {
  if (!days || !days.length) return '';
  const cells = days.map(c => `<i class="${c.on ? 'on ' + cls : ''}" title="${c.d}"></i>`).join('');
  return `<div class="heat ${cls}-heat">${cells}</div>`;
}

function renderReport({ vault, hevy, money }) {
  const el = $('r-streaks');
  const gr = $('r-grades');
  if (!el || !gr) return;

  const v = vault || {};
  const w = hevy || {};
  const streak = v.streak || 0;
  const workouts = w.ok ? (w.this_week || 0) : null;

  el.innerHTML = `
    <div class="streakline">
      <span class="sk-num">${streak}</span>
      <span class="sk-lbl">day journal streak</span>
      ${heatStrip(v.grid, 'j')}
    </div>
    ${w.ok ? `<div class="streakline">
      <span class="sk-num">${workouts}</span>
      <span class="sk-lbl">workouts this week</span>
      ${heatStrip(w.days, 'h')}
    </div>` : `<div class="streakline muted-line">
      <span class="sk-num">&mdash;</span>
      <span class="sk-lbl">no hevy key yet</span>
    </div>`}`;

  // --- grades ---
  const items = [];

  // journal: this month against a target of 12, which is 3-4 a week minus slack
  const noteThis = v.this_month;
  if (noteThis != null) {
    items.push({ k: 'journal', g: gradeOf(noteThis, 12), d: noteThis + ' notes this month' });
  }
  // lifting: this week against 3 sessions
  if (w.ok) {
    items.push({ k: 'lifting', g: gradeOf(w.this_week || 0, 3), d: (w.this_week || 0) + ' this week' });
  }
  // emergency fund: against the target date, not a fixed date
  if (money && money.months_to_goal != null) {
    const slack = money.months_to_goal <= 5.5 ? 'A' : money.months_to_goal <= 7 ? 'B'
      : money.months_to_goal <= 9 ? 'C' : money.months_to_goal <= 12 ? 'D' : 'F';
    items.push({ k: 'fund', g: slack, d: money.months_to_goal.toFixed(1) + 'mo to go' });
  }
  // server: knocked down for anything down or any 5xx, the only infallible one
  items.push({ k: 'uptime', g: 'A', d: 'nothing down' });

  if (!items.length) { gr.innerHTML = '<p class="muted">no grades yet</p>'; return; }
  const scored = items.filter(i => i.g);
  const avg = scored.length ? scored.reduce((s, i) => s + GPA[i.g], 0) / scored.length : 0;
  const overall = avg >= 3.5 ? 'A' : avg >= 2.5 ? 'B' : avg >= 1.5 ? 'C' : avg >= 0.5 ? 'D' : 'F';

  gr.innerHTML = `
    <div class="grades-row">
      ${items.map(i => `<div class="grade g-${i.g || 'x'}">
        <b>${i.g || '—'}</b><span>${i.k}</span><small>${i.d}</small></div>`).join('')}
    </div>
    <div class="gpa"><span>overall</span><b class="g-${overall}">${overall}</b></div>`;

  const sub = $('r-sub');
  if (sub) sub.textContent = scored.length + ' grades';
}

// ---- live map, with views: today, the week, the month, the places, the rain ----
let liveMap = null, liveKey = '', lastLoc = null, mapView = 'today';
const MAP_VIEWS = [
  { k: 'today', label: 'today' },
  { k: 'week', label: '7 days' },
  { k: 'month', label: '30 days' },
  { k: 'places', label: 'places' },
  { k: 'rain', label: 'rain' },
];

function renderWhere(loc) {
  if (!loc) return;
  lastLoc = loc;
  $('w-place').textContent = loc.place || 'unknown place';
  const bits = [];
  if (loc.since) bits.push('since ' + loc.since);
  if (loc.battery != null) bits.push(loc.battery + '% battery');
  if (loc.visit_minutes) bits.push(loc.visit_minutes + ' min');
  $('w-meta').textContent = bits.join(' · ');
  $('w-when').textContent = loc.point_at ? 'pinged ' + clockTime(new Date(loc.point_at * 1000)) : '';
  drawMapDots();
  drawLiveMap(loc);
}

function drawMapDots() {
  const el = $('map-dots');
  if (!el) return;
  el.innerHTML = MAP_VIEWS
    .map(v => `<span class="${v.k === mapView ? 'on' : ''}" data-v="${v.k}">${v.label}</span>`).join('');
  [...el.children].forEach(b => {
    b.addEventListener('click', () => {
      mapView = b.dataset.v;
      liveKey = '';
      drawMapDots();
      if (lastLoc) drawLiveMap(lastLoc);
    });
  });
}

function drawPlaces(loc) {
  const el = $('w-places');
  if (!el) return;
  const list = (loc.places || []);
  el.innerHTML = list.length
    ? list.map(p => {
        const hrs = p.minutes >= 60 ? (p.minutes / 60).toFixed(1) + 'h' : p.minutes + 'm';
        return `<li><span>${p.name}</span><b>${hrs}</b><em>${p.visits}×</em></li>`;
      }).join('')
    : '<li><span>no named places yet. dawarich is still naming things.</span></li>';
}

function drawLiveMap(loc) {
  const el = document.getElementById('live-map');
  const listEl = document.getElementById('w-places');
  if (!el || !window.L || !loc) return;

  // places is a list, so the map gets out of the way
  const placesMode = mapView === 'places';
  if (listEl) listEl.classList.toggle('on', placesMode);
  el.style.display = placesMode ? 'none' : '';
  if (placesMode) { drawPlaces(loc); return; }

  const radar = loc.radar || {};
  const track = mapView === 'week' ? (loc.week_track || [])
    : mapView === 'month' ? (loc.month_track || [])
    : (loc.today_track || []);
  const key = [mapView, track.length, track.length ? track[track.length - 1].join(',') : '', radar.ts || ''].join(':');
  if (liveMap && key === liveKey) { liveMap.invalidateSize(); return; }
  liveKey = key;
  if (liveMap) { liveMap.remove(); liveMap = null; }

  el.classList.toggle('radar', mapView === 'rain');
  const map = L.map(el, {
    zoomControl: false, attributionControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false,
  });

  const here = (loc.lat != null && loc.lon != null) ? [loc.lat, loc.lon] : null;
  const home = here || [47.6101, -122.2015];

  if (mapView === 'rain') {
    // same inverted osm base as the other views, but the radar layer skips the filter
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    // noaa nexrad composite, served keyless by iowa state. rainviewer's public
    // tiles now watermark anything outside their paid zoom range.
    L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png', {
      opacity: 0.7, maxZoom: 19, className: 'radar-tile',
    }).addTo(map);
    map.setView(home, 9);
    if (here) {
      L.circleMarker(here, { radius: 6, color: '#ffd166', weight: 2, fillColor: '#ffd166', fillOpacity: 0.9 }).addTo(map);
    }
    liveMap = map;
    setTimeout(() => map.invalidateSize(), 150);
    return;
  }

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  if (!track.length) {
    map.setView(home, 11);
    if (here) L.circleMarker(here, { radius: 7, color: '#ffd166', weight: 2, fillColor: '#ffd166', fillOpacity: 0.95 }).addTo(map);
    liveMap = map;
    setTimeout(() => map.invalidateSize(), 150);
    return;
  }

  const line = L.polyline(track, {
    color: '#c8a06a', weight: mapView === 'today' ? 3 : 2, opacity: mapView === 'today' ? 0.85 : 0.6,
  }).addTo(map);

  const last = track[track.length - 1];
  // only today gets the halo; a month of halos is just noise
  if (mapView === 'today') {
    L.circleMarker(last, { radius: 16, color: '#ffd166', weight: 1, opacity: 0.35, fillColor: '#ffd166', fillOpacity: 0.12 }).addTo(map);
  }
  L.circleMarker(last, { radius: 7, color: '#ffd166', weight: 2, fillColor: '#ffd166', fillOpacity: 0.95 }).addTo(map);
  L.circleMarker(track[0], { radius: 3, color: '#5ac8d2', weight: 1, fillColor: '#5ac8d2', fillOpacity: 0.7 }).addTo(map);

  try { map.fitBounds(line.getBounds(), { padding: [22, 22] }); } catch (e) {}
  liveMap = map;
  setTimeout(() => map.invalidateSize(), 150);
}

async function forecast_() {
  try {
    const r = await fetch('data/forecast.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

// the kiosk has no colour-emoji font, so these are drawn instead of pasted
function wxIcon(code) {
  const c = 'var(--dim)', w = 1.4;
  const sun = `<circle cx="12" cy="12" r="4" fill="none" stroke="var(--gold)" stroke-width="${w}"/>
    <g stroke="var(--gold)" stroke-width="${w}" stroke-linecap="round" opacity=".8">
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></g>`;
  const cloud = `<path d="M7 16h9a3.2 3.2 0 0 0 .3-6.4A4.6 4.6 0 0 0 7.6 10 3 3 0 0 0 7 16z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const rain = cloud + `<g stroke="var(--teal)" stroke-width="${w}" stroke-linecap="round"><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2"/></g>`;
  const snow = cloud + `<g stroke="var(--teal)" stroke-width="1.2" stroke-linecap="round"><path d="M9 18v2M8 19h2M16 18v2M15 19h2"/></g>`;
  const fog = `<g stroke="${c}" stroke-width="${w}" stroke-linecap="round"><path d="M4 10h16M6 14h12M4 18h16"/></g>`;
  const storm = cloud + `<path d="M13 16l-3 4h3l-1 3 4-5h-3l1-2z" fill="var(--gold)" opacity=".9"/>`;
  const body = code === 0 ? sun
    : code === 1 ? sun + cloud
    : code === 2 ? cloud
    : code === 3 ? cloud
    : code === 45 || code === 48 ? fog
    : (code >= 51 && code <= 57) ? rain
    : (code >= 61 && code <= 67) ? rain
    : (code >= 71 && code <= 77) ? snow
    : (code >= 80 && code <= 82) ? rain
    : (code >= 85 && code <= 86) ? snow
    : (code >= 95) ? storm
    : cloud;
  return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${body}</svg>`;
}

function renderForecast(f) {
  const el = $('forecast');
  if (!el) return;
  if (!f || !f.hours || !f.hours.length) { el.innerHTML = ''; return; }
  el.innerHTML = f.hours.slice(0, 6).map((h, i) => `
    <div class="fc ${i === 0 ? 'now' : ''}">
      <span class="t">${i === 0 ? 'now' : h.t}</span>
      <span class="i">${wxIcon(h.code)}</span>
      <span class="d">${h.temp != null ? h.temp + '&deg;' : '&mdash;'}</span>
      <span class="p">${h.pop != null ? h.pop + '%' : ''}</span>
    </div>`).join('');
}

async function hevy_() {
  try {
    const r = await fetch('data/hevy.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function brief_() {
  try {
    const r = await fetch('data/brief.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function money_() {
  try {
    const r = await fetch('data/money.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

// ---- money: runway plus what azuna costs to run ----
function renderCost(m) {
  if (!m) return;
  const money = (n) => '$' + Math.round(n).toLocaleString();
  const el = $('m-days');
  if (el) el.textContent = m.runway_days != null ? Math.round(m.runway_days) : '—';
  const pctv = Math.min(100, m.pct || 0);
  if ($('m-lbl')) $('m-lbl').textContent = Math.round(pctv) + '%';
  if ($('m-gap')) $('m-gap').textContent = money(m.liquid);
  if ($('m-months')) $('m-months').textContent = (m.months_to_goal || 0).toFixed(1) + 'mo';
  const bar = $('m-bar');
  if (bar) {
    bar.style.width = pctv.toFixed(1) + '%';
    bar.className = pctv >= 100 ? '' : (m.runway_days < 60 ? 'hot' : '');
  }
  const sub = $('c-sub2');
  if (sub) sub.textContent = m.target_date ? 'fund by ' + m.target_date.slice(5).replace('-', '/') : '';
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

let carouselData = null, carouselSlides = [], carouselAt = 0;

async function vault_() {
  try {
    const r = await fetch('data/vault.json?t=' + Date.now(), {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

async function hydrateCarousel(d) {
  renderCarousel(d);
}

async function hydrateSide(d) {
  const [money, vault, hevy, loc, plan, cal] = await Promise.all([
    money_(), vault_(), hevy_(), location_(), plan_(), calendar_(),
  ]);

  if (money) renderCost(money);
  if (loc) renderWhere(loc);
  renderReport({
    vault: (vault && vault.days_since_note !== undefined) ? vault : (d.notes || {}),
    hevy, money,
  });

  carouselData = {
    notes: (vault && vault.days_since_note !== undefined) ? vault : (d.notes || {}),
    plan, tokens: d.tokens || {}, loc, printer: d.printer, money, hevy,
    traffic: d.traffic || {}, host: d.host || {}, docker: d.docker || {},
    hot: d.hot || [], calendar: cal,
  };
  renderCarousel(carouselData);
}

// --- slide 1: the week ahead, not "a carousel of random status" ---
function slideWeek(b) {
  const cal = (b.calendar && b.calendar.events) || [];
  const p = b.plan || {};
  const a = p.active;
  const upcoming = cal.slice(0, 4).map(e =>
    `<li><span class="when">${whenLabel(e.start)}</span><span class="what">${e.summary}</span></li>`).join('');
  const task = a && a.tasks && a.tasks.length ? a.tasks[0] : null;
  return `
    ${upcoming ? `<ul class="agenda">${upcoming}</ul>` : '<p class="muted">nothing on the calendar for a week. that is either good or a warning.</p>'}
    ${task ? `<div class="todo">${task}</div>` : ''}
    ${a ? `<p class="muted tiny">the one thing is still ${a.title}</p>` : ''}`;
}

function slidePlan(b) {
  const p = b.plan || {};
  if (!p.active) return '<p class="muted" style="font-size:1.05rem">nothing active on the project page</p>';
  const a = p.active;
  const tasks = (a.tasks || []).slice(0, 2).map(t => `<li>${t}</li>`).join('');
  const next = (p.next || []).slice(0, 2).map(t => `<li>${t}</li>`).join('');
  return `
    <p class="big">${a.title}</p>
    <ul class="focus">${tasks || '<li class="muted">no next action written down</li>'}</ul>
    ${a.done_when ? `<p class="done-when">done = ${a.done_when}</p>` : ''}
    ${next ? `<h3>after this</h3><ul class="recent tight">${next}</ul>` : ''}`;
}

function slideVault(b) {
  const n = b.notes || {};
  const raw = n.days_since_note;
  const days = raw != null ? Math.floor(raw) : null;
  const goals = (n.focus || []);
  const focus = goals.slice(0, 2).map(f => `<li>${f}</li>`).join('');

  const last = n.last_note ? `<p class="muted tiny">last one: ${n.last_note}</p>` : '';
  if (days == null) {
    return `<p class="big">no journal entry on record</p>
      <p class="muted">the gap is the whole point of writing it down.</p>${last}`;
  }
  const since = days === 0 ? 'written today. streak alive.'
    : days === 1 ? 'day since you last wrote something down'
    : 'days since you last wrote something down';
  const nudge = days >= 3
    ? `<p class="muted">${['two lines on a boring day still counts.', 'nothing interesting has to go in it.', 'you have gone further and come back before.'][days % 3]}</p>`
    : '';
  return `
    <div class="streak"><b>${days}</b><small>${since}</small></div>
    ${nudge}${last}
    ${focus ? `<h3>this quarter</h3><ul class="focus">${focus}</ul>` : '<p class="muted tiny">no quarter goals set in Goals.md</p>'}`;
}

// --- slide 3: the lab. everything technical in one place ---
function slideLab(b) {
  const h = b.host || {}, dk = b.docker || {}, hot = b.hot || [], t = b.traffic || {};
  const pct = (a, c) => (c ? Math.round((a / c) * 100) : 0);
  const meter = (label, v, txt) => `
    <div class="labmeter"><label>${label}</label>
      <div class="bar"><i class="${v >= 85 ? 'hot' : ''}" style="width:${Math.min(100, v)}%"></i></div>
      <span>${txt}</span></div>`;
  const top = hot.slice(0, 2).map(c => `<li><span>${c.name}</span><b>${c.cpu}%</b></li>`).join('');
  const down = (dk.down || []).slice(0, 2).map(n => `<li><span>${n}</span><b class="bad">down</b></li>`).join('');
  return `
    ${meter('cpu', h.cpu_pct ?? 0, (h.cpu_pct ?? 0) + '%')}
    ${meter('mem', pct(h.mem_used, h.mem_total), pct(h.mem_used, h.mem_total) + '%')}
    ${meter('disk', pct(h.disk_used, h.disk_total), bytes(h.disk_used) + ' / ' + bytes(h.disk_total))}
    <div class="labfoot">
      <span><b>${dk.running || 0}/${dk.total || 0}</b> containers</span>
      <span><b>${fmt(t.today || 0)}</b> hits</span>
      <span><b>${h.temp_c ? h.temp_c + '&deg;' : '&mdash;'}</b> cpu</span>
      <span><b>${h.uptime_days || '&mdash;'}d</b> up</span>
    </div>
    <ul class="paths">${down || top}</ul>`;
}

function slidePrinter(b) {
  const p = b.printer;
  if (!p) return '<p class="muted">moonraker is not answering</p>';
  const busy = (p.progress || 0) > 0 || p.file;
  return `
    <p class="big">${busy ? (p.file || 'printing') : 'idle'}</p>
    <p class="muted">${busy
      ? Math.round(p.progress) + '% done &middot; nozzle ' + Math.round(p.hotend || 0) + '&deg; &middot; bed ' + Math.round(p.bed || 0) + '&deg;'
      : 'nothing on the plate, ' + (p.state || 'standby')}</p>`;
}

// --- lifting, from Hevy ---
function slideHevy(b) {
  const w = b.hevy || {};
  if (!w.ok) return '';
  const last = w.last;
  if (!last) return `<p class="big">no workouts logged</p>
    <p class="muted">hevy is connected but there is nothing in it yet</p>`;
  const when = last.when ? whenLabel(last.when) : '';
  return `
    <div class="streak"><b>${w.this_week || 0}</b><small>workouts this week</small></div>
    <p class="big">${last.title}</p>
    <p class="muted">${when}${last.minutes ? ' &middot; ' + last.minutes + ' min' : ''}${last.exercises ? ' &middot; ' + last.exercises + ' exercises' : ''}${last.sets ? ' &middot; ' + last.sets + ' sets' : ''}</p>
    <div class="heat h-heat big">${(w.days || []).map(c => `<i class="${c.on ? 'on h' : ''}" title="${c.d}"></i>`).join('')}</div>`;
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
  const hasTrack = (l.today_track || []).length > 1;
  return `
    <h3>you are at</h3>
    <p class="big">${l.place}</p>
    <p class="muted">${l.since ? 'since ' + l.since : ''}</p>
    ${hasTrack ? '<div id="mini-map"></div>' : ''}`;
}

function drawMiniMap(l) {
  const el = document.getElementById('mini-map');
  if (!el || !window.L || !l || !(l.today_track || []).length) return;
  if (window.__miniMap) { window.__miniMap.remove(); window.__miniMap = null; }
  const track = l.today_track;
  const map = L.map(el, {
    zoomControl: false, attributionControl: false, dragging: false,
    scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap',
  }).addTo(map);
  const line = L.polyline(track, { color: '#c8a06a', weight: 3, opacity: 0.85 }).addTo(map);
  const last = track[track.length - 1];
  L.circleMarker(last, { radius: 6, color: '#c8a06a', weight: 2, fillColor: '#f0dcb8', fillOpacity: 0.9 }).addTo(map);
  L.circleMarker(track[0], { radius: 3, color: '#5ac8d2', weight: 1, fillColor: '#5ac8d2', fillOpacity: 0.7 }).addTo(map);
  try { map.fitBounds(line.getBounds(), { padding: [14, 14] }); } catch (e) {}
  window.__miniMap = map;
  setTimeout(() => map.invalidateSize(), 150);
}

function showSlide(i) {
  const el = $('slide'), lab = $('c-label'), sub = $('c-sub'), dots = $('dots');
  if (!el || !carouselSlides.length) return;
  carouselAt = ((i % carouselSlides.length) + carouselSlides.length) % carouselSlides.length;
  const s = carouselSlides[carouselAt];
  el.classList.add('fade');
  setTimeout(() => {
    el.innerHTML = s.html;
    lab.textContent = s.label;
    sub.textContent = s.sub || '';
    if (dots) {
      dots.innerHTML = carouselSlides.map((_, k) => `<i class="${k === carouselAt ? 'on' : ''}" title="${carouselSlides[k].label}"></i>`).join('');
      [...dots.children].forEach((dot, k) => {
        dot.addEventListener('click', () => { showSlide(k); restartCarousel(); });
      });
    }
    el.classList.remove('fade');
  }, 220);
}

let carouselTimer = null;
function restartCarousel() {
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => showSlide(carouselAt + 1), 12000);
}
function pauseCarousel() { if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; } }

function renderCarousel(b) {
  const el = $('slide');
  if (!el) return;
  // Three views, each one a coherent thing rather than a status readout:
  // what's coming, what you're building, and what the box is doing.
  carouselSlides = [
    { label: 'this week', sub: 'calendar and the one thing', html: slideWeek(b) },
    { label: 'building', sub: 'active project', html: slidePlan(b) },
    { label: 'lifting', sub: 'hevy', html: b.hevy && b.hevy.ok ? slideHevy(b) : '' },
    { label: 'the printer', sub: 'moonraker', html: slidePrinter(b) },
    { label: 'journal', sub: 'vault', html: slideVault(b) },
  ].filter(s => s.html);
  if (!carouselSlides.length) return;

  // hover to hold, click a dot to jump
  const panel = el.closest('.carousel');
  if (panel && !panel.__wired) {
    panel.__wired = true;
    panel.addEventListener('mouseenter', pauseCarousel);
    panel.addEventListener('mouseleave', restartCarousel);
    el.addEventListener('click', () => showSlide(carouselAt + 1));
  }
  if (!carouselTimer) restartCarousel();
  showSlide(carouselAt);
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
  const sameDay = dayKey(d) === dayKey(now);
  const tmrw = dayKey(d) === dayKey(now.getTime() + 86400000);
  const time = clockTime(d, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return 'today ' + time;
  if (tmrw) return 'tmrw ' + time;
  return new Date(d).toLocaleDateString('en-US', tzOpts({ weekday: 'short' })) + ' ' + time;
}

function renderCalendar(cal) {
  const el = $('up-next');
  if (!el) return;
  const evs = (cal && cal.events) ? cal.events.slice(0, 4) : [];
  const sub = $('n-sub');
  if (sub) sub.textContent = evs.length ? 'from your calendar' : '';
  if (!evs.length) {
    el.innerHTML = '<li><span class="what muted">nothing on the calendar. the planner is the real one.</span></li>';
    return;
  }
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
    renderForecast(await forecast_());
  } catch (e) {
    $('az-line').textContent = 'collector has not run yet';
  }
}

$('az-line').textContent = LINES[Math.floor(Math.random()*LINES.length)];
clock();
setInterval(clock, 1000);
pull();
setInterval(pull, 30000);
