"""Render the storyboard frames for the Teduh landing page from the game itself (scene only).

usage: storyboard_shots.py <game_dir> <out_dir> [frame,frame]
"""
import base64
import functools
import http.server
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    os.environ.pop(key, None)

GAME = Path(sys.argv[1]).resolve()
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
ONLY = set(sys.argv[3].split(",")) if len(sys.argv) > 3 else None

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(GAME))
handler.log_message = lambda *args: None
server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
server.daemon_threads = True
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_address[1]}/index.html?test=1&autostart=1"
HIGH = "try { localStorage.setItem('teduh.settings.v1', JSON.stringify({quality: 'high', sound: false})) } catch (e) {}"

SETUP = """() => {
  const T = window.teduh;
  const s = T.game.s;
  const S = T.S;
  const placeIf = (id, x, z) => {
    try {
      S.addItem(s, id, 1);
      S.place(s, id, x, z, 0);
    } catch (e) {}
  };
  placeIf('solar', 1, -6);
  placeIf('solar', 2, -6);
  placeIf('turbine', -5, -6);
  placeIf('lamp', -4, -1);
  placeIf('lamp', 1, 1);
  placeIf('lamp', 4, 3);
  placeIf('bench', 0, 3);
  placeIf('flowerpot', -1, 3);
  S.addItem(s, 'seed_basil', 2);
  s.placed.filter((p) => p.type === 'planter').forEach((p, i) => {
    S.plant(s, p.uid, 'seed_basil');
    if (p.crop) {
      p.crop.watered = true;
      p.crop.growth = i === 0 ? 999 : 30;
    }
  });
  T.game.setSetting && T.game.setSetting('quality', 'high');
  T.afterChange();
  if (!window.__beaconWrapped) {
    const original = T.world.setBeacon;
    T.world.setBeacon = (point) => original(window.__noBeacon ? null : (window.__beacon || point));
    window.__beaconWrapped = true;
  }
}"""

# clock: time of day = clock / 600 + 0.3 (mod 1)
FRAMES = {
    "g1": {"clock": 0, "x": 0.5, "z": 2.0, "f": 0.4, "yaw": 0.55, "zoom": 1.15, "js": ""},
    "g2": {"clock": 40, "x": -8.4, "z": -3.0, "f": -2.0, "yaw": -0.9, "zoom": 0.5, "js": """
        T.world.setHighlight(T.world.interactables.find((e) => e.key === 'n:0'));
    """},
    "g3": {"clock": 70, "x": 4.0, "z": -1.6, "f": 3.1, "yaw": 2.6, "zoom": 0.42, "js": """
        T.world.setHighlight(T.world.interactables.find((e) => e.key === 'u:1'));
    """},
    "g4": {"clock": 100, "x": 9.4, "z": -1.6, "f": 1.9, "yaw": 1.2, "zoom": 0.45, "js": """
        T.world.setHighlight(T.world.interactables.find((e) => e.key === 'n:14'));
    """},
    "g5": {"clock": 130, "x": -1.6, "z": -2.6, "f": 3.6, "yaw": 0.3, "zoom": 0.6, "js": """
        T.world.setHighlight(T.world.interactables.find((e) => e.key === 'f:workbench'));
    """},
    "g6": {"clock": 200, "x": -1.3, "z": -26.6, "f": 1.6, "yaw": -0.4, "zoom": 0.7, "js": """
        T.world.addPeer('story-friend', { name: 'Rani', look: { build: 'slim', hair: 'bun', hairColor: '#1c1714', top: 'batik', topColor: '#c0583a', bottom: 'skirt', bottomColor: '#2f6e6a', skin: '#c48a62' } });
        T.world.updatePeer('story-friend', { x: 0.1, z: -26.4, f: -1.6 });
    """},
    "g7": {"clock": 250, "x": 9.6, "z": -3.2, "f": 1.2, "yaw": 1.5, "zoom": 0.62, "js": """
        window.__noBeacon = false;
        window.__beacon = { x: 11.6, z: -4.6 };
    """},
    "g8": {"clock": 372, "x": 0.4, "z": 1.6, "f": 2.4, "yaw": 0.2, "zoom": 1.0, "js": ""},
}

with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(HIGH)
    page = context.new_page()
    page.set_default_timeout(180000)
    page.goto(BASE, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_function("() => window.teduh && window.teduh.game && window.teduh.game.s", timeout=120000)
    page.wait_for_timeout(5000)
    page.evaluate(SETUP)
    page.wait_for_timeout(1500)
    for name, frame in FRAMES.items():
        if ONLY and name not in ONLY:
            continue
        page.evaluate("""(fr) => {
          const T = window.teduh;
          window.__beacon = null;
          window.__noBeacon = true;
          T.world.setHighlight(null);
          T.game.s.clock = fr.clock;
          T.teleport(fr.x, fr.z);
          T.game.s.pos.f = fr.f;
          T.game.targetYaw = fr.yaw;
          T.game.targetZoom = fr.zoom;
          T.world.yaw = fr.yaw;
          T.world.zoom = fr.zoom;
          T.afterChange();
        }""", frame)
        page.wait_for_timeout(2200)
        page.evaluate("(fr) => { window.teduh.game.s.clock = fr.clock; new Function('T', fr.js)(window.teduh); }", frame)
        page.wait_for_timeout(900)
        data = page.evaluate("() => window.teduh.world.photo()")
        (OUT / f"{name}.png").write_bytes(base64.b64decode(data.split(",", 1)[1]))
        print("wrote", name)
    browser.close()
server.shutdown()
