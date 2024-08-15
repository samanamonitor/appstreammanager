FROM python:3.12
COPY . /usr/src
RUN <<EOF
pip install --no-cache-dir --upgrade pip
cd /usr/src
pip install  --no-cache-dir -r requirements.txt
python3 setup.py build
python3 setup.py install
rm -Rf /usr/src/*
EOF

ENTRYPOINT [ "/usr/local/bin/server.py", "/var/www/html" ]