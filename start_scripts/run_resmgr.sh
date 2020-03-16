#!/bin/bash
#
# start resoruce_manager
#
cd resource_mgr

# Set tab title
tabTitle="rmgr$1"
printf "\e]2;$tabTitle\a"

# Start the simulator
echo "Starting resource_mgr $1"
node resource_mgr.js $1 &>"resmgr$1.log"

