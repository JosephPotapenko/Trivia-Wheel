import os
import json
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


ROOT_DIR = os.path.dirname(__file__)
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets')
DATA_DIR = os.path.join(ASSETS_DIR, 'data')
STORIES_PATH = os.path.join(DATA_DIR, 'stories.txt')


def ensure_assets_dir():
	try:
		os.makedirs(ASSETS_DIR, exist_ok=True)
		os.makedirs(DATA_DIR, exist_ok=True)
	except Exception:
		pass


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

	def do_POST(self):
		ensure_assets_dir()
		if self.path == '/api/export-submissions':
			payload = self._read_json()
			text = payload.get('text', '')
			# Normalize line endings, ensure trailing newline
			normalized = text.replace('\r\n', '\n').replace('\r', '\n')
			if normalized and not normalized.endswith('\n'):
				normalized += '\n'
			try:
				with open(STORIES_PATH, 'w', encoding='utf-8') as f:
					f.write(normalized)
				self._write_json(200, {'ok': True, 'written': len(normalized)})
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
				self._write_json(200, {'ok': True})
			except Exception as e:
				self._write_json(500, {'ok': False, 'error': str(e)})
			return

		if self.path.startswith('/api/import'):
			# Read stored stories and return processed Q/A items.
			params = {}
			try:
				q = urllib.parse.urlparse(self.path).query
				params = urllib.parse.parse_qs(q)
			except Exception:
				params = {}
			ru = str(params.get('ru', ['false'])[0]).lower() == 'true'
			items = []
			try:
				if os.path.exists(STORIES_PATH):
					with open(STORIES_PATH, 'r', encoding='utf-8') as f:
						lines = [ln.strip() for ln in f.read().splitlines() if ln.strip()]
					for ln in lines:
						if '||' in ln:
							qq, aa = ln.split('||', 1)
							story = (qq or '').strip()
							name = (aa or '').strip()
						else:
							story = ln
							name = ''
						q_text = _sanitize_story(story) or story
						a_text = name
						if ru:
							q_text = _translate_text(q_text, 'RU') or q_text
							a_text = _translate_text(a_text, 'RU') or a_text
						else:
							# Ensure English output when source is Russian
							if _is_cyrillic(q_text):
								q_text = _translate_text(q_text, 'EN') or q_text
							if _is_cyrillic(a_text):
								a_text = _translate_text(a_text, 'EN') or a_text
						items.append({'q': q_text, 'a': a_text, 'used': False})
				self._write_json(200, {'ok': True, 'items': items, 'count': len(items)})
			except Exception as e:
				self._write_json(500, {'ok': False, 'error': str(e)})
			return

		# Fallback
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


# --- Helpers: sanitization and translation ---

def _is_cyrillic(text: str) -> bool:
	try:
		return any('\u0400' <= ch <= '\u04FF' for ch in (text or ''))
	except Exception:
		return False


def _sanitize_story(story: str) -> str:
	"""Lightly sanitize input by normalizing whitespace and trimming."""
	s = (story or '').replace('\r\n','\n').replace('\r','\n')
	s = ' '.join(s.split())
	return s.strip()


def _translate_text(text: str, target_lang: str) -> str:
	"""Translate text to target_lang using public services.
	target_lang: 'RU' or 'EN'"""
	t = (text or '').strip()
	if not t:
		return ''
	# 1) MyMemory (GET)
	try:
		src = 'ru' if target_lang.upper() == 'EN' else 'en'
		tgt = target_lang.lower()
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
			src = 'ru' if target_lang.upper() == 'EN' else 'en'
			tgt = target_lang.lower()
			payload = json.dumps({ 'q': t, 'source': src, 'target': tgt, 'format': 'text' }).encode('utf-8')
			req = urllib.request.Request(endpoint, data=payload, headers={ 'Content-Type': 'application/json', 'Accept': 'application/json' })
			with urllib.request.urlopen(req, timeout=20) as resp:
				data = json.loads(resp.read().decode('utf-8'))
			out = (data.get('translatedText') or '').strip()
			if out:
				return out
		except Exception:
			continue
	return ''
