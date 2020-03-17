const {GraphQLServer} = require('graphql-yoga')
// const {getPeState, onPeUpdate, startPeSubscription} = require('./data_provision/production_engine')
// const {getMagState, onMagUpdate, startMagSubscription} = require('./data_provision/magazine_status')
// const {getNotState, onNotUpdate, startNotSubscription} = require('./data_provision/notification_status')
// const {onCameraImagesUpdate, startCameraImagesSubscription} = require('./data_provision/camera_images')
// const {grpcConnections, connectMachines} = require('./grpc_client')
// const {grpcConnection2} = require('./grpc_client2')

//
// Mimic old notification struct form data_provision time. TBD cleanup!
//
function getNotState(machineId) {
  
  casheRecord = notificationStatusCashe.find(r => r.id == machineId); 
  if (casheRecord)  {
    notVector = casheRecord.state; 
  }

  if (!notVector) {
    notVector = [];
  }

  const notificationsState = {notifications: notVector};
  return notificationsState;
}



const {typeDefs} = require('./graphql_schema')


const tpcp_schema = require("../tpcp0_pb");
const resMgr_schema = require("../resource_mgr_pb");

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
    
    
});

function handleStatusUpdates(msg) {
  topic = msg.fields.routingKey.split(".");
  machineId = topic[3];
  machineTopic = topic[4]
  recState = JSON.parse(msg.content.toString());
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

//////////
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
let notificationID = 0

function updatePeStat(pes, machineId) {
  pubsub.publish(ProdEngineChanged_TOPIC + machineId, {productionEngine: pes});
}

function updateMagStat(magStat, machineId) {
  if (magStat) {
    pubsub.publish(MagStatusChanged_TOPIC + machineId, {magazineStatus: magStat.magSlots});
  }
}

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



// function updateNotStat(notStat, machineId) {
//   if (notStat) {
//     console.log('updateNotStat.notStat', notStat, machineId)
//     pubsub.publish(NotStatusChanged_TOPIC + machineId, {notificationStatus: notStat.notifications})
//     const allNotifications = getNotifications()
//     console.log('updateNotStat.allNotifications', allNotifications)
//     pubsub.publish(NotStatusChanged_TOPIC, {notifications: allNotifications}) // TODO: we send all but should only send changes
//   }
// }

////////////////////////////////////////////////
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

    // NQR_LoadBoard: async (root, args) => {
    //   console.log('NQR LoadBoard, machine/ok: ', args.machineId, args.ok)
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId)
    //   let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdNqrLoadBoard({ok: args.ok}, function (err, response) {
    //       resolve(response);
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('cmdQueryResp_LoadBoard failed: ' + gqlRes.errMsg);
    //   }
    //   console.log('NQR_LoadBoard result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

    // NQR_RemoveBoard: async (root, args) => {
    //   console.log('NQR RemoveBoard, machine/ok: ', args.machineId, args.ok)
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId)
    //   let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdNqrRemoveBoard({ok: args.ok}, function (err, response) {
    //       resolve(response)
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
    //   })
    //   await p

    //   if (gqlRes.errCode != 0) console.log('cmdQueryResp_RemoveBoard failed: ' + gqlRes.errMsg)

    //   console.log('NQR_RemoveBoard result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

    // NQR_UnloadAnyLoadedBoard: async (root, args) => {
    //   console.log('NQR UnloadAnyLoadedBoard, machine/ok/exisboardToUnloadExiststs: ', args.machineId, args.ok, args.boardToUnloadExists);
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId)
    //   let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdNqrUnloadAnyLoadedBoard({
    //       ok: args.ok,
    //       boardToUnloadExists: args.boardToUnloadExists
    //     }, function (err, response) {
    //       resolve(response)
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
    //   })
    //   await p

    //   if (gqlRes.errCode != 0) console.log('cmdQueryResp_UnloadAnyLoadedBoard failed: ' + gqlRes.errMsg)

    //   console.log('NQR_UnloadAnyLoadedBoard result: ', args.machineId, gqlRes); // Temporary
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

// function handleSubscriptions() {
//   // process.stdout.write('.')
//   let anyChanges = false

//   // compare each machine ..
//   _.forEach(myMachines, (m) => {
//     if (!m.connected) {
//       startPeSubscription(m)
//       startMagSubscription(m)
//       startNotSubscription(m)
//       if(m.id == 0) {
//         startCameraImagesSubscription(m)
//       }
//     }

//     const i = _.findIndex(prevMachines, {id: m.id})
//     if (!_.isEqual(prevMachines[i], m)) {
//       anyChanges = true
//       prevMachines.splice(i, 1, _.cloneDeep(m)) // replace the machine that has changed
//       pubsub.publish(MachineConnectionStatusChanged_TOPIC + m.id, {machine: m})
//       console.log('Machine: ', m.name, m.id, ' - connection status: ', m.connected);
//     }
//   })


//   if (anyChanges) {
//     pubsub.publish(MachineConnectionStatusChanged_TOPIC, {machines: myMachines})
//   }
//   setTimeout(handleSubscriptions, 1000)
// }



// // Setup callbacks for subscriptions
// onPeUpdate(updatePeStat);
// onMagUpdate(updateMagStat);
// onNotUpdate(updateNotStat);
// onCameraImagesUpdate(updateCameraImages);


/////////////////////////////////////////////////////////////////////////////////////////
//
// fetchFactoryData:
// Get factory configuration and store in globals....TBD dirty quickie for now
//

const factory_data_schema = require("../factory_data/factory_data_pb");dataRspQueue = 'GuiProviderFactoryData';
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
          rej => { console.log("GuiProvider:Timeout waiting for facData" );}
  );

  sendFactoryDataCmd(new factory_data_schema.CmdGetMachines(),factory_data_schema.FacdataMsgType.GETMACHINESTYPE);
  sendFactoryDataCmd(new factory_data_schema.CmdGetLines(),factory_data_schema.FacdataMsgType.GETLINESTYPE);
  sendFactoryDataCmd(new factory_data_schema.CmdGetLayouts(),factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE);

  // Wait for responses
  return await p;
 
}


function sendFactoryDataCmd (cmdMsg, msgType) {
  facdataCmd = new factory_data_schema.FacdataCmd();
  facdataCmd.setResponsequeue(dataRspQueue);

  switch(msgType) {
    case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:          facdataCmd.setCmdgetmachines(cmdMsg);    break;
    case factory_data_schema.FacdataMsgType.GETLINESTYPE:          facdataCmd.setCmdgetlines(cmdMsg);    break;
    case factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE:          facdataCmd.setCmdgetlayouts(cmdMsg);    break;
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
      case factory_data_schema.FacdataMsgType.GETLINESTYPE:

          const rspGetLines = facdataRsp.getRspgetlines();
          lines = rspGetLines.getLines();

          myProductionLines = JSON.parse(lines);
          console.log("Production lines:", myProductionLines);
          break;

      case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:

          const rspGetMachines = facdataRsp.getRspgetmachines();
          machinesStr = rspGetMachines.getMachines();

          myMachines = JSON.parse(machinesStr);
          console.log("Production machines:", myMachines);
          break;

      case factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE:

          const rspGetLayouts = facdataRsp.getRspgetlayouts();
          layoutsStr = rspGetLayouts.getLayouts();

          myLayouts = JSON.parse(layoutsStr);
          console.log("Layouts:", myLayouts);
          lastFacDataReceived();  // very dirty for now....assume this is last response and release promise above TBD!
          break;

      default:
          console.log("Unknown facdata message type received:", msgType);
      break;
  }

};

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

  // Give node some time to connect amqp
  await sleep(200);

  //
  // Get factory configuration to know what machines to connect.
  //
  factory = await fetchFactoryData();

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

main()
