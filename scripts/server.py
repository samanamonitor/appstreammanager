import sys
from http.server import ThreadingHTTPServer, _get_best_family
from appstreammanager import ASMHandler
import logging


PORT = 8000

log = logging.getLogger(__name__)

def main(argv):
	logging.basicConfig(stream=sys.stderr)
	log.setLevel("INFO")
	ThreadingHTTPServer.address_family, addr = _get_best_family(None, PORT)
	ASMHandler.protocol_version = "HTTP/1.1"
	ASMHandler.htroot = argv[1]
	with ThreadingHTTPServer(addr, ASMHandler) as httpd:
		host, port = httpd.socket.getsockname()[:2]
		url_host = f'[{host}]' if ':' in host else host
		log.info(
			f"Serving HTTP on {host} port {port} "
			f"(http://{url_host}:{port}/) ..."
		)
		try:
			httpd.serve_forever()
		except KeyboardInterrupt:
			log.warning("\nKeyboard interrupt received, exiting.")
			sys.exit(0)

if __name__ == '__main__':
	if len(sys.argv) != 2:
		log.error("Invalid number of parameters. Expecting <path to static content>")
		exit(1)
	main(sys.argv)
