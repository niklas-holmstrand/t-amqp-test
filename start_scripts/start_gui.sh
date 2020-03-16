#!/bin/bash
#
# start gui
#
cd frontend/tpsys_tiny

# Set tab title
tabTitle="Front end"
printf "\e]2;$tabTitle\a"

# Start the gui server
npm start