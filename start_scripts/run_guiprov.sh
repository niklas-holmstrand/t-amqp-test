#!/bin/bash
#
# start gui provider
#
cd gui_provider

# Set tab title
tabTitle="gui provider"
printf "\e]2;$tabTitle\a"

# Start the simulator
echo "Starting gui provider..."
node gui_provider.js  &>"gui_provider.log"