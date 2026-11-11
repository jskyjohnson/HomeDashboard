# HomeDashboard

The kiosk board that runs on the bench monitor at 1920x1080, served by nginx on
port 3100 and displayed by vivaldi in app mode via `~/kiosk.sh`.

## What it is

Not a launcher. It answers "what is happening right now" for one person: weather
and whether it is a riding day, traffic on the public hostnames, server and
container health, Hermes token spend, notes and focus pulled from the Obsidian
vault, and printer state.

## Layout

| File | What it does |
| --- | --- |
| `index.html` | the page, panels in a 12 column grid |
| `board.css` | all of the styling, near black with a gold accent |
| `board.js` | fetch, render, inline SVG sparklines, no dependencies |
| `vendor/leaflet.{js,css}` | Leaflet 1.9.4, vendored so a CDN blip cannot kill the maps |
| `collect.py` | runs on the host every minute from cron, writes `board.json` next to the page |
| `docker-compose.yml` | nginx:alpine on 3100, serving `~/board` read only |

Token stats are not collected here: Hermes writes `~/.hermes/board-data/tokens.json`
from its own session database, and that directory is mounted into the container at
`/data`, so `board.js` fetches it separately.

`collect.py` runs as the host user `sky`, which cannot read `~/.hermes` (mode 700),
so anything sourced from the vault or the session database is written container-side
instead: `gen_vault.py`, `gen_tokens.py` and `gen_hevy.py` all produce files in
`~/.hermes/board-data/`. The `notes` block in `board.json` is a fallback that is
always empty on this host; the journal slide reads `vault.json`.

Hevy needs `/opt/data/.hevy_key` (one line, mode 600), created by the user at
https://hevy.com/settings?developer. Without it the feed writes `{"ok": false}` and
the board says "no hevy key yet" instead of showing zeros.

## Deploy

```
git -C ~/board pull
sudo chmod -R a+rX ~/board
```

Static files are read per request, so no restart is needed. `collect.py` is picked
up by cron automatically.

## Rules

- No external dependencies, no CDN. If the network blinks the page must still render.
- Data sources must degrade to a readable sentence, never a blank panel or a zero that
  looks like real data.
- Orange or red means "look at this", not "this thing is intentionally unplugged".
