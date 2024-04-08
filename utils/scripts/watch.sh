#! /bin/bash

eval "
webpack watch --progress --mode development&
live-server ./www --port 8080 --no-browser
"