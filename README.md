
# Simulation of tpsys and stack up to GraphQL and react app

Make sure proto compiler, protoc, is install and compile proto-files
./build.sh

If not done already, install needed node packages
npm install
cd frontend/tpsys_tiny
npm install


Tha factory configuration is fetched from smtdb or from own hardcoded DB simulation. 
This selection in done by commenting one of these in factory_data/factory_data.js. The hardcoded
factory is found in factory_data/myFactory.js


## Start all components for a simulated factory in separated gnome-terminal tabs

./spinup_factory.sh
(if message broker is already running some docker complaints have to be ignored)

If all goes well a all components are started an a webbrowser is opened connected to factory.

Broker administration on 
http://localhost:18083 (emqpx, admin/public)
http://localhost:8080 (rabbitmq, guest/guest)


## Start components manually

Start tpsys simulator:
cd tpsys_sim
node tpsys_sim.js [machineNo = 0,1...]
stdin commands: magrem (slotNo), magbut (slotno), magins (slotno) (name)


To access machine directly via gRPC-tunnel (incomplete!)
cd cli_client
node cli_client.js <machineNo> <cmd>
example
node cli_client 0 play



To start a resource manager connecting to machine and AMQP-server
cd resource_mgr
node resource_mgr.js <machineNo>


To start AMQP-server
Make sure docker and rabbitMq image is available
./start_mq.sh


To acces machines from ampq client
cd resource_mgr
node test_client_pp.js <machineNo> <cmd>
Note cmd "monitor" for subscribing to different topics


To follow state of factory
cd status_mon
node status_mon.js   - just a dumb thing that collects status updates and presents collected state
node status_cache.js - builds a cache of all machines and request their data to create a fresh cache


Start tiny gui (dev server)
cd frontend/tpsys_tiny
npm start
browse to localhost:3000 for react gui(s)







# ================== old stuff =======================


Access the tpsys simmulator from cli
cd cli_client
node cli_client.js  [machineNo] [cmd]
cmd = "help" will output a list of available commands


Start machine agent server
cd machine_agent
node tpsys_agent.js
and browse to 
- localhost:3002/pe for rest/json   (OBSOLETE! some resudues in code may still remain)
- localhost:4000 for graphql interface
(NOTE currently number of running machines expected is determined in graphql_api.js:myMachines. At time
of writing this it is 2 machines ie id 0 and id 1)


Start tiny gui (dev server)
cd frontend/tpsys_tiny
npm start
browse to localhost:3000 for react gui(s)


Start another sample service (here: Java based dummy server) used by machine agent
Make sure java-8 is installed and that JAVA_HOME points to installation eg JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64/jre
cd sample_java_server
./gradlew run
Browse to localhost:4000 for graphql interface
Run mutation "login(name: "putte", pw: "putte")  {errCode, errMsg}"  -- with same name&pw login shall succeed


Simulation of missing components:
IF magazine in slot 8 is deactivated (eg by "magbut 8" ins simulators stdin) the production engine will 
start missing 25 components and corresponding 2 operator alerts will be activated. Production engine 
will also pause when only 25 components are left to mount. It is then not possible to start until
magazine have been reactivated.

Feeder Trimming
In the FEEDER TRIMMING tab there are several ways to deal with camera movement and selection using annotation.

Image stitching
To enable this feature, edit /frontend/tpsys_tiny/src/index.js - comment current httpLink and uri. You will find comments explaining the needed changes.
There is a new service providing stitching of images. This service must run when you want to try this feature. Do either:
- open solution in Visual Studio and run. 
- navigate to .csproj location using command line and execute "dotnet run" // you must have dotnet installed

In the IMAGE STITCHING tab, there is simulation of a situation where the operator only sees part of the package. ZOOM OUT button activates stitching mechanism - it simulates taking multiple photos of the package and stitch them together.  

Testing
Install Cypress - execute under /frontend/tpsys_tiny/  "yarn add cypress --dev". 
All test files are under /frontend/tpsys_tiny/cypress. 
To run Cypress: go to /frontend/tpsys_tiny and execute "yarn run cypress open"
Both machine agent and tpsys simulator must be running.
