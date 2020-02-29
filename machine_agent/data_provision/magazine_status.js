const {grpcConnections, connectMachines} = require('../grpc_client');


//
// Class representing Mag-subscription on one machine
//   - Keep last fetched (current) PE-state
//   - Provide factory for updating function
//
function MagazineSubscription(machine) {
    //console.log('created mag subs: ', machine.id);

    let magsMachine = machine;
    let magState = null;

    this.getMagState = () => magState;
    this.getMachine = () => magsMachine;

    this.makeUpdater = function () {
        return function(newState) {
            //console.log('update mag state for machine', magsMachine.id);
            magState = newState;
            clients.forEach(callback => { callback(magState, magsMachine.id); });
        }
    }
}


//
// Try starting gRPC subscription for magazine state on a particular machine
//
function startMagSubscription(m) {
    
    magSubcription = magSubcriptions.find( s => s.getMachine().id === m.id)
    if(!magSubcription) {
        magSubcription = new MagazineSubscription(m);
        magSubcriptions.push(magSubcription);
    }

    grpcConnection = grpcConnections.find( c => c.machineId === m.id)

    channel = grpcConnection.connection.subscribeMagazineStatus({ n: -1 });
    channel.on("data", magSubcription.makeUpdater());  

    channel.on("error", () => {
        //  console.log('Connection lost to ', c.machineId)
    });  

}


//
// Get current productionEngine state
//
function getMagState(machineId) {
    magSubcription = magSubcriptions.find( s => s.getMachine().id === machineId)
    return (magSubcription.getMagState());
}


//
// Register callback to listen to updates
//
function onMagUpdate( callback ) {
    clients.push(callback);
}


//
// Locals & initialization
//
let clients = [];
let magSubcriptions = [];


module.exports = {getMagState, onMagUpdate, startMagSubscription}