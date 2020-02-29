const {GraphQLServer} = require('graphql-yoga')
const {getPeState, onPeUpdate, startPeSubscription} = require('./data_provision/production_engine')
const {getMagState, onMagUpdate, startMagSubscription} = require('./data_provision/magazine_status')
const {getNotState, onNotUpdate, startNotSubscription} = require('./data_provision/notification_status')
const {onCameraImagesUpdate, startCameraImagesSubscription} = require('./data_provision/camera_images')
const {grpcConnections, connectMachines} = require('./grpc_client')
const {grpcConnection2} = require('./grpc_client2')

const {typeDefs} = require('./graphql_schema')
const {getFactoryData} = require('./myFactory')
//const {getFactoryData} = require('./smtDbFactory')

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

const getFeederImage = async (machineId) => {
  console.log('getFeederImage: ', machineId);
  const gc = grpcConnections.find(c => c.machineId === machineId);
  let gqlRes = { feederImgBase64: "" };

  const p = new Promise((resolve, reject) => {
    gc.connection.getImageFromFeeder({}, function (err, response) {
      resolve(response);
    })
  }).then(res => {
    gqlRes = res;
  });
  await p;

  return gqlRes;
}

const getFeederImageOffset = async (machineId, x, y) => {
  console.log(`getFeederImageOffset: ${machineId}, x: ${x}, y: ${y}`);
  const gc = grpcConnections.find(c => c.machineId === machineId);
  let gqlRes = { feederImgBase64: "" };

  const p = new Promise((resolve, reject) => {
    gc.connection.getImageFromFeederOffset({ machineId: machineId, x: x, y: y }, function (err, response) {
      resolve(response);
    })
  }).then(res => {
    gqlRes = res;
    //pubsub.publish('eventHappened', {eventHappened: res }); 
  });
  await p;
  
  // const actualFI = getFeederImageOffset(0, 0, 0);
  // actualFI.then(val => { pubsub.publish('eventHappened', {eventHappened: val }); });

  return gqlRes;
}

const moveCamX = async (x) => {
  console.log(`chci kamerou hybnout`);
   const gc = grpcConnections.find(c => c.machineId === 0);
   const p = new Promise((resolve, reject) => {
     gc.connection.moveCamX({ x: x }, function (err, response) {
       resolve(response);
     })
   }).then(res => {
     gqlRes = res;
   });
   await p;
   return true;
 }



function updateNotStat(notStat, machineId) {
  if (notStat) {
    console.log('updateNotStat.notStat', notStat, machineId)
    pubsub.publish(NotStatusChanged_TOPIC + machineId, {notificationStatus: notStat.notifications})
    const allNotifications = getNotifications()
    console.log('updateNotStat.allNotifications', allNotifications)
    pubsub.publish(NotStatusChanged_TOPIC, {notifications: allNotifications}) // TODO: we send all but should only send changes
  }
}

const resolvers = {
  Query: {
    info: () => `This is the API of MyPnP machines`,
    getTest: () => ({ id: 1, name: "Marcel" }),
    productionEngine: (root, args) => {
      return getPeState(args.machineId);
    },
    magazineStatus: (root, args) => {
      const magState = getMagState(args.machineId);
      return magState ? magState.magSlots : [];
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
   getFeederImage: (root, args) => { return getFeederImage(args.machineId) },
   getFeederImageOffset: (root, args) => { return getFeederImageOffset(args.machineId, args.x, args.y) },
   moveCamX: (root, args) => { return moveCamX(args.x) },
  },
  Mutation: {
    play: async (root, args) => {
      console.log('play machine: ', args.machineId);
      const gc = grpcConnections.find(c => c.machineId === args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

      const p = new Promise(resolve => {
        gc.connection.cmdPlay({}, function (err, response) {
          resolve(response)
        })
      })
      p.then(res => {
        if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('Play failed: ' + gqlRes.errMsg);
      }

      console.log('Play result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    pause: async (root, args) => {
      console.log('Pause machine: ', args.machineId);
      const gc = grpcConnections.find(c => c.machineId === args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdPause({}, function (err, response) {
          resolve(response);
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('Pause  failed: ' + gqlRes.errMsg);
      }

      console.log('Pause result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    stop: async (root, args) => {
      console.log('Stop machine: ', args.machineId);
      const gc = grpcConnections.find(c => c.machineId === args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdStop({}, function (err, response) {
          resolve(response);
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('Stop failed: ' + gqlRes.errMsg);
      }

      console.log('Stop result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    startBatch: async (root, args) => {
      console.log('startBatch ', args)
      const gc = grpcConnections.find(c => c.machineId === args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

      if (_.isEmpty(args.layoutName)) {
        console.log('startBatch.error: No layout provided.')
        return { errCode: -2, errMsg: 'No layout provided.' }
      }

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdStartBatch({
          batchId: args.batchId,
          layoutName: args.layoutName,
          batchSize: args.batchSize
        }, function (err, response) {
          resolve(response);
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('startBatch failed: ' + gqlRes.errMsg);
      }

      console.log('StartBatch result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    switchToTUI: async (root, args) => {
      console.log('switchToTUI machine: ', args.machineId);
      const gc = grpcConnections.find(c => c.machineId === args.machineId);
      let gqlRes = { errCode: -1, errMsg: 'Err never set - machine agent error!' };

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdSwitchToTUI({}, function (err, response) {
          resolve(response);
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = { errCode: res.errCode, errMsg: res.errMsg }
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('switchToTUI failed: ' + gqlRes.errMsg);
      }

      console.log('switchToTUI result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    NQR_LoadBoard: async (root, args) => {
      console.log('NQR LoadBoard, machine/ok: ', args.machineId, args.ok)
      const gc = grpcConnections.find(c => c.machineId === args.machineId)
      let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdNqrLoadBoard({ok: args.ok}, function (err, response) {
          resolve(response);
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
      });
      await p;

      if (gqlRes.errCode != 0) {
        console.log('cmdQueryResp_LoadBoard failed: ' + gqlRes.errMsg);
      }
      console.log('NQR_LoadBoard result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    NQR_RemoveBoard: async (root, args) => {
      console.log('NQR RemoveBoard, machine/ok: ', args.machineId, args.ok)
      const gc = grpcConnections.find(c => c.machineId === args.machineId)
      let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdNqrRemoveBoard({ok: args.ok}, function (err, response) {
          resolve(response)
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
      })
      await p

      if (gqlRes.errCode != 0) console.log('cmdQueryResp_RemoveBoard failed: ' + gqlRes.errMsg)

      console.log('NQR_RemoveBoard result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    NQR_UnloadAnyLoadedBoard: async (root, args) => {
      console.log('NQR UnloadAnyLoadedBoard, machine/ok/exisboardToUnloadExiststs: ', args.machineId, args.ok, args.boardToUnloadExists);
      const gc = grpcConnections.find(c => c.machineId === args.machineId)
      let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

      const p = new Promise((resolve, reject) => {
        gc.connection.cmdNqrUnloadAnyLoadedBoard({
          ok: args.ok,
          boardToUnloadExists: args.boardToUnloadExists
        }, function (err, response) {
          resolve(response)
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = {errCode: res.errCode, errMsg: res.errMsg}
      })
      await p

      if (gqlRes.errCode != 0) console.log('cmdQueryResp_UnloadAnyLoadedBoard failed: ' + gqlRes.errMsg)

      console.log('NQR_UnloadAnyLoadedBoard result: ', args.machineId, gqlRes); // Temporary
      return gqlRes
    },

    login: async (root, args) => {
      console.log('Login, name/pw: ', args.name, args.pw);
      const gc = grpcConnection2
      let gqlRes = {errCode: -1, errMsg: 'Err never set - machine agent error!'}

      const p = new Promise((resolve, reject) => {
        gc.login({
          username: args.name,
          password: args.pw,
          nicName: "putte"
        }, function (err, response) {
          resolve(response)
        })
      }).then(res => {
        if (!_.isEmpty(res)) gqlRes = {errCode: res.responseCode, errMsg: res.responsemessage}
      })
      await p

      if (gqlRes.errCode != 0) console.log('Login failed: ' + gqlRes.errMsg)

      console.log('Login result: ', gqlRes); // Temporary
      return gqlRes
    },

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
    eventHappened: {
      subscribe: () => pubsub.asyncIterator('eventHappened')
    }
  }
}

function handleSubscriptions() {
  // process.stdout.write('.')
  let anyChanges = false

  // compare each machine ..
  _.forEach(myMachines, (m) => {
    if (!m.connected) {
      startPeSubscription(m)
      startMagSubscription(m)
      startNotSubscription(m)
      if(m.id == 0) {
        startCameraImagesSubscription(m)
      }
    }

    const i = _.findIndex(prevMachines, {id: m.id})
    if (!_.isEqual(prevMachines[i], m)) {
      anyChanges = true
      prevMachines.splice(i, 1, _.cloneDeep(m)) // replace the machine that has changed
      pubsub.publish(MachineConnectionStatusChanged_TOPIC + m.id, {machine: m})
      console.log('Machine: ', m.name, m.id, ' - connection status: ', m.connected);
    }
  })


  if (anyChanges) {
    pubsub.publish(MachineConnectionStatusChanged_TOPIC, {machines: myMachines})
  }
  setTimeout(handleSubscriptions, 1000)
}



// Setup callbacks for subscriptions
onPeUpdate(updatePeStat);
onMagUpdate(updateMagStat);
onNotUpdate(updateNotStat);
onCameraImagesUpdate(updateCameraImages);

//
// Initialize:
// Get factory configuration and start monitoring if machines are available by trying subscribing
//
async function initialize() {
  return await getFactoryData();
}

initialize().then(factory => {
  myMachines = factory.myMachines;
  myProductionLines = factory.myProductionLines;
  myLayouts = factory.myLayouts;

  connectMachines(myMachines)

  // Now start subscriptions
  // .. keep track of changes on each machine
  prevMachines = _.cloneDeep(myMachines)
  setTimeout(handleSubscriptions, 500);
});

const gQlServer = new GraphQLServer({
  typeDefs,
  resolvers,
})

module.exports = gQlServer;
