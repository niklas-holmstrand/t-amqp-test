#!/bin/bash
#
# Start all components for a simulated factory
#

# Start message broker unless already started
./start_mq.sh


# Start factory configuration datasource
gnome-terminal --tab -- start_scripts/run_facdata.sh

# simulators and their resource magagers
gnome-terminal --tab -- start_scripts/run_sim.sh 0
gnome-terminal --tab -- start_scripts/run_resmgr.sh 0
gnome-terminal --tab -- start_scripts/run_sim.sh 1
gnome-terminal --tab -- start_scripts/run_resmgr.sh 1

# Let machines start before starting GUI provider
sleep 1

# Start gui provider
gnome-terminal --tab -- start_scripts/run_guiprov.sh

# Start gui server
gnome-terminal --tab -- start_scripts/start_gui.sh

