#!/usr/bin/env python3
"""Collects everything the board shows into board.json, next to index.html.
Runs on the host as sky, every minute, from cron. Read-only except its own output."""

import json, os, re, shutil, sqlite3, subprocess, time, glob
from datetime import datetime, timezone, timedelta

HOME = os.path.expanduser("~")
OUT  = os.path.join(HOME, "board", "board.json")
VAULT = os.path.join(HOME, ".hermes", "Notes")
DB = os.path.join(HOME, ".hermes", "state.db")

NAP = "%d/%b/%Y:%H:%M:%S"

def parse_dt(raw):
    """NPM has shipped both nginx-style and ISO timestamps over the years."""
    if not raw:
        return None
    raw = raw.strip()
    for attempt in (raw.split("+")[0].strip(), raw.replace("Z", ""), raw):
        try:
            return datetime.strptime(attempt, NAP)
        except Exception:
            pass
        try:
            return datetime.fromisoformat(attempt.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            pass
    return None

def sh(cmd, timeout=8):
    try:
        return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout).stdout
    except Exception:
        return ""

STATE = os.path.join(HOME, "board", ".collect-state.json")

def read_state():
    try:
        return json.load(open(STATE))
    except Exception:
        return {}

def write_state(d):
    try:
        json.dump(d, open(STATE, "w"))
        os.chmod(STATE, 0o644)
    except Exception:
        pass

def cpu_usage(prev):
    """Percent busy since the last sample, from /proc/stat."""
    try:
        with open("/proc/stat") as f:
            parts = f.readline().split()
        fields = [int(x) for x in parts[1:]]
        idle = fields[3] + (fields[4] if len(fields) > 4 else 0)
        total = sum(fields)
        if prev:
            dt = total - prev.get("total", total)
            di = idle - prev.get("idle", idle)
            pct = 100.0 * (dt - di) / dt if dt > 0 else None
            return (round(pct, 1) if pct is not None else None), {"total": total, "idle": idle}
        return None, {"total": total, "idle": idle}
    except Exception:
        return None, prev

def net_rate(prev, elapsed):
    """Bytes per second in and out, summed over every non-loopback interface."""
    try:
        rx = tx = 0
        with open("/proc/net/dev") as f:
            for line in f.readlines()[2:]:
                name, data = line.split(":", 1)
                if name.strip() == "lo":
                    continue
                cols = data.split()
                rx += int(cols[0]); tx += int(cols[8])
        cur = {"rx": rx, "tx": tx}
        if prev and elapsed and elapsed > 0:
            return (max(0, int((rx - prev.get("rx", rx)) / elapsed)),
                    max(0, int((tx - prev.get("tx", tx)) / elapsed))), cur
        return (None, None), cur
    except Exception:
        return (None, None), prev

def hot_containers():
    out = sh("docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}' 2>/dev/null", timeout=20)
    rows = []
    for line in out.strip().splitlines():
        parts = line.split("|")
        if len(parts) != 3:
            continue
        try:
            cpu = float(parts[1].strip().rstrip("%"))
        except Exception:
            cpu = 0.0
        rows.append({"name": parts[0], "cpu": round(cpu, 1), "mem": parts[2].strip()})
    rows.sort(key=lambda r: -r["cpu"])
    return rows[:3]

def host():
    du = shutil.disk_usage("/")
    mem = {}
    for line in open("/proc/meminfo"):
        k, v = line.split(":", 1)
        mem[k] = int(v.strip().split()[0]) * 1024
    up = float(open("/proc/uptime").read().split()[0])
    st = read_state()
    now = time.time()
    elapsed = now - st.get("ts", 0) if st.get("ts") else 0
    cpu_pct, cpu_raw = cpu_usage(st.get("cpu"))
    (rx, tx), net_raw = net_rate(st.get("net"), elapsed)
    la = os.getloadavg()
    procs = []
    ps = sh("ps -eo comm,%cpu,%mem --sort=-%cpu | head -4").strip().splitlines()[1:]
    for line in ps:
        bits = line.split()
        if len(bits) >= 3:
            procs.append({"name": bits[0], "cpu": bits[1], "mem": bits[2]})
    write_state({"ts": now, "cpu": cpu_raw, "net": net_raw})
    swap_total = mem.get("SwapTotal", 0)
    return {
        "disk_used": du.used, "disk_total": du.total,
        "mem_used": mem["MemTotal"] - mem["MemAvailable"], "mem_total": mem["MemTotal"],
        "swap_used": swap_total - mem.get("SwapFree", 0), "swap_total": swap_total,
        "load": round(la[0], 2), "load5": round(la[1], 2), "load15": round(la[2], 2),
        "cpu_pct": cpu_pct,
        "net_in": rx, "net_out": tx,
        "procs": procs,
        "uptime_days": round(up / 86400, 1),
        "temp_c": host_temp(),
    }

def host_temp():
    for p in glob.glob("/sys/class/thermal/thermal_zone*/temp") + glob.glob("/sys/class/hwmon/hwmon*/temp1_input"):
        try:
            v = int(open(p).read().strip())
            if 10000 < v < 120000:
                return round(v / 1000, 1)
        except Exception:
            pass
    return None

def docker():
    out = sh("docker ps -a --format '{{.Names}}|{{.State}}'")
    rows = [r.split("|") for r in out.strip().splitlines() if "|" in r]
    return {
        "total": len(rows),
        "running": sum(1 for r in rows if r[1] == "running"),
        "down": [r[0] for r in rows if r[1] != "running"],
    }

def traffic():
    """Today's requests from every NPM proxy-host access log, plus hourly histogram.
    NPM writes one log per host (proxy-host-N_access.log) plus fallback logs,
    there is no single access.log."""
    logdir = os.path.join(HOME, "nginx", "data", "logs")
    today = datetime.now().strftime("%d/%b/%Y")
    hourly = [0] * 24
    today_n = last_hour = e4 = e5 = 0
    paths = {}
    now = datetime.now()
    files = [f for f in glob.glob(os.path.join(logdir, "*_access.log"))
             if "letsencrypt" not in os.path.basename(f)]
    for path in files:
        try:
            size = os.path.getsize(path)
            with open(path, "rb") as f:
                f.seek(max(0, size - 2_000_000))
                lines = f.read().decode("utf-8", "replace").splitlines()
        except Exception:
            continue
        for ln in lines:
            line = ln.strip()
            if not line:
                continue
            dt, status, uri = None, 0, "/"
            if line.startswith("{"):
                try:
                    rec = json.loads(line)
                    ts = rec.get("time") or rec.get("time_local") or ""
                    dt = parse_dt(ts)
                    status = int(rec.get("status") or 0)
                    uri = rec.get("request_uri") or rec.get("uri") or "/"
                except Exception:
                    continue
            elif line.startswith("["):
                # NPM's own format:
                # [08/Nov/2026:02:03:18 +0000] - 502 502 - GET https host "/path" [Client ..] ...
                try:
                    stamp = line.split("[", 1)[1].split("]", 1)[0]
                    dt = parse_dt(stamp.split()[0])
                    rest = line.split("]", 1)[1].strip().split()
                    status = int(rest[1]) if len(rest) > 1 and rest[1].isdigit() else 0
                    q = line.split('"')
                    uri = q[1] if len(q) > 1 and q[1].startswith("/") else "/"
                except Exception:
                    continue
            else:
                try:
                    stamp = line.split("[", 1)[1].split("]", 1)[0]
                    dt = parse_dt(stamp.split()[0])
                    quoted = line.split('"')
                    request = quoted[1] if len(quoted) > 1 else ""
                    bits = request.split()
                    uri = bits[1] if len(bits) > 1 else "/"
                    status = int(quoted[2].split()[0]) if len(quoted) > 2 and quoted[2].split() else 0
                except Exception:
                    continue
            if dt is None:
                continue
            if dt.strftime("%d/%b/%Y") == today:
                today_n += 1
                hourly[dt.hour] += 1
                if status >= 500:
                    e5 += 1
                elif status >= 400:
                    e4 += 1
                key = (uri or "/").split("?")[0][:40]
                paths[key] = paths.get(key, 0) + 1
            if (now - dt).total_seconds() < 3600:
                last_hour += 1
    top = sorted(paths.items(), key=lambda kv: -kv[1])[:5]
    return {
        "today": today_n, "last_hour": last_hour, "e4": e4, "e5": e5,
        "hourly": hourly,
        "top": [{"path": k, "n": v} for k, v in top],
        "sources": len(files),
    }

def tokens():
    if not os.path.exists(DB):
        return None
    try:
        con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    except Exception:
        return None
    days = []
    today = datetime.now().date()
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        start = time.mktime(day.timetuple())
        end = start + 86400
        row = con.execute(
            "select coalesce(sum(input_tokens),0), coalesce(sum(output_tokens),0),"
            " coalesce(sum(api_call_count),0), coalesce(sum(estimated_cost_usd),0)"
            " from session_model_usage where last_seen >= ? and last_seen < ?",
            (start, end)).fetchone()
        days.append({"d": day.strftime("%m-%d"), "in": row[0], "out": row[1],
                     "calls": row[2], "cost": round(row[3], 4)})
    t = days[-1]
    con.close()
    return {"today_in": t["in"], "today_out": t["out"], "today_calls": t["calls"],
            "today_cost": t["cost"], "days": days}

def notes():
    focus, recent = [], []
    goals = os.path.join(VAULT, "!_Personal", "Goals.md")
    if os.path.exists(goals):
        txt = open(goals, encoding="utf-8", errors="replace").read()
        block = txt.split("## This Quarter")[-1].split("##")[0]
        focus = [l.strip("- [ ] ").replace("**", "").strip() for l in block.splitlines() if l.strip().startswith("- [ ]")]
    journals = glob.glob(os.path.join(VAULT, "!_DailyJournal", "*", "*", "*Daily Journal.md"))
    last = max(journals, key=os.path.getmtime) if journals else None
    days_since = None
    if last:
        days_since = round((time.time() - os.path.getmtime(last)) / 86400, 1)
    log = os.path.join(VAULT, "!_Hermes", "Log.md")
    if os.path.exists(log):
        lines = [l.strip("- ") for l in open(log, encoding="utf-8", errors="replace").read().splitlines() if l.strip().startswith("- ")]
        recent = lines[:3]
    return {"focus": focus[:3], "days_since_note": days_since, "recent": recent}

def weather():
    """Open-Meteo, no key. Server-side so a slow CDN can't leave a 'loading' panel."""
    url = ("https://api.open-meteo.com/v1/forecast?latitude=47.6101&longitude=-122.2015"
           "&current=temperature_2m,weather_code,wind_speed_10m"
           "&daily=sunset,precipitation_probability_max"
           "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto")
    raw = sh(f"curl -s -m 8 '{url}'", timeout=12)
    if not raw.strip():
        return None
    try:
        j = json.loads(raw)
        cur = j.get("current", {})
        daily = j.get("daily", {})
        return {
            "temp": round(cur.get("temperature_2m", 0)),
            "wind": round(cur.get("wind_speed_10m", 0)),
            "code": cur.get("weather_code", 0),
            "pop": (daily.get("precipitation_probability_max") or [0])[0],
            "sunset": (daily.get("sunset") or [""])[0],
        }
    except Exception:
        return None

def printer():
    out = sh("curl -s -m 3 'http://127.0.0.1:7125/printer/objects/query?print_stats&heater_bed&extruder&display_status'")
    if not out.strip():
        return None
    try:
        st = json.loads(out)["result"]["status"]
        ps = st.get("print_stats", {})
        pct = st.get("display_status", {}).get("progress")
        return {
            "state": ps.get("state", "?"),
            "file": (ps.get("filename") or "").split("/")[-1][:40],
            "progress": round((pct or 0) * 100, 1),
            "hotend": st.get("extruder", {}).get("temperature"),
            "bed": st.get("heater_bed", {}).get("temperature"),
        }
    except Exception:
        return None

def safe(fn, default=None):
    try:
        return fn()
    except Exception as e:
        DIAG.append(f"{fn.__name__}: {type(e).__name__}: {e}")
        return default

DIAG = []

def diagnostics():
    log = os.path.join(HOME, "nginx", "data", "logs", "access.log")
    d = {
        "home": HOME,
        "access_logs_found": len(glob.glob(os.path.join(HOME, "nginx", "data", "logs", "*_access.log"))),
        "access_log": log,
        "access_log_exists": os.path.exists(log),
        "logs_dir": sorted(os.listdir(os.path.join(HOME, "nginx", "data", "logs"))) if os.path.isdir(os.path.join(HOME, "nginx", "data", "logs")) else "missing",
        "state_db": DB,
        "state_db_exists": os.path.exists(DB),
        "state_db_readable": os.access(DB, os.R_OK),
        "vault": VAULT,
        "vault_exists": os.path.exists(VAULT),
        "errors": DIAG,
    }
    found = [f for f in glob.glob(os.path.join(HOME, "nginx", "data", "logs", "*_access.log"))
             if "letsencrypt" not in os.path.basename(f)]
    sized = sorted(((os.path.getsize(f), os.path.basename(f)) for f in found), reverse=True)
    d["log_sizes"] = [{"file": n, "bytes": b} for b, n in sized[:6]]
    d["sample_from"] = sized[0][1] if sized else None
    d["access_log_sample"] = ""
    if sized and sized[0][0] > 0:
        try:
            with open(os.path.join(HOME, "nginx", "data", "logs", sized[0][1]), "r", errors="replace") as f:
                d["access_log_sample"] = f.readline()[:220]
        except Exception as e:
            d["access_log_sample"] = f"unreadable: {e}"
    # why can't we read the session db?
    try:
        st = os.stat(os.path.dirname(DB))
        d["hermes_dir_mode"] = oct(st.st_mode & 0o777)
        fst = os.stat(DB)
        d["state_db_mode"] = oct(fst.st_mode & 0o777)
    except Exception as e:
        d["stat_error"] = str(e)
    try:
        with open(DB, "rb") as f:
            f.read(16)
        d["state_db_open"] = "ok"
    except Exception as e:
        d["state_db_open"] = f"{type(e).__name__}: {e}"
    return d

def main():
    data = {
        "generated": datetime.now().isoformat(timespec="seconds"),
        "host": safe(host, {}), "docker": safe(docker, {}), "hot": safe(hot_containers, []), "traffic": safe(traffic, {}),
        "notes": safe(notes, {}), "printer": safe(printer),
        "weather": safe(weather),
        "diag": diagnostics(),
    }
    tmp = f"{OUT}.{os.getpid()}.tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, OUT)

if __name__ == "__main__":
    main()
