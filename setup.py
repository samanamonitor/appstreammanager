from setuptools import setup, find_packages
from appstreammanager import __version__
import os

if __name__ == "__main__":
    setup(
        name='appstreammanager',
        version=__version__,
        packages=find_packages(include=['appstreammanager', 'appstreammanager.*']),
        scripts=['scripts/server.py'],
        data_files=[
            ('/var/www/html/js', [ 'htdocs/js/functions.js' ]),
            ('/var/www/html/style', [ 'htdocs/style/style.css' ]),
            ('/var/www/html', [ 'htdocs/index.html' ]),
            ('/usr/share/appstreammanager', [ 'requirements.txt' ] )
        ],
        install_requires=[ "boto3" ]
    )
