import boto3
import os
from http.server import BaseHTTPRequestHandler
from http import cookies
import shutil
import json

__version__ = "0.0.1"

ERROR_MESSAGE_FORMAT = """\
{
	"code": %(code)d,
	"message": "%(message)s",
	"explain": "%(explain)s"
}
"""

RDP_STRING = """
screen mode id:i:1
use multimon:i:0
desktopwidth:i:1440
desktopheight:i:873
session bpp:i:32
winposstr:s:0,1,0,0,1440,833
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
videoplaybackmode:i:1
connection type:i:7
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enableworkspacereconnect:i:0
disable wallpaper:i:0
allow font smoothing:i:0
allow desktop composition:i:0
disable full window drag:i:1
disable menu anims:i:1
disable themes:i:0
disable cursor setting:i:0
bitmapcachepersistenable:i:1
full address:s:%s

audiomode:i:0
redirectprinters:i:1
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
redirectposdevices:i:0
autoreconnection enabled:i:1
authentication level:i:2
prompt for credentials:i:0
negotiate security layer:i:1
remoteapplicationmode:i:0
alternate shell:s:
shell working directory:s:
gatewayhostname:s:
gatewayusagemethod:i:4
gatewaycredentialssource:i:4
gatewayprofileusagemethod:i:0
promptcredentialonce:i:0
gatewaybrokeringtype:i:0
use redirection server name:i:0
rdgiskdcproxy:i:0
kdcproxyname:s:
smart sizing:i:1
dynamic resolution:i:1
"""

class ASMHandler(BaseHTTPRequestHandler):
	mime_mapping = {
		"html": "text/html",
		"json": "application/json",
		"css": "text/css",
		"js": "text/javascript"
	}
	def __init__(self, request, client_address, server):
		self.server_version = "HTTP/1.1"
		self._default_roots = [ "index.html" ]
		self.session = None
		self.session_data = {}
		self.error_content_type = "application/json"
		self.error_message_format = ERROR_MESSAGE_FORMAT
		super().__init__(request, client_address, server)

	def do_GET(self):
		self.serve_file()

	def do_POST(self):
		if self.path == "/do":
			self.do()
		else:
			self.send_error(400, "Invalid Request", "invalid path")

	def do(self):
		content_type = self.headers.get("content-type")
		length = self.headers.get('content-length')
		text = self.rfile.read(int(length))
		post_data = json.loads(text)
		res = {
			"result": "Error"
		}
		try:
			if 'action' not in post_data:
				raise Exception("action missing")
			action = post_data.pop('action')
			if action == "appstream":
				self.send_json(self.appstream(post_data))
				return
			elif action == "rdp":
				self.send_rdp(post_data)
		except Exception as e:
			self.send_error(400, "Invalid Request", str(e))

	def appstream(self, data):
		try:
			region_name = data.pop('region_name')
		except KeyError:
			raise Exception("Invalid Region")
		try:
			aws_session_token = data.pop('aws_session_token')
			aws_access_key_id = data.pop('aws_access_key_id')
			aws_secret_access_key = data.pop('aws_secret_access_key')
		except KeyError:
			raise Exception("Invalid Authentication")
		method = data.pop('method')
		client = boto3.client('appstream', 
			region_name=region_name,
			aws_session_token=aws_session_token,
			aws_access_key_id=aws_access_key_id,
			aws_secret_access_key=aws_secret_access_key)

		func = getattr(client, method)
		res = func(**data)
		return res

	def send_json(self, data):
		body = json.dumps(data, default=str)
		self.send_response(200, "OK")
		self.send_header("Connection", "close")
		self.send_header("Content-Type", "application/json")
		self.send_header('Content-Length', len(body))
		self.end_headers()
		self.wfile.write(body.encode("UTF-8", "replace"))

	def send_rdp(self, data):
		body = RDP_STRING % data['ipaddress']
		self.send_response(200, "OK")
		self.send_header("Connection", "close")
		self.send_header("Content-Type", "application/x-rdp")
		self.send_header('Content-Disposition', 'attachment; filename=samm-connection.rdp')
		self.send_header('Content-Length', len(body))
		self.end_headers()
		self.wfile.write(body.encode("UTF-8", "replace"))


	def serve_file(self):
		req_file = self.htroot + self.path
		if os.path.isdir(req_file):
			for rootfile in self._default_roots:
				if os.path.isfile(req_file + "/" + rootfile):
					req_file = req_file + "/" + rootfile
					break
		if not os.path.isfile(req_file):
			self.send_error(404, "Not Found", "file not found")
			return
		_, _, extension = req_file.rpartition(".")

		self.send_response(200, "OK")
		self.send_header("Connection", "close")
		self.send_header("Content-Type", self.mime_mapping.get(extension, "text/plain"))
		file_stats = os.stat(req_file)
		f = open(req_file, "rb")
		self.send_header('Content-Length', str(file_stats.st_size))
		self.end_headers()
		shutil.copyfileobj(f, self.wfile)

