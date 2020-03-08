/*
 *
 */

const PROTO_PATH = '../tpcp0.proto'
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')
const grpc_promise = require('grpc-promise')

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

const myProto = grpc.loadPackageDefinition(packageDefinition).tpcp0

// Promisification probably not needed later. To be removed...
const meta = new grpc.Metadata()
meta.add('key', 'value')

const grpcConnections = [];
const connectMachines = function (machines) {
  machines.map(m => {

    //
    // If no portnumber is specified, add default one
    //
    hostNPort = m.hostname;
    if(hostNPort.indexOf(":") === -1) {
      hostNPort += ":50000";
    }

    console.log('Try connect machine: ', m.id, hostNPort)
    const c = new myProto.TPSysService(hostNPort, grpc.credentials.createInsecure())

    grpc_promise.promisify(c, ['getProdEngineStatus'], {metadata: meta, timeout: 1000})
    // grpc_promise.promisifyAll(c, {metadata: meta});

    grpcConnections.push({connection: c, machineId: m.id})
  })

}
// grpcConnections[0] = new myProto.TPSysService('localhost:50001', grpc.credentials.createInsecure());
// grpcConnections[1] = new myProto.TPSysService('localhost:50002', grpc.credentials.createInsecure());


// grpc_promise.promisify(grpcConnections[0], ['getProdEngineStatus'], { metadata: meta, timeout: 1000 });
// grpc_promise.promisify(grpcConnections[1], ['getProdEngineStatus'], { metadata: meta, timeout: 1000 });

//grpc_promise.promisifyAll(grpc_client);
//console.log('promisifyAll grpc-client');


module.exports = {grpcConnections, connectMachines}


