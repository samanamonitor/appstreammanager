FROM python:3.12
COPY . /usr/src
WORKDIR /usr/src
RUN pip install --no-cache-dir --upgrade pip
RUN pip install  --no-cache-dir -r requirements.txt
RUN python3 setup.py build
RUN python3 setup.py install
RUN rm -Rf /usr/src/*

ENTRYPOINT [ "/usr/local/bin/server.py", "/var/www/html" ]