#!/bin/bash
#
# start tpsys simulator
#
cd tpsys_sim

# Set tab title
tabTitle="sim$1"
printf "\e]2;$tabTitle\a"

# Start the simulator
echo "Starting simulator $1"
node tpsys_sim_tunnel-mqtt.js $1