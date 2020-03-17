//
// status_cache - keep a cache of whole factorys state
// 
// 
// Initially get list of all machines from db
// Initialize a default cache from this list
// check who is connected by poking any resmgr and receive status updates to cache
// use own status cache to check which machiens that are connected FOR these
//    issue subscription cmds making them emit a complete status
//
// Now cache will be true and keep true as updates are received.


const {_} = require('lodash')
let myMachines = {}


amqp = require("amqplib/callback_api");
myQueueName = 'StatusCacheRsp'
var amqpChannel;
var amqpConnection;
amqp.connect('amqp://localhost', (err,conn) => {
    amqpConnection = conn;
    if(err) {
      console.log("No connection to message queue??");
      console.log(err);
      process.exit(-1);
    }

    // Setup my input queue
    conn.createChannel((err, ch) => {

        ch.assertQueue(myQueueName);
        amqpChannel = ch;

        amqpChannel.consume(myQueueName, (message) => {
            // console.log('Got amqp pck');
            handleAmqpResponse(message.content);
        }, {noAck: true });

    }); 
    
    
});

function handleStatusUpdates(msg) {
  topic = msg.fields.routingKey.split(".");
  machineId = topic[3];
  machineTopic = topic[4]
  recState = JSON.parse(msg.content.toString());
  // console.log("Handle status update", machineId, machineTopic, recState);
  // process.stdout.write(".");

  // mergeObject = {};
  // mergeObject['factory'] = {};
  // mergeObject['factory']['PnP'] = {};
  // mergeObject['factory']['PnP']['Machines'] = [];
  // mergeObject['factory']['PnP']['Machines'][machineId] = {};
  // mergeObject['factory']['PnP']['Machines'][machineId][machineTopic] = recState;

//  refreshCache(myStatusCache, mergeObject)
  myStatusCache['factory']['PnP']['Machines'][machineId][machineTopic] = recState;
  presentStatus();
}

var myStatusCache = {}; // The one

// 
// refreshCache - extend or overwrite data with  new state information
//  ( = overwrite existing nodes, keep nodes that are not in "fresh")
// 
// function refreshCache(existing, fresh) {
//   return _.merge(existing, fresh);  
// }


//////////////////////////////////////////////////////////////////////////////////
//
// presentation of state
//
var sprintf = require('sprintf-js').sprintf;

function presentProp(title, machineTopic, propery) {
    s = sprintf('%20s', title)
    myStatusCache['factory']['PnP']['Machines'].forEach((val, i) => {
        s = s + sprintf('%17s', myStatusCache['factory']['PnP']['Machines'][i][machineTopic][propery])
    });
    console.log(s);
}


function presentStatus() {
  //return;
  //    setTimeout(presentStatus, 200)
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
    presentProp("State:", 'ProductionEngine', "state");
    presentProp("Components left:", 'ProductionEngine', "componentsLeft");
    presentProp("Layout name:", 'ProductionEngine', "layoutName");
    presentProp("Batch id:", 'ProductionEngine', "batchId");
    presentProp("Batch size:", 'ProductionEngine', "batchSize");
    presentProp("Boards completed:", 'ProductionEngine', "boardsCompleted");
    presentProp("Comps per board:", 'ProductionEngine', "componentsPerBoard");
    presentProp("Components missing:", 'ProductionEngine', "componentsMissing");

    for (magIx = 0; magIx < 4; magIx++) {

      s1 = s2 = sprintf('%20s', " ")
      myStatusCache['factory']['PnP']['Machines'].forEach((val, i) => {
        if(myStatusCache['factory']['PnP']['Machines'][i]['ComponentLoading'][magIx]) {
          mag = myStatusCache['factory']['PnP']['Machines'][i]['ComponentLoading'][magIx]
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

  console.log();
  s = sprintf('%-10s%-20s%-35s%-20s', "Machine", "Severity", "Notification", "OptData")
  console.log(s);

  myStatusCache['factory']['PnP']['Machines'].forEach((m, machineId) => {
      myStatusCache['factory']['PnP']['Machines'][machineId]['Notifications'].forEach( (n, nIx) => {

        s = sprintf('%-10s%-20s%-35s%-20s', m.Meta.name, n.severity, n.type, n.runtimeData);
        console.log(s);
      });
    });
  }



///////////////////////////////////////////////////
//
// Initialize default status
//
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
  //console.log('initStatusCache', machines)

  myStatusCache['factory'] = {};
  myStatusCache['factory']['PnP'] = {};
  myStatusCache['factory']['PnP']['Machines'] = [];

  machines.forEach(m => { 
    myStatusCache['factory']['PnP']['Machines'][m.id] = {};
    myStatusCache['factory']['PnP']['Machines'][m.id]['Meta']  = {};
    myStatusCache['factory']['PnP']['Machines'][m.id]['Meta'].name = m.name;
    myStatusCache['factory']['PnP']['Machines'][m.id]['Meta'].hostname = m.hostname;
    myStatusCache['factory']['PnP']['Machines'][m.id]['Meta'].placeInLine = m.placeInLine;
    myStatusCache['factory']['PnP']['Machines'][m.id]['Meta'].model = m.model;

    myStatusCache['factory']['PnP']['Machines'][m.id]['Availability'] = defaultAv;
    myStatusCache['factory']['PnP']['Machines'][m.id]['ProductionEngine'] = defaultPe;
    myStatusCache['factory']['PnP']['Machines'][m.id]['ComponentLoading'] = {};
    myStatusCache['factory']['PnP']['Machines'][m.id]['Notifications'] = [];
   });

   presentStatus();
}


/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
//
// TpCp and resMgr stuff - just for starting subscriptions
// 
//
const tpcp_schema = require("../tpcp0_pb");
const resMgr_schema = require("../resource_mgr_pb");
function resMgrUpdateStatus (machineId) {

  const cmdUpdateStatus = new resMgr_schema.CmdUpdateStatus();
  const resmgrCmd = new resMgr_schema.ResmgrCmd();
  resmgrCmd.setMsgtype(resMgr_schema.ResmgrMsgType.UPDATESTATUSTYPE);
  resmgrCmd.setResponsequeue(myQueueName);
  resmgrCmd.setCmdupdatestatus(cmdUpdateStatus);

  requestQueue = 'Machine' + machineId;
  const bytes = resmgrCmd.serializeBinary();
  packet = Buffer.from(bytes)
  amqpChannel.assertQueue(requestQueue);
  amqpChannel.sendToQueue(requestQueue, packet);

  console.log('requested status update from machine:', machineId);
  return;
}

function sendRequest (tpcpCmdMsg, tpcpType, machineId) {
    const tpcpCmd = new tpcp_schema.TpcpCmd();

    tpcpCmd.setMsgtype(tpcpType);

    switch(tpcpType) {
      case tpcp_schema.TpcpMsgType.PLAYTYPE:          tpcpCmd.setCmdplay(tpcpCmdMsg);         break;
      case tpcp_schema.TpcpMsgType.PAUSETYPE:         tpcpCmd.setCmdpause(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.STOPTYPE:          tpcpCmd.setCmdstop(tpcpCmdMsg);         break;
      case tpcp_schema.TpcpMsgType.STARTBATCHTYPE:    tpcpCmd.setCmdstartbatch(tpcpCmdMsg);   break;
      case tpcp_schema.TpcpMsgType.SUBSPETYPE:        tpcpCmd.setCmdsubspe(tpcpCmdMsg);       break;
      case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:       tpcpCmd.setCmdsubsmagazinestatus(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:       tpcpCmd.setCmdsubsnotificationstatus(tpcpCmdMsg);        break;

      default: console.log('Unknown tpcp cmd type: ', tpcpType); return;
    }

    //
    // Create resource_mgr payload
    //
    const cmdSendRequest = new resMgr_schema.CmdSendRequest();
    cmdSendRequest.setClientid("StatusCache..TBD");
    cmdSendRequest.setReserveresource(false);
    tpcpCmdByteStr = tpcpCmd.serializeBinary().toString()     // To string since protobuff seems to only support "string payload"
    cmdSendRequest.setRequest(tpcpCmdByteStr);

    // Put in resource_mgr envelop
    const resmgrCmd = new resMgr_schema.ResmgrCmd();
    resmgrCmd.setMsgtype(resMgr_schema.ResmgrMsgType.SENDREQUESTTYPE);
    resmgrCmd.setResponsequeue(myQueueName);
    resmgrCmd.setCmdsendrequest(cmdSendRequest);

    // Put on message queue
    requestQueue = 'Machine' + machineId;
    const bytes = resmgrCmd.serializeBinary();
    packet = Buffer.from(bytes)
    amqpChannel.assertQueue(requestQueue);
    amqpChannel.sendToQueue(requestQueue, packet);
    console.log('tpcp message sent to', tpcpType, machineId, requestQueue);
    
    return;
}

handleAmqpResponse = function(packet) {
    //console.log('Handle packet: ', packet);

    //
    // Unpack resource_mgr envelop
    //
    const resmgrRsp = resMgr_schema.ResmgrRsp.deserializeBinary(packet);
    resmgrMsgType = resmgrRsp.getMsgtype();

    switch(resmgrMsgType) {
      case resMgr_schema.ResmgrMsgType.UPDATESTATUSTYPE:
        console.log('Ignored resMgr UpdateStatus rsp');
        break;

      case resMgr_schema.ResmgrMsgType.SENDREQUESTTYPE:

          const rspSendRequest = resmgrRsp.getRspsendrequest();

          errCode  = rspSendRequest.getErrcode();
          errMsg  = rspSendRequest.getErrmsg();
          //console.log("Got resp to SendRequest, errcode/msg:", errCode, errMsg);

          if (errCode) {
              console.log("Resource mgr error: errcode/msg:", errCode, errMsg);
              process.exit(0); // No TpCp response available
          }

          //
          // A TpCp response is available. Unpack envelope
          //
          r_byteStr = rspSendRequest.getResponse();
          r_bytes = new Uint8Array(r_byteStr.split(","));

          const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(r_bytes);
          tpcpRspType = tpcpRsp.getMsgtype();
          //console.log("Got tpcp message of type:", tpcpRspType);


          switch(tpcpRspType) {
            case tpcp_schema.TpcpMsgType.SUBSPETYPE:
              const rspSubsPe = tpcpRsp.getRspsubspe();
              break;

            case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:
              const rspSubsMagazineStatus = tpcpRsp.getRspsubsmagazinestatus();
              break;

            case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:
              const rspSubsNotificationStatus = tpcpRsp.getRspsubsnotificationstatus();
              break;
            

            default: console.log('Unknown tpcp type on rsp: ', tpcpRspType); return;
          }
      break;
    }
}


/////////////////////////////////////////////////////////////////////////////////////////
//
// fetchFactoryData:
// Get factory configuration and store in globals....TBD dirty quickie for now
//

const factory_data_schema = require("../factory_data/factory_data_pb");
dataRspQueue = 'StatusMonFactoryData';
var lastFacDataReceived;  // Call this to release promise when last response form facData is received. TBD dirty for now...

async function fetchFactoryData() {
  amqpConnection.createChannel((err, ch) => {

    ch.assertQueue(dataRspQueue);
    amqpChannel = ch;

    amqpChannel.consume(dataRspQueue, (message) => {
      handleFactoryDataResponse(message.content);
    }, {noAck: true });
  }); 

  const p = new Promise((resolve, reject) => {
    lastFacDataReceived = resolve;
    setTimeout( function() {reject()}, 5000 );
  }).then(res => {  },
          rej => { console.log("StatusCache:Timeout waiting for facData" );}
  );

  sendFactoryDataCmd(new factory_data_schema.CmdGetMachines(),factory_data_schema.FacdataMsgType.GETMACHINESTYPE);

  // Wait for responses
  return await p;
 
}


function sendFactoryDataCmd (cmdMsg, msgType) {
  facdataCmd = new factory_data_schema.FacdataCmd();
  facdataCmd.setResponsequeue(dataRspQueue);

  switch(msgType) {
    case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:          facdataCmd.setCmdgetmachines(cmdMsg);    break;
    default: console.log('Unknown Factorydata cmd type: ', msgType); return;
  }
  facdataCmd.setMsgtype(msgType);

  // Put on message queue
  requestQueue = 'FactoryDataCmd';
  const bytes = facdataCmd.serializeBinary();
  packet = Buffer.from(bytes)
  amqpChannel.assertQueue(requestQueue);
  amqpChannel.sendToQueue(requestQueue, packet);
  
  console.log('Sent facdata cmd type: ', msgType);
  return;
}

handleFactoryDataResponse = function(packet) {
  console.log('Handle facDataRsp: ', packet);

  //
  // Unpack envelop
  //
  const facdataRsp = factory_data_schema.FacdataRsp.deserializeBinary(packet);
  msgType = facdataRsp.getMsgtype();
  errCode  = facdataRsp.getErrcode();
  errMsg  = facdataRsp.getErrmsg();

  if (errCode) {
      console.log("Facdata error: errcode/msg:", errCode, errMsg);
      return;
  }

  switch(msgType) {

      case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:

          const rspGetMachines = facdataRsp.getRspgetmachines();
          machinesStr = rspGetMachines.getMachines();

          myMachines = JSON.parse(machinesStr);
          console.log("Production machines:", myMachines);
          lastFacDataReceived();  // very dirty for now....assume this is last response and release promise above TBD!
          break;


      default:
          console.log("Unknown facdata message type received:", msgType);
      break;
  }

};

///////////////////////////////////////////////////////////////////////



function printFactoryState () {
  myMachines.forEach(m => {
    console.log(m.id, m.name, ' Connected:', m.connected ); 
  });
}

function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

async function main() {

  // Give node some time to connect amqp
  await sleep(200);

  //
  // Get factory configuration to know what machines to connect.
  //
  factory = await fetchFactoryData();


  //
  // Create some default cache
  //
  initStatusCache(myMachines)

  //
  // Now ok to start receiving status updates
  //
  amqpConnection.createChannel(function(error1, channel) {
    if (error1) { throw error1; }

    var exchange = 'topic_ppMachines';
    channel.assertExchange(exchange, 'topic', {
      durable: false
    });
  
    channel.assertQueue('', {
      exclusive: true
    }, function(error2, q) {
      if (error2) { throw error2; }
  
      channel.bindQueue(q.queue, exchange, "factory.PnP.Machines.#");
  
      channel.consume(q.queue, 
        handleStatusUpdates, 
        { noAck: true }
      );
    }); 
  })
  await sleep(200); // give channel some time to start before start requestiong data..

  // 
  // To know what machines that are currently up: Try refresh connection status for all expected machines
  // the responses (to the cmd, not the status update) will be ignored
  //
  myMachines.forEach(m => { resMgrUpdateStatus(m.id); });

  //
  // After short delay
  // expect all available resmgr to have responded ie myMachines indicates what machines that are available
  // Make them send complete fresh status
  //
  await sleep(200);
  myStatusCache['factory']['PnP']['Machines'].forEach( (m, i) => { 
    if(m['Availability']['resourceConnected']) {
      const cmdSubsPe = new tpcp_schema.CmdSubsPe();
      sendRequest(cmdSubsPe, tpcp_schema.TpcpMsgType.SUBSPETYPE, i);
      const cmdSubsMagazineStatus = new tpcp_schema.CmdSubsMagazineStatus();
      sendRequest(cmdSubsMagazineStatus, tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE, i);
      const cmdSubsNotificationStatus = new tpcp_schema.CmdSubsNotificationStatus();
      sendRequest(cmdSubsNotificationStatus, tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE, i);
    } 
  });

  //printFactoryState();
}

main()
