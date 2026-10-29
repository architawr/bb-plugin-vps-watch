# VPS Watch Lite

Linux VPS monitoring over the local SSH client. No packages or files installed remotely. One short SSH connection every 5 minutes by default (5–60 configurable). Reads /proc/stat, /proc/meminfo, /proc/uptime, /proc/loadavg and df for root disk and inodes. CPU is averaged between successful samples; the first sample is unknown. No directory walks, logs, process scans, Docker access, AI or remote mutations.

Open Settings → VPS Watch Lite. Enter a preconfigured SSH alias, choose interval, enable and save. Open VPS Watch in the sidebar to see the dashboard. First verify the alias with ordinary SSH. Batch authentication and strict host key verification are required; the plugin never accepts new host keys. Keys stay in SSH configuration, not plugin storage. Remote Linux requires MemAvailable in /proc/meminfo. The SSH client runs on the BB server machine.

Stores up to 288 successful samples locally (24h at 5 minutes). Manual refresh is rate limited too. A failed connection takes at most 15 seconds and is retried at the normal interval. No collection while BB is stopped; no push notifications in this lite version. Old values remain timestamped after errors or pauses.

CLI: `bb vps-watch status` reads cached status only.

Dashboard follows Burn’s compact KPI layout. Absolute RAM and root disk capacities use GiB/MiB (binary units); inode counts are exact. CPU vCPU is usage percent multiplied by logical CPU count, not a count of processes. Old samples keep their percentages and show unknown absolutes until the next measurement. Disk percent follows df semantics (including reserved blocks), so used / total may differ from the displayed df percentage.
