"""Render the five first-run guide pictures from the game itself (scene only, no HUD).

usage: guide_shots.py <game_dir> <out_dir> [scene,scene]
"""
import functools
import http.server
import os
import socketserver
import sys
import threading
import base64
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

COMMON = """() => {
  const T = window.teduh;
  const s = T.game.s;
  const S = T.S;
  s.clock = 66;
  s.credits = 120;
  const placeIf = (id, x, z, r) => {
    try {
      S.addItem(s, id, 1);
      S.place(s, id, x, z, r || 0);
    } catch (e) {}
  };
  placeIf('solar', -0.5, -4.5, 0);
  placeIf('turbine', -4.8, -5.2, 0);
  placeIf('planter', 1.5, -3.5, 0);
  placeIf('lamp', -4.6, -2.2, 0);
  T.game.setSetting && T.game.setSetting('quality', 'high');
  T.afterChange();
  window.__beacon = null;
  if (!window.__beaconWrapped) {
    const original = T.world.setBeacon;
    T.world.setBeacon = (point) => original(window.__noBeacon ? null : (window.__beacon || point));
    window.__beaconWrapped = true;
  }
}"""

# Each scene: player position/facing, camera yaw/zoom, extra JS.
SCENES = {
    "g1": {"x": 0.5, "z": 1.5, "f": 0.6, "yaw": 0.35, "zoom": 0.85, "js": ""},
    "g2": {"x": -8.4, "z": -3.0, "f": -2.0, "yaw": -0.9, "zoom": 0.5, "js": """
        const tree = T.world.interactables.find((e) => e.key === 'n:0');
        T.world.setHighlight(tree);
    """},
    "g3": {"x": 1.0, "z": 2.0, "f": 2.6, "yaw": 0.0, "zoom": 0.8, "js": """
        window.__noBeacon = false;
        window.__beacon = { x: -2.6, z: -3.4 };
    """},
    "g4": {"x": -1.6, "z": -2.4, "f": 3.6, "yaw": 0.6, "zoom": 0.62, "js": ""},
    "g5": {"x": -1.3, "z": -26.6, "f": 1.6, "yaw": -0.4, "zoom": 0.7, "js": """
        T.world.addPeer('guide-friend', { name: 'Rani', look: { build: 'slim', hair: 'bun', hairColor: '#1c1714', top: 'batik', topColor: '#c0583a', bottom: 'skirt', bottomColor: '#2f6e6a', skin: '#c48a62' } });
        T.world.updatePeer('guide-friend', { x: 0.1, z: -26.4, f: -1.6 });
    """},
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
    page.evaluate(COMMON)
    page.wait_for_timeout(1500)
    for name, scene in SCENES.items():
        if ONLY and name not in ONLY:
            continue
        page.evaluate("""(sc) => {
          const T = window.teduh;
          window.__beacon = null;
          window.__noBeacon = true;
          T.world.setHighlight(null);
          T.teleport(sc.x, sc.z);
          T.game.s.pos.f = sc.f;
          T.game.targetYaw = sc.yaw;
          T.game.targetZoom = sc.zoom;
          T.world.yaw = sc.yaw;
          T.world.zoom = sc.zoom;
          T.afterChange();
          new Function('T', sc.js)(T);
        }""", scene)
        page.wait_for_timeout(2500)
        page.evaluate("(js) => new Function('T', js)(window.teduh)", scene["js"])
        page.wait_for_timeout(600)
        data = page.evaluate("() => window.teduh.world.photo()")
        (OUT / f"{name}.png").write_bytes(base64.b64decode(data.split(",", 1)[1]))
        print("wrote", name)
    browser.close()
server.shutdown()
