const {GraphQLServer} = require('graphql-yoga')
// const {getPeState, onPeUpdate, startPeSubscription} = require('./data_provision/production_engine')
// const {getMagState, onMagUpdate, startMagSubscription} = require('./data_provision/magazine_status')
// const {getNotState, onNotUpdate, startNotSubscription} = require('./data_provision/notification_status')
// const {onCameraImagesUpdate, startCameraImagesSubscription} = require('./data_provision/camera_images')
// const {grpcConnections, connectMachines} = require('./grpc_client')
// const {grpcConnection2} = require('./grpc_client2')

const {typeDefs} = require('./graphql_schema')
const {getFactoryData} = require('./myFactory')
//const {getFactoryData} = require('./smtDbFactory')


const tpcp_schema = require("../tpcp0_pb");
const resMgr_schema = require("../resource_mgr_pb");

myQueueName = "GuiProvider";

amqp = require("amqplib/callback_api");
var amqpChannel;
//var amqpConnection;
amqp.connect('amqp://localhost', (err,conn) => {
//    amqpConnection = conn;
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
    
    // Setup my status subscription queue
    conn.createChannel(function(error1, channel) {
      if (error1) { throw error1; }

      var exchange = 'topic_ppMachines';
      channel.assertExchange(exchange, 'topic', {
        durable: false
      });
    
      channel.assertQueue('', {
        exclusive: true
      }, function(error2, q) {
        if (error2) { throw error2; }
    
        channel.bindQueue(q.queue, exchange, "#");
    
        channel.consume(q.queue, 
          handleStatusUpdates, 
          { noAck: true }
        );
      }); 
    })
    
});

function handleStatusUpdates(msg) {
  topic = msg.fields.routingKey.split(".");
  machineId = topic[0];
  rootTopic = topic[1]
  recState = JSON.parse(msg.content.toString());
  //console.log("Handle status update", machineId, rootTopic, recState);

  // find in myMachines
  // If different update status & actions
  i = myMachines.findIndex(m => m.id == machineId);
  if(i == -1) {
    //console.log('myMachines:', myMachines);
    console.log('Got status from unknown machine!', machineId, rootTopic, recState);
    return;
  }


  if (rootTopic == "ResourceState") {
    console.log("Got ResourceState machineId", machineId);
    if(myMachines[i].connected != recState.resourceConnected) {
      myMachines[i].connected = recState.resourceConnected;
      pubsub.publish(MachineConnectionStatusChanged_TOPIC + machineId, {machine: myMachines[i]})
      pubsub.publish(MachineConnectionStatusChanged_TOPIC, {machines: myMachines})
    }
  }

  if (rootTopic == "ProductionEngine") {
    updateStatusCashe(machineId, productionEnginesCashe, recState);
    pubsub.publish(ProdEngineChanged_TOPIC + machineId, {productionEngine: recState});
  }

  if (rootTopic == "Notifications") {
    updateStatusCashe(machineId, notificationStatusCashe, recState);
    pubsub.publish(NotStatusChanged_TOPIC + machineId, {notifications: recState});
  }

  if (rootTopic == "ComponentLoading") {
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

  return;
}

function sendRequest (tpcpCmdMsg, tpcpType, machineId) {
    const tpcpCmd = new tpcp_schema.TpcpCmd();

    tpcpCmd.setMsgtype(tpcpType);

    switch(tpcpType) {
      case tpcp_schema.TpcpMsgType.PAUSETYPE:       tpcpCmd.setCmdpause(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.SUBSPETYPE:       tpcpCmd.setCmdsubspe(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:       tpcpCmd.setCmdsubsmagazinestatus(tpcpCmdMsg);        break;
      case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:       tpcpCmd.setCmdsubsnotificationstatus(tpcpCmdMsg);        break;

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
            case tpcp_schema.TpcpMsgType.PAUSETYPE:
              const rspPause = tpcpRsp.getRsppause();
              if(cmdPromiseTrigger) { cmdPromiseTrigger(rspPause) }
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
            

            default: console.log('Unknown tpcp type on rsp: ', tpcpRspType); return;
          }
      break;
    }
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
    // notificationStatus: (root, args) => {
    //   const notificationsState = getNotState(args.machineId)
    //   if (!_.isEmpty(notificationsState)) {
    //     const machine = _.find(myMachines, m => m.id === args.machineId)
    //     return addMachineInfo(_.cloneDeep(notificationsState.notifications), machine)
    //   }

    //   return []
    // },
    // notifications: () => getNotifications(),
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
    // play: async (root, args) => {
    //   console.log('play machine: ', args.machineId);
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId);
    //   let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

    //   const p = new Promise(resolve => {
    //     gc.connection.cmdPlay({}, function (err, response) {
    //       resolve(response)
    //     })
    //   })
    //   p.then(res => {
    //     if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('Play failed: ' + gqlRes.errMsg);
    //   }

    //   console.log('Play result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

    pause: async (root, args) => {
      console.log('Pause machine: ', args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - gui provier error!' };
      
      const cmdPause = new tpcp_schema.CmdPause();
      sendRequest(cmdPause, tpcp_schema.TpcpMsgType.PAUSETYPE, args.machineId);

      // wait for response to be received
      const p = new Promise((resolve, reject) => {
        cmdPromiseTrigger = resolve;
        setTimeout( function() {reject()}, 5000 );
      }).then(res => { gqlRes = { errCode: res.getErrcode(), errMsg: res.getErrmsg() } },
              rej => { gqlRes = { errCode: -9000, errMsg: "GuiProvider:Timeout waiting for response" }}
      );
      await p;

      if (gqlRes.errCode != 0) {
        console.log('Pause  failed: ' + gqlRes.errMsg);
      }

      console.log('Pause result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },
/////////////////////////////////

    //   const gc = grpcConnections.find(c => c.machineId === args.machineId);
    //   let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdPause({}, function (err, response) {
    //       resolve(response);
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('Pause  failed: ' + gqlRes.errMsg);
    //   }

    //   console.log('Pause result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },
//////////////////////////////////////
    // stop: async (root, args) => {
    //   console.log('Stop machine: ', args.machineId);
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId);
    //   let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdStop({}, function (err, response) {
    //       resolve(response);
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('Stop failed: ' + gqlRes.errMsg);
    //   }

    //   console.log('Stop result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

    // startBatch: async (root, args) => {
    //   console.log('startBatch ', args)
    //   const gc = grpcConnections.find(c => c.machineId === args.machineId);
    //   let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

    //   if (_.isEmpty(args.layoutName)) {
    //     console.log('startBatch.error: No layout provided.')
    //     return { errCode: -2, errMsg: 'No layout provided.' }
    //   }

    //   const p = new Promise((resolve, reject) => {
    //     gc.connection.cmdStartBatch({
    //       batchId: args.batchId,
    //       layoutName: args.layoutName,
    //       batchSize: args.batchSize
    //     }, function (err, response) {
    //       resolve(response);
    //     })
    //   }).then(res => {
    //     if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
    //   });
    //   await p;

    //   if (gqlRes.errCode != 0) {
    //     console.log('startBatch failed: ' + gqlRes.errMsg);
    //   }

    //   console.log('StartBatch result: ', args.machineId, gqlRes); // Temporary
    //   return gqlRes
    // },

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
    // notificationStatus: {
    //   subscribe: (root, args) => pubsub.asyncIterator(NotStatusChanged_TOPIC + args.machineId),
    // },
    // notifications: {
    //   subscribe: () => pubsub.asyncIterator(NotStatusChanged_TOPIC),
    // },
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

//
// Initialize:
// Get factory configuration and start monitoring if machines are available by trying subscribing
//
async function initialize() {
  return await getFactoryData();
}


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
  // Wait for data connection is ready, then init my factory data
  //
  factory = await initialize();
  myMachines = factory.myMachines;
  myProductionLines = factory.myProductionLines;
  myLayouts = factory.myLayouts;

  // Give node some time to connect amqp
  await sleep(200);

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
