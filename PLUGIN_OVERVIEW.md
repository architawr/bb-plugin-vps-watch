## What you get

Keep an eye on a personal Linux VPS from a BB sidebar panel. Resource cards show CPU, memory, root filesystem space and inode usage, with percentages and absolute capacities. See uptime, load averages and compact history charts for the last 1, 6 or 24 hours.

## How it works

The plugin makes one short, read-only SSH request per interval, starting at five minutes. It reads Linux system counters and root filesystem statistics. It installs no agent or packages on the VPS and does not scan directories, logs or processes. Up to 288 successful measurements stay in BB storage.

CPU usage is averaged between measurements; the first measurement has no CPU value. The vCPU figure is an equivalent load across logical CPUs. Memory and disk capacities use binary units. Older measurements without capacities remain visible with unknown absolute values.

## Setup and requirements

Open BB Settings, select VPS Watch Lite, enter an existing SSH alias and enable collection. The SSH client and configuration belong to the computer running the BB server. Key authentication and an already trusted host key are required. The target must run Linux with MemAvailable in /proc/meminfo and provide awk, cat and df.

## Operating limits

Collection stops when BB is not running. Connection failures leave the previous successful measurement visible with its timestamp. Gaps in charts are not joined. Manual checks respect the configured interval. This version provides dashboard warnings, with no push alerts, remote cleanup or service restarts. No external API, AI service or paid account is required.
