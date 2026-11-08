// azuna board. no dependencies, one file.
const $ = (id) => document.getElementById(id);
const fmt = (n) => n >= 1e9 ? (n/1e9).toFixed(1)+'B' : n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
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
  const dp = h.disk_total ? h.disk_used / h.disk_total * 100 : 0;
  $('s-disk').style.width = dp.toFixed(1) + '%';
  $('s-disk').className = dp > 85 ? 'hot' : '';
  $('s-disklbl').textContent = bytes(h.disk_used) + '/' + bytes(h.disk_total);
  const mp = h.mem_total ? h.mem_used / h.mem_total * 100 : 0;
  $('s-mem').style.width = mp.toFixed(1) + '%';
  $('s-mem').className = mp > 90 ? 'hot' : '';
  $('s-memlbl').textContent = Math.round(mp) + '%';
  $('s-load').textContent = h.load ?? '-';
  $('s-temp').innerHTML = h.temp_c ? h.temp_c + '&deg;' : '&mdash;';
  $('s-up').textContent = h.uptime_days ? 'up ' + h.uptime_days + 'd' : '';
  const dk = d.docker || {};
  $('s-docker').textContent = (dk.running||0) + '/' + (dk.total||0);
  $('s-down').innerHTML = (dk.down||[]).slice(0,3).map(n => `<li><span>${n}</span><b class="bad">down</b></li>`).join('');

  // tokens
  const k = d.tokens || {days:[]};
  const days = k.days || [];
  $('k-in').textContent = fmt(k.today_in || 0);
  $('k-out').textContent = fmt(k.today_out || 0);
  $('k-cost').textContent = '$' + (k.today_cost || 0).toFixed(2);
  $('k-calls').textContent = fmt(k.today_calls || 0);
  $('k-chart').innerHTML = bars(days.map(x => x.in + x.out), 340, 92, '#c8a06a');

  // notes
  const n = d.notes || {};
  $('n-days').textContent = n.days_since_note != null ? Math.floor(n.days_since_note) : '—';
  $('n-sub').textContent = n.days_since_note > 7 ? 'lapsed' : 'current';
  $('n-focus').innerHTML = (n.focus || []).map(f => `<li>${f}</li>`).join('') || '<li class="muted">no quarter goals set</li>';
  $('n-recent').innerHTML = (n.recent || []).map(r => `<li>${r}</li>`).join('') || '<li class="muted">nothing logged</li>';

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
  } catch (e) {
    $('az-line').textContent = 'collector has not run yet';
  }
}

$('az-line').textContent = LINES[Math.floor(Math.random()*LINES.length)];
clock();
setInterval(clock, 1000);
pull();
setInterval(pull, 30000);
