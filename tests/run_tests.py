"""Teduh test suite: serves the game locally and drives it in Chrome with Playwright.

Usage:  python tests/run_tests.py [--shots OUTDIR] [--url URL]
Exit code 0 = every check passed. Needs Playwright and Google Chrome (or Playwright's Chromium).
"""
import argparse
import functools
import http.server
import json
import os
import re
import socketserver
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    os.environ.pop(key, None)
os.environ["NO_PROXY"] = "localhost,127.0.0.1"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{('  -- ' + str(detail)) if detail and not ok else ''}", flush=True)


def static_checks():
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    sources = {p.name: p.read_text(encoding="utf-8") for p in (ROOT / "js").glob("*.js")}
    sources["index.html"] = (ROOT / "index.html").read_text(encoding="utf-8")
    sources["style.css"] = css

    def hue_sat(hex_value):
        r, g, b = (int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))
        mx, mn = max(r, g, b), min(r, g, b)
        if mx == mn:
            return 0, 0
        d = mx - mn
        s = d / (1 - abs(mx + mn - 1)) if (mx + mn) not in (0, 2) else 0
        if mx == r:
            h = 60 * (((g - b) / d) % 6)
        elif mx == g:
            h = 60 * ((b - r) / d + 2)
        else:
            h = 60 * ((r - g) / d + 4)
        return h, s

    purple = []
    for name, text in sources.items():
        for match in re.findall(r"#([0-9a-fA-F]{6})\b", text):
            h, s = hue_sat(match)
            if 255 <= h <= 320 and s > 0.2:
                purple.append(f"{name}:#{match}")
    check("no purple or violet colours in CSS/JS/HTML", not purple, purple[:5])

    emoji = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]")
    hits = [name for name, text in sources.items() if emoji.search(text)]
    check("no emoji anywhere in the interface sources", not hits, hits)

    for path in list(ROOT.rglob("*.js")) + list(ROOT.rglob("*.css")) + list(ROOT.rglob("*.html")) + list(ROOT.rglob("*.md")):
        if "vendor" in path.parts:
            continue
        raw = path.read_bytes()
        if raw.startswith(b"\xef\xbb\xbf") or b"\xc3\xa2\xe2\x82\xac" in raw:
            check(f"no BOM or mojibake in {path.relative_to(ROOT)}", False)
            break
    else:
        check("no BOM or mojibake in text files", True)

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    shell = re.findall(r"'([^']+)'", sw.split("const SHELL = [")[1].split("];")[0])
    missing = [f for f in shell if f != "./" and not (ROOT / f.split("?")[0]).exists()]
    check("every offline shell file exists", not missing, missing)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def serve():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


LOGIC = r"""
async () => {
  const T = window.teduh;
  const { S, D, game, world } = T;
  const out = [];
  const ok = (name, cond, detail) => out.push([name, !!cond, detail === undefined ? '' : String(detail)]);
  T.startNew({ name: 'Tester' });
  const s = game.s;

  // map sanity: everything sits on its island and is reachable once all projects are done
  const allDone = S.newState({});
  Object.values(allDone.projects).forEach((p) => { p.done = true; });
  ok('start position is walkable', S.walkable(s, s.pos.x, s.pos.z));
  const step = 0.5;
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([key(0, 2.5)]);
  const queue = [[0, 2.5]];
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (!seen.has(k) && S.walkable(allDone, nx, nz)) { seen.add(k); queue.push([nx, nz]); }
    }
  }
  const reachable = (x, z, r) => [...seen].some((k) => { const [a, b] = k.split(',').map(Number); return Math.hypot(a * step - x, b * step - z) <= r; });
  const unreachable = world.interactables.filter((e) => e.kind !== 'pet' && !reachable(e.x, e.z, e.r - 0.1)).map((e) => e.key);
  ok('every interactable is reachable with all bridges open', unreachable.length === 0, unreachable.join(' '));
  ok('grove is closed at the start', !S.walkable(s, 29, -9));

  // gathering
  T.teleport(-8.4, -3.0);
  const wood0 = S.count(s, 'wood');
  T.act('n:0');
  ok('chopping a tree gives wood', S.count(s, 'wood') > wood0, S.count(s, 'wood'));
  ok('tree is regrowing after chopping', !S.nodeReady(s, 0));
  ok('goal 1 completes after chopping', s.quest >= 1, s.quest);
  T.act('n:15');
  ok('bush gives fiber', S.count(s, 'fiber') >= 2);

  // farming
  game.plant(1, 'seed_basil', false);
  const planter = s.placed.find((p) => p.uid === 1);
  ok('planting puts a crop in the planter', planter.crop && planter.crop.seed === 'seed_basil');
  T.teleport(3, -1.8);
  T.act('u:1');
  ok('watering marks the crop watered', planter.crop.watered);
  T.advance(65);
  ok('basil ripens after about a minute', S.cropProgress(planter.crop) >= 1);
  T.act('u:1');
  ok('harvest gives basil and empties the planter', S.count(s, 'basil') >= 2 && !planter.crop, S.count(s, 'basil'));

  // engineering loop: scrap -> wire -> solar -> energy
  T.act('n:12');
  S.addItem(s, 'scrap', 6);
  S.addItem(s, 'stone', 3);
  game.craft('wire');
  game.craft('wire');
  ok('wire crafted from scrap', S.count(s, 'wire') >= 2);
  game.craft('solar');
  ok('solar panel crafted', S.count(s, 'solar') === 1);
  ok('cannot place on the workbench', !S.canPlace(s, -3, -3));
  const placedSolar = S.place(s, 'solar', 2, 2, 0);
  ok('solar panel placed on open ground', !!placedSolar);
  T.afterChange();
  s.clock = 0.2 * D.DAY_LENGTH;
  const e0 = s.energy;
  T.advance(60);
  ok('solar panel charges energy by day', s.energy > e0, `${e0.toFixed(2)} -> ${s.energy.toFixed(2)}`);
  ok('energy never exceeds capacity', s.energy <= S.energyCapacity(s));

  // night: solar stops
  const nightStart = Math.ceil(s.clock / D.DAY_LENGTH) * D.DAY_LENGTH + (0.95 - D.START_TIME_OF_DAY) * D.DAY_LENGTH;
  T.advance(nightStart - s.clock);
  const eNight = s.energy;
  T.advance(20);
  ok('solar panels make nothing at night', Math.abs(s.energy - eNight) < 1e-6, `${eNight} ${s.energy}`);
  ok('resting works at night', S.canRest(s) && S.rest(s) > 0 && !S.canRest(s) && S.timeOfDay(s) > 0.24 && S.timeOfDay(s) < 0.26);

  // market, orders, projects
  T.teleport(0, -26);
  await new Promise((r) => setTimeout(r, 300));
  ok('market visit is recorded', s.stats.visited.market);
  const credits0 = s.credits;
  game.sell('basil', 1);
  ok('selling earns coins', s.credits > credits0);
  const order = S.orderFor(s, 'bayu');
  S.addItem(s, order.item, order.n);
  game.fill('bayu');
  ok('filling an order pays and adds friendship', S.orderFor(s, 'bayu').done && s.friends.bayu.points === 10);
  ok('orders are the same all day (deterministic)', JSON.stringify(S.orderFor(s, 'sari')) === JSON.stringify(S.orderFor(s, 'sari')));
  S.addItem(s, 'plank', 10); S.addItem(s, 'stone', 15); S.addItem(s, 'rope', 6);
  game.giveAll('bridge');
  ok('sky bridge finishes when fully supplied', S.projectDone(s, 'bridge'));
  ok('grove opens after the bridge', S.walkable(s, 29, -9));
  ok('dock project unlocked after bridge', S.projectOpen(s, D.PROJECTS.find((p) => p.id === 'dock')));
  ok('lighthouse still locked without the tower', !S.projectOpen(s, D.PROJECTS.find((p) => p.id === 'lighthouse')));
  const r = S.contributeRemote(s, 'tower', 'scrap', 999);
  ok('friend deliveries are capped at 20 per message', r.given === 20 || r.given === 15, r.given);

  // fishing and cooking
  const fishBefore = S.count(s, 'fish_minnow') + S.count(s, 'fish_carp');
  S.landFish(s, 'pond', S.mulberry32(3));
  ok('landing a fish adds it to the bag', S.count(s, 'fish_minnow') + S.count(s, 'fish_carp') === fishBefore + 1);
  ok('catch zone stays between 0.1 and 0.45', S.catchZone(s) > 0.1 && S.catchZone(s) <= 0.45);
  game.startFishing('pond');
  game.fishing.pos = game.fishing.zoneStart + game.fishing.zoneW / 2;
  game.reel();
  ok('reeling inside the zone catches a fish', !game.fishing && s.stats.fished && Object.values(s.stats.fished).reduce((a, b) => a + b, 0) >= 2);
  S.addItem(s, 'cookstove', 1);
  ok('cookstove placed', !!S.place(s, 'cookstove', 3, 4, 0));
  S.addItem(s, 'basil', 4); S.addItem(s, 'tomato', 2);
  s.energy = 10;
  game.craft('salad');
  ok('cooking uses energy and makes a salad', S.count(s, 'salad') === 1 && s.energy === 8);
  game.eat('salad');
  ok('eating a salad starts the growth boost', S.buffActive(s, 'grow'));

  // build mode helpers
  S.addItem(s, 'path', 3);
  ['path', 'path', 'path'].forEach((t, i) => S.place(s, t, -1 + i, 6, 0));
  T.afterChange();
  ok('three decorations complete the decor count', s.stats.decor >= 3);
  ok('pick up returns the item', S.pickUp(s, s.placed[s.placed.length - 1].uid) && S.count(s, 'path') >= 1);

  // save code round trip
  const code = S.toCode(s);
  const back = S.fromCode(code);
  ok('save code round trip keeps coins, items and projects', back.credits === s.credits && back.inv.wood === s.inv.wood && back.projects.bridge.done);
  let bad = false;
  try { S.fromCode('nonsense'); } catch { bad = true; }
  ok('a broken save code is rejected', bad);

  // offline progress
  const off = S.newState({});
  off.placed[0].crop = { seed: 'seed_basil', growth: 0, watered: true, fert: false };
  off.savedAt = Date.now() - 10 * 60 * 1000;
  const summary = S.applyOffline(off, Date.now(), S.mulberry32(5));
  ok('time away grows crops (offline progress)', summary && summary.ripe === 1, JSON.stringify(summary));

  // i18n coverage
  const STR = T.t && window.teduh;
  const items = Object.entries(D.ITEMS).filter(([, it]) => !it.en || !it.id).map(([k]) => k);
  ok('every item has English and Indonesian names', items.length === 0, items.join(' '));
  const qs = D.QUESTS.filter((q) => !q.en || !q.idn || !q.hint || !q.hintId).map((q) => q.id);
  ok('every goal is translated', qs.length === 0, qs.join(' '));

  // movement with the keyboard
  T.teleport(0, 2.5);
  const z0 = s.pos.z;
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
  await new Promise((r) => setTimeout(r, 600));
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
  ok('W walks the player forward', s.pos.z < z0 - 0.5, `${z0} -> ${s.pos.z}`);
  ok('player is still on walkable ground', S.walkable(s, s.pos.x, s.pos.z));
  return out;
}
"""


def run(args):
    from playwright.sync_api import sync_playwright

    server = serve()
    base = args.url or f"http://127.0.0.1:{server.server_address[1]}/"
    shots = Path(args.shots) if args.shots else None
    if shots:
        shots.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        launch_args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                       "--proxy-bypass-list=127.0.0.1;localhost"]
        try:
            browser = p.chromium.launch(channel="chrome", args=launch_args)
        except Exception:
            browser = p.chromium.launch(args=launch_args)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        context.add_init_script("try { localStorage.setItem('teduh.settings.v1', JSON.stringify({quality: 'low', sound: false})) } catch (e) {}")
        context.set_default_timeout(90000)
        page = context.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        # title screen
        page.goto(base + "index.html?test=1", wait_until="domcontentloaded", timeout=90000)
        page.wait_for_selector("#startBtn", timeout=60000)
        page.wait_for_timeout(1500)
        check("title screen shows the start button", page.locator("#startBtn").is_visible())
        if shots:
            page.screenshot(path=str(shots / "title-1280.png"))
        page.evaluate("() => { document.getElementById('nameInput').value = 'Juwen'; document.getElementById('startBtn').click(); }")
        page.wait_for_timeout(1200)
        check("starting a game shows the HUD", page.locator("#hud").is_visible())
        check("goal card shows the first goal", "tree" in page.inner_text("#goalText").lower())
        nonblank = page.evaluate("""() => { const c = document.getElementById('scene'); const g = document.createElement('canvas'); g.width = 64; g.height = 64;
            const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 64); const d = x.getImageData(0, 0, 64, 64).data; const set = new Set();
            for (let i = 0; i < d.length; i += 16) set.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); return set.size; }""")
        check("3D scene renders (many distinct colours)", nonblank > 20, nonblank)
        if shots:
            page.screenshot(path=str(shots / "game-1280.png"))

        # logic suite
        for name, ok, detail in page.evaluate(LOGIC):
            check(name, ok, detail)

        # panels open and fit
        for dock in ["bag", "journal", "together", "settings"]:
            page.evaluate(f"() => document.getElementById('dock-{dock}').click()")
            page.wait_for_timeout(250)
            visible = page.locator("#panel").is_visible()
            check(f"{dock} panel opens", visible)
            if shots:
                page.screenshot(path=str(shots / f"panel-{dock}-1280.png"))
            page.evaluate("() => document.getElementById('panel').close()")
            page.wait_for_timeout(150)
        page.evaluate("() => { window.teduh.game.s.pos.x = -2.6; window.teduh.game.s.pos.z = -2.0; }")
        page.wait_for_timeout(300)
        check("workbench prompt appears next to the workbench", "workbench" in page.inner_text("#actionLabel").lower(), page.inner_text("#actionLabel"))
        page.keyboard.press("e")
        page.wait_for_timeout(250)
        check("E opens the workbench", page.locator("#panel").is_visible() and "Workbench" in page.inner_text("#panelTitle"))
        if shots:
            page.screenshot(path=str(shots / "panel-workbench-1280.png"))
        page.evaluate("() => document.getElementById('panel').close()")

        # language switch
        page.evaluate("() => window.teduh.game.setLang('id')")
        page.wait_for_timeout(200)
        check("Indonesian labels apply to the dock", page.inner_text("#dock-bag").strip() == "Tas", page.inner_text("#dock-bag"))
        page.evaluate("() => window.teduh.game.setLang('en')")
        page.close()

        # phone layout
        phone_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
        phone_ctx.add_init_script("try { localStorage.setItem('teduh.settings.v1', JSON.stringify({quality: 'low', sound: false})) } catch (e) {}")
        phone_ctx.set_default_timeout(90000)
        phone = phone_ctx.new_page()
        phone.on("pageerror", lambda e: errors.append(str(e)))
        phone.goto(base + "index.html?test=1&autostart=1", wait_until="domcontentloaded", timeout=90000)
        phone.wait_for_timeout(1800)
        overflow = phone.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("no horizontal overflow at 390 px", overflow <= 0, overflow)
        small = phone.evaluate("""() => [...document.querySelectorAll('#hud button, #dock button')].filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44)).map((b) => b.id || b.className)""")
        check("phone tap targets are at least 44 px", not small, small)
        overlap = phone.evaluate("""() => { const a = document.querySelector('.hud-top').getBoundingClientRect(); const g = document.querySelector('#goal').getBoundingClientRect(); const d = document.querySelector('#dock').getBoundingClientRect();
            return (g.top < a.bottom - 1) || (d.left < 0) || (d.right > innerWidth); }""")
        check("HUD pieces do not overlap or spill on a phone", not overlap)
        if shots:
            phone.screenshot(path=str(shots / "game-390.png"))
            phone.evaluate("() => document.getElementById('dock-bag').click()")
            phone.wait_for_timeout(250)
            phone.screenshot(path=str(shots / "panel-bag-390.png"))
        phone.close()
        title_phone = phone_ctx.new_page()
        title_phone.goto(base + "index.html?test=1", wait_until="domcontentloaded", timeout=90000)
        title_phone.wait_for_timeout(1500)
        check("no horizontal overflow on the phone title screen", title_phone.evaluate("() => document.documentElement.scrollWidth - innerWidth") <= 0)
        if shots:
            title_phone.screenshot(path=str(shots / "title-390.png"))

        real_errors = [e for e in errors if "favicon" not in e]
        check("no JavaScript errors in the console", not real_errors, real_errors[:5])
        browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shots")
    parser.add_argument("--url")
    args = parser.parse_args()
    static_checks()
    try:
        run(args)
    except Exception as error:  # report, never hang
        check("browser suite ran", False, repr(error))
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed", flush=True)
    summary = {"passed": len(results) - len(failed), "total": len(results), "failed": [r[0] for r in failed]}
    (ROOT / "tests" / "last_result.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    sys.stdout.flush()
    os._exit(1 if failed else 0)


if __name__ == "__main__":
    main()
