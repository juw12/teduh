"""Capture README / profile / landing images of Teduh with real in-game renders (high graphics).

Usage: python tests/capture_media.py   ->  writes docs/media/banner.jpg, demo.png, phone.png, scene.jpg
"""
import functools
import http.server
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("TEDUH_SHOTS_OUT", GAME / "docs" / "media"))
OUT.mkdir(parents=True, exist_ok=True)
for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
    os.environ.pop(key, None)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(GAME)))
server.daemon_threads = True
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_address[1]}/index.html?test=1&autostart=1"

HIGH = "try { localStorage.setItem('teduh.settings.v1', JSON.stringify({quality: 'high', sound: false})) } catch (e) {}"

# A lived-in home island: crops, a solar panel, turbine, lamp and a few furniture pieces.
SETUP = """() => {
  const T = window.teduh; const s = T.game.s; const S = T.S;
  s.credits = 248; s.quest = 6; s.clock = 70; s.energy = 13;
  Object.assign(s.inv, { wood: 9, stone: 5, scrap: 3, fiber: 4, wire: 1, plank: 2, basil: 3, seed_basil: 2, seed_tomato: 2 });
  const placeIf = (id, x, z, r) => { try { S.addItem(s, id, 1); S.place(s, id, x, z, r || 0); } catch (e) {} };
  placeIf('solar', 2, 2, 0);
  placeIf('turbine', 3, -2, 0);
  placeIf('lamp', -1, 3, 0);
  placeIf('bench', 0, 3, 0);
  placeIf('planter', 3, 0, 0);
  s.skills.craft.level = 2; s.skills.engineer.level = 2;
  T.game.setSetting && T.game.setSetting('quality', 'high');
  T.teleport(-2.6, -1.9); s.pos.f = Math.PI;
  T.afterChange();
}"""

TITLE = """() => {
  document.getElementById('hud').style.visibility = 'hidden';
  const card = document.createElement('div');
  card.id = 'banner-title';
  card.style.cssText = 'position:fixed;left:56px;bottom:56px;max-width:560px;padding:28px 32px;' +
    'background:rgba(248,243,232,0.94);border:1px solid #23302a;border-radius:6px;color:#23302a;z-index:99';
  card.innerHTML = '<div style="font:600 13px/1.2 Figtree,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#2f5d4a">' +
    'Free cozy life sim &middot; browser &middot; offline</div>' +
    '<div style="font:600 64px/1.02 Fraunces,serif;margin:10px 0 12px">Teduh</div>' +
    '<div style="font:400 20px/1.4 Figtree,sans-serif">A calm sky village you build with sun, wind and friends.</div>';
  document.body.appendChild(card);
}"""


def open_game(browser, width, height, mobile=False):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=2 if mobile else 1,
        is_mobile=mobile,
        has_touch=mobile,
    )
    context.add_init_script(HIGH)
    page = context.new_page()
    page.set_default_timeout(180000)
    page.goto(BASE, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_function("() => window.teduh && window.teduh.game && window.teduh.game.s", timeout=120000)
    page.wait_for_timeout(5000)  # let the perf watcher finish, then force high graphics back on
    page.evaluate(SETUP)
    page.wait_for_timeout(2500)
    return context, page


ONLY = set(sys.argv[1].split(",")) if len(sys.argv) > 1 else {"banner", "demo", "phone"}

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])

    if "banner" in ONLY:
        context, page = open_game(browser, 1280, 640)
        page.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
        page.evaluate(TITLE)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(OUT / "banner.jpg"), type="jpeg", quality=86)
        page.evaluate("() => document.getElementById('banner-title').remove()")
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / "scene.jpg"), type="jpeg", quality=86)
        context.close()

    if "demo" in ONLY:
        context, page = open_game(browser, 1440, 900)
        page.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "demo.png"))
        context.close()

    if "phone" in ONLY:
        context, page = open_game(browser, 390, 844, mobile=True)
        page.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "phone.png"))
        context.close()

    for mode, size, mobile in (("deskpanel", (1440, 900), False), ("phonepanel", (390, 844), True)):
        if mode in ONLY:
            context, page = open_game(browser, size[0], size[1], mobile=mobile)
            page.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
            page.keyboard.press("e")
            page.wait_for_timeout(1500)
            page.screenshot(path=str(OUT / f"{mode}.png"))
            context.close()

    browser.close()

print("ok", sorted(f.name for f in OUT.iterdir()))
sys.stdout.flush()
os._exit(0)
