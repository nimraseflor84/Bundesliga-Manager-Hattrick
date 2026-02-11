#!/usr/bin/env python3
"""
Builds a single self-contained HTML file bundling all CSS, JS, and data.
The output file can be shared and opened on any phone browser.
"""

import os
import re
import base64

PROJECT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(PROJECT, 'BundesligaManagerHattrick.html')

def read_file(path):
    with open(os.path.join(PROJECT, path), 'r', encoding='utf-8') as f:
        return f.read()

def read_binary(path):
    with open(os.path.join(PROJECT, path), 'rb') as f:
        return f.read()

def strip_imports(js):
    """Remove import/export statements and make code work as plain JS."""
    # Remove import lines
    js = re.sub(r"import\s+\{[^}]*\}\s+from\s+'[^']*';\n?", '', js)
    js = re.sub(r"import\s+\{[^}]*\}\s+from\s+\"[^\"]*\";\n?", '', js)
    # Remove 'export ' prefix but keep the declaration
    js = re.sub(r'^export\s+(class|function|const|let|var)\s', r'\1 ', js, flags=re.MULTILINE)
    # Remove 'export default'
    js = re.sub(r'^export\s+default\s+', '', js, flags=re.MULTILINE)
    return js

# Collect CSS
css_theme = read_file('css/dos-theme.css')
css_main = read_file('css/main.css')

# Encode fonts as base64 data URIs
font_press = base64.b64encode(read_binary('fonts/PressStart2P-Regular.woff2')).decode()
font_vt323 = base64.b64encode(read_binary('fonts/VT323-Regular.woff2')).decode()

# Replace font URLs in CSS with data URIs
css_theme = css_theme.replace(
    "url('../fonts/PressStart2P-Regular.woff2')",
    f"url('data:font/woff2;base64,{font_press}')"
)
css_theme = css_theme.replace(
    "url('../fonts/VT323-Regular.woff2')",
    f"url('data:font/woff2;base64,{font_vt323}')"
)

# Encode icon as base64
icon_b64 = base64.b64encode(read_binary('icons/icon-192.png')).decode()

# Collect JS modules in dependency order
js_files = [
    # Core
    'src/core/EventBus.js',
    'src/core/GameState.js',
    'src/core/Router.js',
    'src/core/SaveManager.js',
    'src/core/AudioManager.js',
    # Data
    'src/data/teams-bl1.js',
    'src/data/players-bl1.js',
    'src/data/formations.js',
    # Engine
    'src/engine/Calendar.js',
    'src/engine/MatchEngine.js',
    'src/engine/FinanceEngine.js',
    'src/engine/LeagueManager.js',
    'src/engine/TransferMarket.js',
    # UI
    'src/ui/Screen.js',
    'src/ui/TitleScreen.js',
    'src/ui/NewGameScreen.js',
    'src/ui/DashboardScreen.js',
    'src/ui/MatchDayScreen.js',
    'src/ui/LeagueTableScreen.js',
    'src/ui/FixturesScreen.js',
    'src/ui/SquadScreen.js',
    'src/ui/TacticsScreen.js',
    'src/ui/FinancesScreen.js',
    'src/ui/StadiumScreen.js',
    'src/ui/TransferScreen.js',
    # Entry
    'app.js',
]

all_js = []
for path in js_files:
    js = read_file(path)
    js = strip_imports(js)
    all_js.append(f'// === {path} ===\n{js}')

combined_js = '\n\n'.join(all_js)

# Build the inline manifest for PWA
manifest_json = '''{
  "name": "Bundesliga Manager Hattrick",
  "short_name": "BM Hattrick",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0a2e",
  "theme_color": "#000080",
  "start_url": ".",
  "icons": [{"src": "data:image/png;base64,''' + icon_b64 + '''", "sizes": "192x192", "type": "image/png"}]
}'''

# Build the output HTML
html = f'''<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Bundesliga Manager Hattrick</title>
    <meta name="theme-color" content="#000080">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="BM Hattrick">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="format-detection" content="telephone=no">
    <link rel="apple-touch-icon" href="data:image/png;base64,{icon_b64}">
    <link rel="manifest" href="data:application/json;base64,{base64.b64encode(manifest_json.encode()).decode()}">
    <style>
{css_theme}
{css_main}
    </style>
</head>
<body class="scanlines">
    <div id="app"></div>
    <button id="audio-toggle" style="position:fixed;bottom:12px;right:12px;z-index:9999;background:#000080;color:#fff;border:2px outset #aaa;font-size:1.4rem;width:40px;height:40px;cursor:pointer;padding:0;line-height:40px;text-align:center;">🔊</button>
    <script>
{combined_js}
    </script>
</body>
</html>
'''

with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(html)

size_mb = os.path.getsize(OUTPUT) / (1024 * 1024)
print(f'Build erfolgreich: {OUTPUT}')
print(f'Dateigroesse: {size_mb:.1f} MB')
print(f'Diese Datei kann per WhatsApp, AirDrop, E-Mail etc. geteilt werden.')
print(f'Empfaenger oeffnen sie im Browser und koennen sie zum Homescreen hinzufuegen.')
