const _ = require('lodash')
const {grpcConnections} = require('../grpc_client');

//
// Class representing Notification-subscription on one machine
//   - Keep last fetched (current) PE-state
//   - Provide factory for updating function
//
function NotificationSubscription(machine) {
  //console.log('created not subs: ', machine.id);

  let notMachine = machine;
  let notState = null;

  this.getMyNotState = () => notState;
  this.clearMyNotState = () => {
    //console.log('Notifications cleared ', notState)
    notState = []
  };
  this.getMachine = () => notMachine;

  this.makeUpdater = function () {
    return function (newState) {
      console.log('update Subs state for machine', notMachine.id, notMachine.name, newState);
      notState = newState;
      clients.forEach(callback => {
        callback(notState, notMachine.id);
      });
    }
  }
}


//
// Try starting gRPC subscription for notification state on a particular machine
//
function startNotSubscription(m) {
  let notSubcription = notSubcriptions.find(s => s.getMachine().id === m.id)
  if (!notSubcription) {
    notSubcription = new NotificationSubscription(m)
    notSubcriptions.push(notSubcription);
    console.log('startNotSubscription created NotSubs for machine id', m.id);
  }

  const grpcConnection = grpcConnections.find(c => c.machineId === m.id)

  const channel = grpcConnection.connection.subscribeNotificationStatus({n: -1});

  channel.on("data", notSubcription.makeUpdater());

  channel.on("error", () => {
    //console.log('Notifications lost ', m.Id)
    notSubcription.clearMyNotState();
  });  
  channel.on("end", () => {
    //console.log('Notifications lost ', m.Id)
    notSubcription.clearMyNotState();
  });  


}


//
// Get current notification state
//
function getNotState (machineId) {
  const notState = notSubcriptions.find(s => s.getMachine().id === machineId)
  if (!notState) {
    return null
  }
  return notState.getMyNotState()
}


//
// Register callback to listen to updates
//
function onNotUpdate(callback) {
  clients.push(callback)
}

//
// Locals & initialization
//
let clients = [];
let notSubcriptions = [];


module.exports = {getNotState, onNotUpdate, startNotSubscription}