#!/bin/bash
#
# start tpsys simulator
#
cd factory_data

# Set tab title
tabTitle="factory-data"
printf "\e]2;$tabTitle\a"

# Start the simulator
echo "Starting factory data provider"
node factory_data.js