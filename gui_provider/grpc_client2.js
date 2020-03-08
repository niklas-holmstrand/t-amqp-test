/*
 *
 */

const PROTO_PATH = '../sample_java_server/src/main/proto/user.proto'
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

const myProto = grpc.loadPackageDefinition(packageDefinition).jServerInterface
//console.log('sever2: loadedPackageDefinition ', myProto)

// Promisification probably not needed later. To be removed...
const meta = new grpc.Metadata()
meta.add('key', 'value')

//grpcConnection2 = 0;
//const connectServer2 = function () {


  console.log('Try connect sever2: ')
  grpcConnection2 = new myProto.user('localhost:50100', grpc.credentials.createInsecure())
  //console.log('grpcConnection2: ', grpcConnection2)

    //grpc_promise.promisify(c, ['getProdEngineStatus'], {metadata: meta, timeout: 1000})
    // grpc_promise.promisifyAll(c, {metadata: meta});


//}

module.exports = {grpcConnection2}


