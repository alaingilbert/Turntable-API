#!/usr/bin/env python
import os
import re
from setuptools import setup

MODULE_NAME = 'ttapi'

HERE = os.path.abspath(os.path.dirname(__file__))
INIT = open(os.path.join(HERE, '{0}.py'.format(MODULE_NAME))).read()
README = open(os.path.join(HERE, 'README.md')).read()
VERSION = re.search("__version__ = '([^']+)'", INIT).group(1)


setup(name=MODULE_NAME,
      version=VERSION,
      author='Alain Gilbert',
      author_email='alain.gilbert.15@gmail.com',
      url='https://github.com/alaingilbert/Turntable-API/tree/python_ttapi',
      description='Allows you to create bots for turntable.fm.',
      long_description=README,
      license='MIT',
      keywords='turntable bot',
      classifiers=['Environment :: Console',
                   'License :: OSI Approved :: MIT License',
                   'Intended Audience :: Developers',
                   'Natural Language :: English',
                   'Operating System :: OS Independent',
                   'Programming Language :: Python :: 2.6',
                   'Programming Language :: Python :: 2.7',
                   #'Programming Language :: Python :: 3.2',
                   'Topic :: Utilities'],
      install_requires=['websocket-client'],
      py_modules=[MODULE_NAME])
