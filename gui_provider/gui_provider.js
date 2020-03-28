const {GraphQLServer} = require('graphql-yoga');
const {typeDefs} = require('./graphql_schema')

const tpcp_schema = require("../tpsys_sim/tpcp_pb");
const resMgr_schema = require("../resource_mgr/resource_mgr_pb");


//////////////////////////////////////////////////////////////////////////////
//
// MQTT connection
//
const mqtt = require('mqtt')

const TCP_URL = 'mqtt://localhost:1883'
const TCP_TLS_URL = 'mqtts://localhost:8883'

const options = {
    connectTimeout: 4000,

    // Authentication
    clientId: 'GuiProvider',
    // username: 'emqx',
    // password: 'emqx',

    keepalive: 60,
    clean: true,
}

mqttClient = mqtt.connect(TCP_URL, options)
mqttClient.on('connect', () => {
    console.log('MQTT connected')

})


subscriptionTopics = ['factory/Config/Lines',
'factory/Config/Machines',
'factory/ProductData/Layouts', 
'factory/PnP/Machines/+/State/Availability',
'factory/PnP/Machines/+/State/ProductionEngine',
'factory/PnP/Machines/+/State/ComponentLoading',
'factory/PnP/Machines/+/State/Notifications'];

mqttClient.subscribe(subscriptionTopics, (err) => {
  if(err) { console.log('guiprovider mqtt subs error:', err)}
})

mqttClient.on('message', (topic, message) => {
  //console.log('got mqtt:', topic, message.toString())
  handleMqttMessage(topic, message);
})

//////////////////////////////////////////////////////////////////////////////
//
// AMQP connection
//
myQueueName = "GuiProvider";

amqp = require("amqplib/callback_api");
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
    
    main()  // Wait for connection before running main
    
});


///////////////////////////////////////////////////////////////
//
// Handling of incomming status messages
//
function handleMqttMessage(topic, message){

  if (topic.indexOf('/State/Availability') != -1 ||
      topic.indexOf('/State/ProductionEngine') != -1 ||
      topic.indexOf('/State/ComponentLoading') != -1 ||
      topic.indexOf('/State/Notifications') != -1 ) {
    handleStatusUpdates(topic, message);
    return;
  }

  switch(topic) {
    case 'factory/Config/Lines':  myProductionLines = JSON.parse(message);            break;
    case 'factory/Config/Machines':  myMachines = JSON.parse(message);      break;
    case 'factory/ProductData/Layouts':  myLayouts = JSON.parse(message);  break;
    default: console.log('Got unknown topic: ', topic);
  }
}


function handleStatusUpdates(topic, msg) {
  topicPath = topic.split("/");
  machineId = topicPath[3];
  machineTopic = topicPath[5]
  recState = JSON.parse(msg);
  //console.log("Handle status update", machineId, machineTopic, recState);

  // find in myMachines
  // If different update status & actions
  i = myMachines.findIndex(m => m.id == machineId);
  if(i == -1) {
    //console.log('myMachines:', myMachines);
    console.log('Got status from unknown machine!', machineId, machineTopic, recState);
    return;
  }


  if (machineTopic == "Availability") {
    console.log("Got ResourceState machineId", machineId);
    if(myMachines[i].connected != recState.resourceConnected) {
      myMachines[i].connected = recState.resourceConnected;
      pubsub.publish(MachineConnectionStatusChanged_TOPIC + machineId, {machine: myMachines[i]})
      pubsub.publish(MachineConnectionStatusChanged_TOPIC, {machines: myMachines})
    }
  }

  if (machineTopic == "ProductionEngine") {
    updateStatusCashe(machineId, productionEnginesCashe, recState);
    pubsub.publish(ProdEngineChanged_TOPIC + machineId, {productionEngine: recState});
  }

  if (machineTopic == "Notifications") {
    updateStatusCashe(machineId, notificationStatusCashe, recState);
    pubsub.publish(NotStatusChanged_TOPIC + machineId, {notificationStatus: recState});

    // old dirty TBD. Internally publish complete notification list
    allNotifications = [];
    notificationStatusCashe.forEach( r => {
      allNotifications = allNotifications.concat(r.state);
    } )
    pubsub.publish(NotStatusChanged_TOPIC, {notifications: allNotifications}) 
  }

  if (machineTopic == "ComponentLoading") {
    console.log('Magazine status recieved:', machineId, recState);
    updateStatusCashe(machineId, magazineStatusCashe, recState);
    pubsub.publish(MagStatusChanged_TOPIC + machineId, {magazineStatus: recState});
  }

}

//
// Status chashing
//
productionEnginesCashe = []; // Will contain vector {id: <machineId>: state: <PE-object>}
notificationStatusCashe = []; // Will contain vector {id: <machineId>: state: <not-object>}
magazineStatusCashe = []; // Will contain vector {id: <machineId>: state: <mag-object>}

//
// update cashe with new state. Add to chashe if no status is recorded yet
//
function updateStatusCashe(machineId, cashe, newState) {
  i = cashe.findIndex(record => record.id == machineId);
  if(i == -1) {
    cashe.push({id: machineId, state: newState});
  } else {
    cashe[i].state = newState;
  }
}

function getCashedStatus(machineId, cashe) {
    i = cashe.findIndex(record => record.id == machineId);
  if(i == -1) {
    console.log('no state cached for machine:', machineId);
    return null;
  } else {
    return cashe[i].state;
  }

}

//
// Mimic old notification struct form data_provision time. TBD cleanup!
//
function getNotState(machineId) {
  casheRecord = notificationStatusCashe.find(r => r.id == machineId); 

  notVector = null;
  if (casheRecord)  {
    notVector = casheRecord.state; 
  }

  if (!notVector) {
    notVector = [];
  }

  const notificationsState = {notifications: notVector};
  return notificationsState;
}


///////////////////////////////////////////////////////////////
//
// Handling of incomming responses
//
var cmdPromiseTrigger = null; // TBD!! collection of outstanding cmds
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
          console.log("Got resp to SendRequest, errcode/msg:", errCode, errMsg);

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
          console.log("Got tpcp message of type:", tpcpRspType);


          switch(tpcpRspType) {
            case tpcp_schema.TpcpMsgType.PLAYTYPE:
              const rspPlay = tpcpRsp.getRspplay();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspPlay) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.PAUSETYPE:
              const rspPause = tpcpRsp.getRsppause();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspPause) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.STOPTYPE:
              const rspStop = tpcpRsp.getRspstop();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspStop) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.STARTBATCHTYPE:
              const rspStartBatch = tpcpRsp.getRspstartbatch();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspStartBatch) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.SUBSPETYPE:
              const rspSubsPe = tpcpRsp.getRspsubspe();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspSubsPe) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:
              const rspSubsMagazineStatus = tpcpRsp.getRspsubsmagazinestatus();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspSubsMagazineStatus) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:
              const rspSubsNotificationStatus = tpcpRsp.getRspsubsnotificationstatus();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspSubsNotificationStatus) }
              cmdPromiseTrigger = null;
              break;
            
            case tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE:
              const rspNqrLoadBoard = tpcpRsp.getRspnqrloadboard();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspNqrLoadBoard) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.NQRREMOVEBOARDTYPE:
              const rspNqrRemoveBoard = tpcpRsp.getRspnqrremoveboard();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspNqrRemoveBoard) }
              cmdPromiseTrigger = null;
              break;

            case tpcp_schema.TpcpMsgType.NQRUNLOADANYLOADEDBOARDTYPE:
              const rspNqrUnloadAnyLoadedBoard = tpcpRsp.getRspnqrunloadanyloadedboard();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspNqrUnloadAnyLoadedBoard) }
              cmdPromiseTrigger = null;
              break;
               
            default: console.log('Unknown tpcp type on rsp: ', tpcpRspType); return;
          }
      break;
    }
}


/////////////////////////////////////////////////////////////////////
//
// Sending of commands
//

//
// Send a command to machine, wait for its response and return graphQl-response. 
// Note commands with responses with anything but errmsg and errcode are not supported.
//

function sendRequest (tpcpCmdMsg, tpcpType, machineId) {
    const tpcpCmd = new tpcp_schema.TpcpCmd();

    tpcpCmd.setMsgtype(tpcpType);

    switch(tpcpType) {
      case tpcp_schema.TpcpMsgType.PLAYTYPE:          tpcpCmd.setCmdplay(tpcpCmdMsg);         break;
      case tpcp_schema.TpcpMsgType.PAUSETYPE:         tpcpCmd.setCmdpause(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.STOPTYPE:          tpcpCmd.setCmdstop(tpcpCmdMsg);         break;
      case tpcp_schema.TpcpMsgType.STARTBATCHTYPE:    tpcpCmd.setCmdstartbatch(tpcpCmdMsg);   break;
      case tpcp_schema.TpcpMsgType.SUBSPETYPE:        tpcpCmd.setCmdsubspe(tpcpCmdMsg);       break;
      case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:        tpcpCmd.setCmdsubsmagazinestatus(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:    tpcpCmd.setCmdsubsnotificationstatus(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE:              tpcpCmd.setCmdnqrloadboard(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.NQRREMOVEBOARDTYPE:            tpcpCmd.setCmdnqrremoveboard(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.NQRUNLOADANYLOADEDBOARDTYPE:   tpcpCmd.setCmdunloadanyloadedboard(tpcpCmdMsg);        break;

      default: console.log('Unknown tpcp cmd type: ', tpcpType); return;
    }

    //
    // Create resource_mgr payload
    //
    const cmdSendRequest = new resMgr_schema.CmdSendRequest();
    cmdSendRequest.setClientid("GuiProvider TBD userid..");
    cmdSendRequest.setReserveresource(false);
    tpcpCmdByteStr = tpcpCmd.serializeBinary().toString()     // To string since protobuff seems to only support "string payload"
    cmdSendRequest.setRequest(tpcpCmdByteStr);

    //
    // Put in resource_mgr envelop
    //
    const resmgrCmd = new resMgr_schema.ResmgrCmd();
    resmgrCmd.setMsgtype(resMgr_schema.ResmgrMsgType.SENDREQUESTTYPE);
    resmgrCmd.setResponsequeue(myQueueName);
    resmgrCmd.setCmdsendrequest(cmdSendRequest);

    //
    // Put on message queue
    //
    requestQueue = 'Machine' + machineId;
    const bytes = resmgrCmd.serializeBinary();
    packet = Buffer.from(bytes)
    amqpChannel.assertQueue(requestQueue);
    amqpChannel.sendToQueue(requestQueue, packet);
    //console.log('message sent to', requestQueue);
    
    return;
}


//
// Send a command to machine, wait for its response and return graphQl-response. 
// Note commands with responses with anything but errmsg and errcode are not supported.
//
async function sendCmdWaitRspToGql(cmd, cmdType, machineId, name)
{
  console.log('Send: ', name, 'machine', machineId);
  sendRequest(cmd, cmdType, machineId);

  // wait for response to be received
  let gqlRes = { errCode: -1, errMsg: 'Err never set - gui provier error!' };
  const p = new Promise((resolve, reject) => {
    cmdPromiseTrigger = resolve;
    setTimeout( function() {reject()}, 5000 );
  }).then(res => { gqlRes = { errCode: res.getErrcode(), errMsg: res.getErrmsg() } },
          rej => { gqlRes = { errCode: -9000, errMsg: "GuiProvider:Timeout waiting for response" }}
  );
  await p;

  if (gqlRes.errCode != 0) {
    console.log(name, ' failed: ' + gqlRes.errMsg);
  }

  console.log(name, ' result: ', machineId, gqlRes); // Temporary
  return gqlRes
}
 

const {_} = require('lodash')
const {PubSub} = require('graphql-subscriptions');
const pubsub = new PubSub();
const ProdEngineChanged_TOPIC = 'ProdEngineChanged';
const MagStatusChanged_TOPIC = 'MagStatusChanged';
const NotStatusChanged_TOPIC = 'NotStatusChanged';
const MachineConnectionStatusChanged_TOPIC = 'MachineConnectionStatusChanged';

let prevMachines = null;
let myMachines = {}
let myProductionLines = {}
let myLayouts = {}
let notificationID = 0;

function updateCameraImages(cameraImagesStat, machineId) {
  pubsub.publish('eventHappened', {eventHappened: cameraImagesStat }); 
}

const addMachineInfo = (notifications, machine) => {
  return _.map(notifications, not => {
    notificationID++
    not.id = machine.id.toString() + '.' + not.id.toString() + '.' + notificationID.toString() // TODO: must be unique otherwise the graphql response will not map the IDs correct
    not.machineId = machine.id
    not.machineName = machine.name
    return not
  })
}

const getNotifications = () => {
  // const _fakeNot = {runtimeData: ["52"], type: 'WaitingForBoardToBeLoaded', severity: 'Query', id: 8888} // TESTING NEW TYPES OF QUERIES IN THE UI

  return _.flatten(_.filter(_.map(myMachines, (machine) => {
    let notifications = _.cloneDeep((getNotState(machine.id) || {}).notifications || [])
    // if (machine.id === 1)
    //   notifications.push(_fakeNot)

    if (!_.isEmpty(notifications)) {
      return addMachineInfo(notifications, machine)
    }
  }), item => !_.isEmpty(item)))
}

// const getFeederImage = async (machineId) => {
//   console.log('getFeederImage: ', machineId);
//   const gc = grpcConnections.find(c => c.machineId === machineId);
//   let gqlRes = { feederImgBase64: "" };

//   const p = new Promise((resolve, reject) => {
//     gc.connection.getImageFromFeeder({}, function (err, response) {
//       resolve(response);
//     })
//   }).then(res => {
//     gqlRes = res;
//   });
//   await p;

//   return gqlRes;
// }

// const getFeederImageOffset = async (machineId, x, y) => {
//   console.log(`getFeederImageOffset: ${machineId}, x: ${x}, y: ${y}`);
//   const gc = grpcConnections.find(c => c.machineId === machineId);
//   let gqlRes = { feederImgBase64: "" };

//   const p = new Promise((resolve, reject) => {
//     gc.connection.getImageFromFeederOffset({ machineId: machineId, x: x, y: y }, function (err, response) {
//       resolve(response);
//     })
//   }).then(res => {
//     gqlRes = res;
//     //pubsub.publish('eventHappened', {eventHappened: res }); 
//   });
//   await p;
  
//   // const actualFI = getFeederImageOffset(0, 0, 0);
//   // actualFI.then(val => { pubsub.publish('eventHappened', {eventHappened: val }); });

//   return gqlRes;
// }

// const moveCamX = async (x) => {
//   console.log(`chci kamerou hybnout`);
//    const gc = grpcConnections.find(c => c.machineId === 0);
//    const p = new Promise((resolve, reject) => {
//      gc.connection.moveCamX({ x: x }, function (err, response) {
//        resolve(response);
//      })
//    }).then(res => {
//      gqlRes = res;
//    });
//    await p;
//    return true;
//  }


const resolvers = {
  Query: {
    info: () => `This is the API of MyPnP machines`,
    getTest: () => ({ id: 1, name: "Marcel" }),
    productionEngine: (root, args) => {
      return getCashedStatus(args.machineId, productionEnginesCashe);
    },
    magazineStatus: (root, args) => {
      return getCashedStatus(args.machineId, magazineStatusCashe);
    },
    notificationStatus: (root, args) => {
    const notificationsState = getNotState(args.machineId)
    if (!_.isEmpty(notificationsState)) {
        const machine = _.find(myMachines, m => m.id === args.machineId)
        return addMachineInfo(_.cloneDeep(notificationsState.notifications), machine)
      }

      return []
    },
    notifications: () => getNotifications(),
    productionLines: () => myProductionLines,
    productionLine: (root, args) => {
      return _.find(myProductionLines, l => {
        return l.name === args.lineName
      })
    },
    layouts: () => myLayouts,
    machines: () => myMachines,
    machine: (root, args) => {
      return _.find(myMachines, (m) => {
        return m.id === _.parseInt(args.machineId)
      })
    },
  //  getFeederImage: (root, args) => { return getFeederImage(args.machineId) },
  //  getFeederImageOffset: (root, args) => { return getFeederImageOffset(args.machineId, args.x, args.y) },
  //  moveCamX: (root, args) => { return moveCamX(args.x) },
  },
  Mutation: {
    play: async (root, args) => {
      const cmdPlay = new tpcp_schema.CmdPlay();

      gqlRes = sendCmdWaitRspToGql(cmdPlay, tpcp_schema.TpcpMsgType.PLAYTYPE, args.machineId, "play");
      await gqlRes;

      return gqlRes
    },
    pause: async (root, args) => {
      const cmdPause = new tpcp_schema.CmdPause();

      gqlRes = sendCmdWaitRspToGql(cmdPause, tpcp_schema.TpcpMsgType.PAUSETYPE, args.machineId, "pause");
      await gqlRes;

      return gqlRes
    },
    stop: async (root, args) => {
      const cmdStop = new tpcp_schema.CmdStop();

      gqlRes = sendCmdWaitRspToGql(cmdStop, tpcp_schema.TpcpMsgType.STOPTYPE, args.machineId, "stop");
      await gqlRes;

      return gqlRes
    },
    startBatch: async (root, args) => {
      const cmdStartBatch = new tpcp_schema.CmdStartBatch();
      cmdStartBatch.setBatchid(args.batchId);
      cmdStartBatch.setLayoutname(args.layoutName);
      cmdStartBatch.setBatchsize(args.batchSize);

      gqlRes = sendCmdWaitRspToGql(cmdStartBatch, tpcp_schema.TpcpMsgType.STARTBATCHTYPE, args.machineId, "startBatch");
      await gqlRes;

      return gqlRes
    },

    NQR_LoadBoard: async (root, args) => {
      const cmdNqrLoadBoard = new tpcp_schema.CmdNqrLoadBoard();
      cmdNqrLoadBoard.setOk(args.ok);

      gqlRes = sendCmdWaitRspToGql(cmdNqrLoadBoard, tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE, args.machineId, "NQRLoadBoard");
      await gqlRes;

      return gqlRes
    },

    NQR_RemoveBoard: async (root, args) => {
      const cmdNqrRemoveBoard = new tpcp_schema.CmdNqrRemoveBoard();

      gqlRes = sendCmdWaitRspToGql(cmdNqrRemoveBoard, tpcp_schema.TpcpMsgType.NQRREMOVEBOARDTYPE, args.machineId, "NQRRemoveBoard");
      await gqlRes;

      return gqlRes
    },

    NQR_UnloadAnyLoadedBoard: async (root, args) => {
      const cmdNqrUnloadAnyLoadedBoard = new tpcp_schema.CmdNqrUnloadAnyLoadedBoard();
      cmdNqrUnloadAnyLoadedBoard.setOk( args.ok );
      cmdNqrUnloadAnyLoadedBoard.setBoardtounloadexists( args.boardToUnloadExists );

      gqlRes = sendCmdWaitRspToGql(cmdNqrUnloadAnyLoadedBoard, tpcp_schema.TpcpMsgType.NQRUNLOADANYLOADEDBOARDTYPE, args.machineId, "NQRUnloadAnyLoadedBoard");
      await gqlRes;

      return gqlRes
    },

    // switchToTUI: async (root, args) => {
    //   console.log('switchToTUI machine: ', args.machineId);
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId);
    //   let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdSwitchToTUI({}, function (err, response) {
    //       resolve(response);
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('switchToTUI failed: ' + gqlRes.errMsg);
    //   }

    //   console.log('switchToTUI result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

    // login: async (root, args) => {
    //   console.log('Login, name/pw: ', args.name, args.pw);
    //   const gc = grpcConnection2
    //   let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

    //   const p = new Promise((resolve, reject) => {
    //     gc.login({
    //       username: args.name,
    //       password: args.pw,
    //       nicName: "putte"
    //     }, function (err, response) {
    //       resolve(response)
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = {errCode: res.responseCode, errMsg: res.responsemessage}
    //   })
    //   await p

    //   if (gqlRes.errCode != 0) console.log('Login failed: ' + gqlRes.errMsg)

    //   console.log('Login result: ', gqlRes); // Temporary
    //   return gqlRes
    // },

  },
  Subscription: {
    productionEngine: {
      subscribe: (root, args) => pubsub.asyncIterator(ProdEngineChanged_TOPIC + args.machineId),
    },
    magazineStatus: {
      subscribe: (root, args) => pubsub.asyncIterator(MagStatusChanged_TOPIC + args.machineId),
    },
    notificationStatus: {
      subscribe: (root, args) => pubsub.asyncIterator(NotStatusChanged_TOPIC + args.machineId),
    },
    notifications: {
      subscribe: () => pubsub.asyncIterator(NotStatusChanged_TOPIC),
    },
    machines: {
      subscribe: () => pubsub.asyncIterator(MachineConnectionStatusChanged_TOPIC),
    },
    machine: {
      subscribe: (root, args) => pubsub.asyncIterator(MachineConnectionStatusChanged_TOPIC + args.machineId),
    },
    // eventHappened: {
    //   subscribe: () => pubsub.asyncIterator('eventHappened')
    // }
  }
}


///////////////////////////////////////////////////////////////////////

const gQlServer = new GraphQLServer({
  typeDefs,
  resolvers,
})


function printFactoryState () {
  myMachines.forEach(m => {
    console.log(m.id, m.name, ' Connected:', m.connected ); 
  });
}

function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}



async function main() {
  gQlServer.start(() => console.log(`Server is running on http://localhost:4000`))


  //
  // After short delay ...TBD fix...
  // expect all status/Available subscriptions to have returned ie myMachines indicates what machines that are available
  // Make them send complete fresh status
  //
  await sleep(200);
  myMachines.forEach(m => { 
    if(m.connected) {
      const cmdSubsPe = new tpcp_schema.CmdSubsPe();
      sendRequest(cmdSubsPe, tpcp_schema.TpcpMsgType.SUBSPETYPE, m.id);
      const cmdSubsMagazineStatus = new tpcp_schema.CmdSubsMagazineStatus();
      sendRequest(cmdSubsMagazineStatus, tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE, m.id);
      const cmdSubsNotificationStatus = new tpcp_schema.CmdSubsNotificationStatus();
      sendRequest(cmdSubsNotificationStatus, tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE, m.id);
    } 
  });

  printFactoryState();
}

