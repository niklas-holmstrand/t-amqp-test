const {grpcConnections, connectMachines} = require('../grpc_client');

//
// Class representing PE-subscription on one machine
//   - Keep last fetched (current) PE-state
//   - Provide factory for updating function
//
function ProductionEngineSubscription(machine) {
    //console.log('created pe subs: ', machine.id);

    let pesMachine = machine;
    let peState = null;

    this.getPeState = () => peState;
    this.getMachine = () => pesMachine;

    this.makeUpdater = function () {
        return function(newState) {
            //console.log('update Pe state for machine', pesMachine.id);
            peState = newState;
            clients.forEach(callback => { callback(peState, pesMachine.id); });
            pesMachine.connected = true;
        }
    }
}


//
// Try starting gRPC subscription for production engine state on a particular machine
//
function startPeSubscription(m) {

    peSubcription = peSubcriptions.find( s => s.getMachine().id === m.id)
    if(!peSubcription) {
        peSubcription = new ProductionEngineSubscription(m)
        peSubcriptions.push(peSubcription);
    }

    grpcConnection = grpcConnections.find( c => c.machineId === m.id)

    channel = grpcConnection.connection.subscribeProdEngineStatus({ n: -1 });
    channel.on("data", peSubcription.makeUpdater());  

    channel.on("error", () => {
        //console.log('Connection lost to ', m.machineId)
        m.connected = false;
    });  
    channel.on("end", () => {
        //console.log('Connection lost to ', m.machineId)
        m.connected = false;
    });  

}


//
// Get current productionEngine state
//
function getPeState(machineId) {
    peSubcription = peSubcriptions.find( s => s.getMachine().id === machineId)
    return (peSubcription.getPeState());
}


//
// Register callback to listen to updates
//
function onPeUpdate( callback ) {
    clients.push(callback);
}


//
// Locals & initialization
//
let clients = [];
let peSubcriptions = [];


module.exports = {getPeState, onPeUpdate, startPeSubscription}
