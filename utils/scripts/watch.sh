#! /bin/bash

eval "
live-server ./www --port 8080 --no-browser&
webpack watch --progress --mode development
"