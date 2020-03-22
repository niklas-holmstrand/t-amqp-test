/*
 * Monitor factory status
 * 
 */


///////////////////// MQTT connection ///////////////////////////
//
//
const mqtt = require('mqtt')

//
// mqtt connection
//
const TCP_URL = 'mqtt://localhost:1883'
const TCP_TLS_URL = 'mqtts://localhost:8883'

const options = {
    connectTimeout: 4000,

    // Authentication
    clientId: 'StatusMon',
    // username: 'emqx',
    // password: 'emqx',

    keepalive: 60,
    clean: true,
}

mqttClient = mqtt.connect(TCP_URL, options)
mqttClient.on('connect', () => {
  console.log('mqtt connected');
})

subscriptionTopics = ['factory/Config/Lines',
'factory/Config/Machines',
'factory/Config/ProductData', 
'factory/PnP/Machines/+/State/Availability',
'factory/PnP/Machines/+/State/ProductionEngine',
'factory/PnP/Machines/+/State/ComponentLoading',
'factory/PnP/Machines/+/State/Notifications'];

mqttClient.subscribe(subscriptionTopics, (err) => {
  if(err) { console.log('guiprovider mqtt subs error:', err)}
})

mqttClient.on('message', (topic, message) => {
  //console.log('got mqtt:', topic, message.toString())
  handleStatusUpdates(topic, message);
})


function handleStatusUpdates(topic, message) {

  switch(topic) {
    case 'factory/Config/Lines':  myStatusCache['factory']['Config']['Lines'] = JSON.parse(message);    return;
    case 'factory/Config/Machines':  initStatusCache(JSON.parse(message));  return;
    case 'factory/Config/ProductData':  myStatusCache['factory']['ProductData']['Layouts'] = JSON.parse(message);      return;
  }

  if (topic.indexOf('/State/Availability') == -1 &&
      topic.indexOf('/State/ProductionEngine') == -1 &&
      topic.indexOf('/State/ComponentLoading') == -1 &&
      topic.indexOf('/State/Notifications') == -1 ) {
    console.log('Got unexpected topic:', topic); 
    return;
  }


  topicPath = topic.split("/");
  machineId = topicPath[3];
  machineTopic = topicPath[5]
  recState = JSON.parse(message);
  //console.log("Handle status update", machineId, machineTopic, recState);

  assertMachine(machineId);

  if (machineTopic == "Availability") {
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Availability']  = recState; 
  }

  if (machineTopic == "ProductionEngine") {
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['ProductionEngine']  = recState; 
  }

  if (machineTopic == "Notifications") {
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Notifications']  = recState; 
  }

  if (machineTopic == "ComponentLoading") {
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['ComponentLoading']  = recState; 
  }

}
  
//////////////////////////////////////////////////////////////////////////////////
//
// My status chache
//
var myStatusCache = {}; // The one
myStatusCache['factory'] = {};
myStatusCache['factory']['PnP'] = {};
myStatusCache['factory']['PnP']['Machines'] = [];
myStatusCache['factory']['Config'] = {};
myStatusCache['factory']['Config']['Lines'] = [];
myStatusCache['factory']['Config']['Machines'] = [];
myStatusCache['factory']['ProductData'] = {};
myStatusCache['factory']['ProductData']['Layouts'] = [];


defaultMeta =  {
   name: '---',
   hostname: '---',
   placeInLine: -1,
   model: '---',
};

defaultAv =  {
  resMgrRunning: false,
  resourceConnected: false,
  resourceBusy: false,
  controlOwner: ''
};

defaultPe = {
  state: 'Undefined',
  batchId: '',
  layoutName: '',
  batchSize: -1,
  boardsCompleted: -1,
  componentsPerBoard: -1,
  componentsLeft: -1,
  componentsMissing: -1
};

function initStatusCache(machines) {
  //console.log('initStatusCache enter', machines)

  myStatusCache['factory']['Config']['Machines'] = machines;

  machines.forEach(m => { 
    assertMachine(m.id);

    myStatusCache['factory']['PnP']['Machines'][m.id]['State']['Meta']  = {};
    myStatusCache['factory']['PnP']['Machines'][m.id]['State']['Meta'].name = m.name;
    myStatusCache['factory']['PnP']['Machines'][m.id]['State']['Meta'].hostname = m.hostname;
    myStatusCache['factory']['PnP']['Machines'][m.id]['State']['Meta'].placeInLine = m.placeInLine;
    myStatusCache['factory']['PnP']['Machines'][m.id]['State']['Meta'].model = m.model;
  });

  presentStatus();
  console.log('########');
}

//
// Make sure a machine exist in cache. Create default one if not
//
function assertMachine(machineId) {
  if(!myStatusCache['factory']['PnP']['Machines'][machineId]) {     // If machine dont exist in cache
    myStatusCache['factory']['PnP']['Machines'][machineId] = {};    // Create it
    myStatusCache['factory']['PnP']['Machines'][machineId]['State'] = {};
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Meta']  = defaultMeta;
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Availability'] = defaultAv;
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['ProductionEngine'] = defaultPe;
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['ComponentLoading'] = {};
    myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Notifications'] = [];
  }
}

//////////////////////////////////////////////////////////////////////////////////
//
// presentation of state
//
pageNo = 0;
var sprintf = require('sprintf-js').sprintf;

function presentProp(title, machineTopic, propery) {
    s = sprintf('%20s', title)
    myStatusCache['factory']['PnP']['Machines'].forEach((val, i) => {
        s = s + sprintf('%17s', myStatusCache['factory']['PnP']['Machines'][i]['State'][machineTopic][propery])
    });
    console.log(s);
}

nPresentations = 0;

function presentStatus() {
//  return;
  setTimeout(presentStatus, 200)
  console.clear();


  s = sprintf('%20s', "MachineId ")
  myStatusCache['factory']['PnP']['Machines'].forEach((val, i) => {
      s = s + sprintf('%17s', i)
  });
  console.log(s);
  console.log();

  presentProp("Name:", 'Meta', "name");
  presentProp("Host name:", 'Meta', "hostname");
  presentProp("Model:", 'Meta', "model");
  presentProp("PlaceInLine:", 'Meta', "placeInLine");
  console.log();
  presentProp("Connected:", 'Availability', "resourceConnected");
  presentProp("Busy:", 'Availability', "resourceBusy");
  presentProp("Control owner:", 'Availability', "controlOwner");
  console.log();

  if(pageNo == 0) {
    //
    // Production engine
    //
    presentProp("State:", 'ProductionEngine', "state");
    presentProp("Components left:", 'ProductionEngine', "componentsLeft");
    presentProp("Layout name:", 'ProductionEngine', "layoutName");
    presentProp("Batch id:", 'ProductionEngine', "batchId");
    presentProp("Batch size:", 'ProductionEngine', "batchSize");
    presentProp("Boards completed:", 'ProductionEngine', "boardsCompleted");
    presentProp("Comps per board:", 'ProductionEngine', "componentsPerBoard");
    presentProp("Components missing:", 'ProductionEngine', "componentsMissing");

    //
    // Notifications
    //
    console.log();
    console.log('Notifications:');
    console.log('==============');
    s = sprintf('%-10s%-20s%-35s%-20s', "Machine", "Severity", "Notification", "OptData")
    console.log(s);
    s = sprintf('%-10s%-20s%-35s%-20s', "-------", "--------", "------------", "-------")
    console.log(s);

    myStatusCache['factory']['PnP']['Machines'].forEach((m, machineId) => {
      myStatusCache['factory']['PnP']['Machines'][machineId]['State']['Notifications'].forEach( (n, nIx) => {

        s = sprintf('%-10s%-20s%-35s%-20s', m.State.Meta.name, n.severity, n.type, n.runtimeData);
        console.log(s);
      });
    });
  }


  if(pageNo == 1) {
    //
    // Mags
    //
    for (magIx = 0; magIx < 8; magIx++) {

      s1 = s2 = sprintf('%20s', " ")
      myStatusCache['factory']['PnP']['Machines'].forEach((val, i) => {
        if(myStatusCache['factory']['PnP']['Machines'][i]['State']['ComponentLoading'][magIx]) {
          mag = myStatusCache['factory']['PnP']['Machines'][i]['State']['ComponentLoading'][magIx]
          s1 = s1 + sprintf('%17s', mag.name + "/" + mag.slotNo + ":");
          s2 = s2 + sprintf('%17s',  mag.state);
        } else {
          s1 = s1 + sprintf('%17s', " ");
          s2 = s2 + sprintf('%17s', " ");
        }
      });
      console.log();
      console.log(s1);
      console.log(s2);
    }
  }

  console.log();
  console.log('[Return] to switch page      ', pageNo, ++nPresentations);
}


/////////////////////////////////////////////////////
//
// Switching page
//
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', line => {
  pageNo++;

  if (pageNo == 2) {
    pageNo = 0;
  }

});




