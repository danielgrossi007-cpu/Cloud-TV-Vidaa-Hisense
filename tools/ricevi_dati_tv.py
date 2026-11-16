# Riceve i dati inviati dalla Home della TV (Impostazioni > Supporto > Servizi della TV > Invia i dati della TV al PC)
# e li salva nella cartella "dati-tv" accanto a questo file. Non manda nulla da nessuna parte.
# Avvio: doppio clic su questo file oppure  python ricevi_dati_tv.py   (se Windows chiede il permesso di rete, consenti "Reti private").
import http.server, socket, os, urllib.parse, datetime

PORTA = 8765
CARTELLA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dati-tv')
os.makedirs(CARTELLA, exist_ok=True)

def ip_locale():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1)); return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()

class Gestore(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        self.send_response(200); self._cors(); self.send_header('Content-Type', 'text/plain; charset=utf-8'); self.end_headers()
        self.wfile.write('Ricevitore attivo. I file arrivano in: {}\n'.format(CARTELLA).encode('utf-8'))

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        nome = os.path.basename(q.get('name', ['senza-nome.txt'])[0]).replace('..', '_') or 'senza-nome.txt'
        i = int(q.get('i', ['0'])[0]); n = int(q.get('n', ['1'])[0])
        dati = self.rfile.read(int(self.headers.get('Content-Length', '0') or 0))
        percorso = os.path.join(CARTELLA, nome)
        with open(percorso, 'wb' if i == 0 else 'ab') as f:
            f.write(dati)
        print('{}  {}  parte {}/{}  ({} byte)'.format(datetime.datetime.now().strftime('%H:%M:%S'), nome, i + 1, n, len(dati)))
        self.send_response(200); self._cors(); self.send_header('Content-Type', 'text/plain'); self.end_headers(); self.wfile.write(b'ok')

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    print('Ricevitore pronto.')
    print('Sulla TV scrivi questo indirizzo:  {}:{}'.format(ip_locale(), PORTA))
    print('I file verranno salvati in: ' + CARTELLA)
    print('Lascia aperta questa finestra finché la TV non dice "Fatto".')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORTA), Gestore).serve_forever()
