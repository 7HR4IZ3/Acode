cmd_Release/deasync.node := ln -f "Release/obj.target/deasync.node" "Release/deasync.node" 2>/dev/null || (rm -rf "Release/deasync.node" && cp -af "Release/obj.target/deasync.node" "Release/deasync.node")
