import os
import json
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


ROOT_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets')
DATA_DIR = os.path.join(ASSETS_DIR, 'data')
STORIES_PATH = os.path.join(DATA_DIR, 'stories.txt')
LEGACY_STORIES_PATH = os.path.join(ASSETS_DIR, 'stories.txt')


def ensure_assets_dir():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)


def _is_cyrillic(text: str) -> bool:
    try:
        return any('\u0400' <= ch <= '\u04FF' for ch in (text or ''))
    except Exception:
        return False


def _sanitize_story(story: str) -> str:
    """Lightly sanitize input by normalizing whitespace and trimming."""
    s = (story or '').replace('\r\n', '\n').replace('\r', '\n')
    s = ' '.join(s.split())
    return s.strip()


def _translate_text(text: str, target_lang: str) -> str:
    """Translate text to target_lang using public services. target_lang: 'RU' or 'EN'."""
    t = (text or '').strip()
    if not t:
        return ''

    src = 'ru' if target_lang.upper() == 'EN' else 'en'
    tgt = target_lang.lower()

    # 1) MyMemory (GET)
    try:
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(t)}&langpair={src}|{tgt}"
        with urllib.request.urlopen(url, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        out = ((data.get('responseData') or {}).get('translatedText') or '').strip()
        if out:
            return out
    except Exception:
        pass

    # 2) LibreTranslate (POST)
    for endpoint in ['https://libretranslate.de/translate', 'https://libretranslate.com/translate']:
        try:
            payload = json.dumps({'q': t, 'source': src, 'target': tgt, 'format': 'text'}).encode('utf-8')
            req = urllib.request.Request(
                endpoint,
                data=payload,
                headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            out = (data.get('translatedText') or '').strip()
            if out:
                return out
        except Exception:
            continue
    return ''


def _normalize_submissions_text(text: str) -> str:
    normalized = (text or '').replace('\r\n', '\n').replace('\r', '\n')
    lines = [ln.strip() for ln in normalized.split('\n') if ln.strip()]
    return ('\n'.join(lines) + '\n') if lines else ''


def _read_story_lines():
    """Read canonical stories, with a legacy fallback for older project copies."""
    paths = [STORIES_PATH, LEGACY_STORIES_PATH]
    seen = set()
    lines = []
    for path in paths:
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            for line in f.read().splitlines():
                line = line.strip()
                if line and line not in seen:
                    seen.add(line)
                    lines.append(line)
    return lines


def _items_from_story_lines(lines, ru=False):
    items = []
    for ln in lines:
        if '||' in ln:
            story, name = ln.split('||', 1)
        elif '|' in ln:
            story, name = ln.split('|', 1)
        else:
            story, name = ln, ''

        q_text = _sanitize_story(story) or story.strip()
        a_text = (name or '').strip()

        if ru:
            q_text = _translate_text(q_text, 'RU') or q_text
            a_text = _translate_text(a_text, 'RU') or a_text
        else:
            if _is_cyrillic(q_text):
                q_text = _translate_text(q_text, 'EN') or q_text
            if _is_cyrillic(a_text):
                a_text = _translate_text(a_text, 'EN') or a_text

        items.append({'q': q_text, 'a': a_text, 'used': False})
    return items


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _write_json(self, code: int, obj: dict):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get('Content-Length', '0') or '0')
        raw = self.rfile.read(length) if length > 0 else b''
        try:
            return json.loads(raw.decode('utf-8')) if raw else {}
        except Exception:
            return {}

    def _handle_import(self):
        params = {}
        try:
            q = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(q)
        except Exception:
            params = {}
        ru = str(params.get('ru', ['false'])[0]).lower() == 'true'
        try:
            lines = _read_story_lines()
            items = _items_from_story_lines(lines, ru=ru)
            self._write_json(200, {'ok': True, 'items': items, 'count': len(items)})
        except Exception as e:
            self._write_json(500, {'ok': False, 'error': str(e)})

    def do_GET(self):
        ensure_assets_dir()
        if self.path.startswith('/api/import'):
            self._handle_import()
            return
        super().do_GET()

    def do_POST(self):
        ensure_assets_dir()
        if self.path == '/api/export-submissions':
            payload = self._read_json()
            normalized = _normalize_submissions_text(payload.get('text', ''))
            try:
                with open(STORIES_PATH, 'w', encoding='utf-8') as f:
                    f.write(normalized)
                # Keep the older location in sync for project copies that still reference it.
                with open(LEGACY_STORIES_PATH, 'w', encoding='utf-8') as f:
                    f.write(normalized)
                self._write_json(200, {'ok': True, 'written': len(normalized), 'count': len([x for x in normalized.splitlines() if x.strip()])})
            except Exception as e:
                self._write_json(500, {'ok': False, 'error': str(e)})
            return

        if self.path == '/api/submit':
            payload = self._read_json()
            story = (payload.get('story') or '').strip()
            name = (payload.get('name') or '').strip()
            if not story or not name:
                self._write_json(400, {'ok': False, 'error': 'Missing story or name'})
                return
            line = f"{story}||{name}\n"
            try:
                with open(STORIES_PATH, 'a', encoding='utf-8') as f:
                    f.write(line)
                with open(LEGACY_STORIES_PATH, 'a', encoding='utf-8') as f:
                    f.write(line)
                self._write_json(200, {'ok': True})
            except Exception as e:
                self._write_json(500, {'ok': False, 'error': str(e)})
            return

        if self.path.startswith('/api/import'):
            self._handle_import()
            return

        self.send_error(404, 'Not Found')


def run(host='127.0.0.1', port=8000):
    ensure_assets_dir()
    os.chdir(ROOT_DIR)
    with ThreadingHTTPServer((host, port), Handler) as httpd:
        print(f"Serving at http://{host}:{port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    run()
