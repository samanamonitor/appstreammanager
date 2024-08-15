# Build image
`docker build --tag asmdev --no-cache .`

# Run dev container
`docker run -idt --name asmdev -v $(pwd):/usr/src/asmdev -p 8000:8000  asmdev /bin/bash`

# Compose
* Edit the file at nginx/appstreammanager.conf to set ssl certificates and ports
* Register DNS records to point to this host
* point the browser to https://hostname
Run
`docker compose up`