///////////////////////////////////////////////////////////////////////////////////////
//
// TPCP0 stuff
//
//var PROTO_PATH = __dirname + '../tpcp0.proto';
var PROTO_PATH = './tpcp0.proto';

var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
var tpcp_proto = grpc.loadPackageDefinition(packageDefinition).tpcp0;
var tpcp0Client;



////////////////////////////////////////////////////////////////////////////
//
// gRPC tunnel stuff
//
//
var PROTO_PATH = '../tunnel.proto';

var grpc = require('grpc');
var protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
var myProto = grpc.loadPackageDefinition(packageDefinition).tunnel;


////////////////////////////////////////////////////////////////////////////
//
// mqtt for subscriptions
//
//
const mqtt = require('mqtt')
var mqttClient = null;

function emitProductionEngineStatus(peState) {
    //process.stdout.write('.');
    var topic = "factory/PnP/Machines/" + machineId + '/State/ProductionEngine';
    mqttClient.publish( topic, JSON.stringify(peState), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish pe err:', err);} 
    })
}

function emitNotificationStatus(notState) {
    //process.stdout.write('N');
    var topic = "factory/PnP/Machines/" + machineId + '/State/Notifications';
    mqttClient.publish( topic, JSON.stringify(notState.notifications), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish not err:', err);} 
    })
}

function emitMagasineStatus(magState) {
    //process.stdout.write('M');
    var topic = "factory/PnP/Machines/" + machineId + '/State/ComponentLoading';
    mqttClient.publish( topic, JSON.stringify(magState.magSlots), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish cl err:', err);} 
    })
}

////////////////////////////////// TpCp //////////////////////////////////////////////
const tpcp_schema = require("./tpcp_pb");
var heartBeatSubscription;

function subscribeHeartBeats(call, callback) {
    console.log('subscribeHeartBeats');
    heartBeatSubscription = call;
    heartBeatSubscription.write('bomp');
}
function heartBeat() {
    setTimeout(heartBeat, 500);
    if(heartBeatSubscription) {
        heartBeatSubscription.write('bomp');
    }
}
setTimeout(heartBeat, 500);

async function handleCmd(call, callback) {
    const tpcpRsp = new tpcp_schema.TpcpRsp();

    // Unpack tpcp envelop
    bytesStr = call.request.requestMsg;
    bytes = new Uint8Array(bytesStr.split(",")); // Convert string (protobuff payload) to something deseializable
    const tpcpCmd = tpcp_schema.TpcpCmd.deserializeBinary(bytes);

    console.log("Got cmd:", tpcpCmd.getMsgtype());
    tpcpRsp.setMsgtype(tpcpCmd.getMsgtype()); // Copy message type to response to not have to do it for all cases

    switch(tpcpCmd.getMsgtype()) {
        case tpcp_schema.TpcpMsgType.STARTBATCHTYPE:
            var rspStartBatch;
            await handleStartBatch(tpcpCmd.getCmdstartbatch()).then(val => {rspStartBatch = val;}) ;
            tpcpRsp.setRspstartbatch(rspStartBatch);
            break;

        case tpcp_schema.TpcpMsgType.GETPRODUCTIONENGINESTATUSTYPE:
            var rspGetProductionEngineStatus;
            await handleGetProdEngineStatus(tpcpCmd.getCmdgetproductionenginestatus()).then(val => {rspGetProductionEngineStatus = val;}) ;
            tpcpRsp.setRspgetproductionenginestatus(rspGetProductionEngineStatus);
            break;

        case tpcp_schema.TpcpMsgType.PAUSETYPE:
            var rspPause;
            await handlePause(tpcpCmd.getCmdpause()).then(val => {rspPause = val;}) ;
            tpcpRsp.setRsppause(rspPause);
            break;

        case tpcp_schema.TpcpMsgType.PLAYTYPE:
            var rspPlay;
            await handlePlay(tpcpCmd.getCmdplay()).then(val => {rspPlay = val;}) ;
            tpcpRsp.setRspplay(rspPlay);
            break;
    
        case tpcp_schema.TpcpMsgType.STOPTYPE:
            var rspStop;
            await handleStop(tpcpCmd.getCmdstop()).then(val => {rspStop = val;}) ;
            tpcpRsp.setRspstop(rspStop);
            break;

        case tpcp_schema.TpcpMsgType.SUBSPETYPE:
            var rspSubsPe;
            await handleSubsPe(tpcpCmd.getCmdsubspe()).then(val => {rspSubsPe = val;}) ;
            tpcpRsp.setRspsubspe(rspSubsPe);
            break;

        case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:
            var rspSubsMagazineStatus;
            await handleSubsMagazineStatus(tpcpCmd.getCmdsubsmagazinestatus()).then(val => {rspSubsMagazineStatus = val;}) ;
            tpcpRsp.setRspsubsmagazinestatus(rspSubsMagazineStatus);
            break;

        case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:
            var rspSubsNotificationStatus;
            await handleSubsNotificationStatus(tpcpCmd.getCmdsubsnotificationstatus()).then(val => {rspSubsNotificationStatus = val;}) ;
            tpcpRsp.setRspsubsnotificationstatus(rspSubsNotificationStatus);
            break;
                        
        case tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE:
            var rspNqrLoadBoard;
            await handleNqrLoadBoard(tpcpCmd.getCmdnqrloadboard()).then(val => {rspNqrLoadBoard = val;}) ;
            tpcpRsp.setRspnqrloadboard(rspNqrLoadBoard);
            break;
                        
        default:
            console.log("Unknown cmd:", tpcpCmd.getMsgtype());
            process.exit(-1);
    }

    // send response
    console.log("Sending rsp:", tpcpRsp.getMsgtype());
    bytesStr = tpcpRsp.serializeBinary().toString();
    return callback(null, { responseMsg: bytesStr });
}


async function handleStartBatch(cmdStartBatch) {
    const rspStartBatch = new tpcp_schema.RspStartBatch();
    rspStartBatch.setErrcode(-1);
    rspStartBatch.setErrmsg("NotAssigned");

    console.log("Got StartBatch")
    console.log("Layout name:", cmdStartBatch.getLayoutname())
    console.log("Batch size:", cmdStartBatch.getBatchsize())
    console.log("Batch id:", cmdStartBatch.getBatchid())

    p = new Promise( (resolve, reject) => {
        tpcp0Client.cmdStartBatch({
            batchId: cmdStartBatch.getBatchid(), 
            layoutName: cmdStartBatch.getLayoutname(),  
            batchSize: cmdStartBatch.getBatchsize()
        }, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        rspStartBatch.setErrcode(val.errCode);
        rspStartBatch.setErrmsg(val.errMsg);
    });
    await p;

    return rspStartBatch;
}


async function handleGetProdEngineStatus(cmdGetProductionEngineStatus) {
    console.log("GetProdEngineStatus")
    const rspGetProductionEngineStatus = new tpcp_schema.RspGetProductionEngineStatus();

    p = new Promise( (resolve, reject) => {
        tpcp0Client.getProdEngineStatus({}, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        console.log('Got pe', val);
        switch(val.state) {
            case 'Stopped': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.STOPPED); break;
            case 'Paused': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.PAUSED); break;
            case 'Running': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.RUNNING); break;
            default: rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.UNKNOWN); break;
        }
        rspGetProductionEngineStatus.setBatchid(val.batchId);
        rspGetProductionEngineStatus.setLayoutname(val.layoutName);
        rspGetProductionEngineStatus.setBatchsize(val.batchSize);
        rspGetProductionEngineStatus.setBoardscompleted(val.boardsCompleted);
        rspGetProductionEngineStatus.setComponentsperboard(val.componentsPerBoard);
        rspGetProductionEngineStatus.setComponentsleft(val.componentsLeft);
        rspGetProductionEngineStatus.setComponentsmissing(val.componentsMissing);
    });
    await p;
  
    return rspGetProductionEngineStatus;
}

async function handlePause(cmdPause) {
    const rspPause = new tpcp_schema.RspPause();

    p = new Promise( (resolve, reject) => {
        tpcp0Client.cmdPause({}, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        rspPause.setErrcode(val.errCode);
        rspPause.setErrmsg(val.errMsg);
    });
    await p;

    return rspPause;
}

async function handlePlay() {
    const rspPlay = new tpcp_schema.RspPlay();
    rspPlay.setErrcode(-1);
    rspPlay.setErrmsg("NotAssigned");

    p = new Promise( (resolve, reject) => {
        tpcp0Client.cmdPlay({}, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        rspPlay.setErrcode(val.errCode);
        rspPlay.setErrmsg(val.errMsg);
    });
    await p;

    return rspPlay;
}

async function handleStop() {
    const rspStop = new tpcp_schema.RspStop();
    rspStop.setErrcode(-1);
    rspStop.setErrmsg("NotAssigned");

    p = new Promise( (resolve, reject) => {
        tpcp0Client.cmdStop({}, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        rspStop.setErrcode(val.errCode);
        rspStop.setErrmsg(val.errMsg);
    });
    await p;

    return rspStop;
}

var subsPeChannel = null;
async function handleSubsPe() {
    const rspSubsPe = new tpcp_schema.RspSubsPe();
    rspSubsPe.setErrcode(-1);
    rspSubsPe.setErrmsg("NotAssigned");

    // if already someone subscribing ignore
    if(subsPeChannel) {
        rspSubsPe.setErrcode(0);
        rspSubsPe.setErrmsg("gRPC adapter, ignored subscription. Already active");
        console.log("Ignore and shortcut subsPe");
        return rspSubsPe;
    }
    p = new Promise( (resolve, reject) => {
        subsPeChannel = tpcp0Client.subscribeProdEngineStatus({}, function (err, response) {
            resolve(response);
        });
        subsPeChannel.on("data", emitProductionEngineStatus);
    });
    p.then(val => {
        rspSubsPe.setErrcode(val.errCode);
        rspSubsPe.setErrmsg(val.errMsg);
    });
    await p;

    return rspSubsPe;
}

var subsMagCannel = null;
async function handleSubsMagazineStatus() {
    const rspSubsMagazineStatus = new tpcp_schema.RspSubsMagazineStatus();
    rspSubsMagazineStatus.setErrcode(-1);
    rspSubsMagazineStatus.setErrmsg("NotAssigned");

    // if already someone subscribing ignore
    if(subsMagCannel) {
        rspSubsMagazineStatus.setErrcode(0);
        rspSubsMagazineStatus.setErrmsg("gRPC adapter, ignored subscription. Already active");
        console.log("Ignore and shortcut subsMag");
        return rspSubsMagazineStatus;
    }
    p = new Promise( (resolve, reject) => {
        subsMagCannel = tpcp0Client.subscribeMagazineStatus({}, function (err, response) {
            resolve(response);
            reject(err);
        });
        subsMagCannel.on("data", emitMagasineStatus);
    });
    p.then(val => {
        rspSubsMagazineStatus.setErrcode(val.errCode);
        rspSubsMagazineStatus.setErrmsg(val.errMsg);
    });
    p.catch(val => {
        console.log('Subs mag error: ', val);
    });
    await p;

    return rspSubsMagazineStatus;
}

var subsNotChannel = null;
async function handleSubsNotificationStatus() {
    const rspSubsNotificationStatus = new tpcp_schema.RspSubsNotificationStatus();
    rspSubsNotificationStatus.setErrcode(-1);
    rspSubsNotificationStatus.setErrmsg("NotAssigned");

    if(subsNotChannel) {
        rspSubsNotificationStatus.setErrcode(0);
        rspSubsNotificationStatus.setErrmsg("gRPC adapter, ignored subscription. Already active");
        console.log("Ignore and shortcut subsNot");
        return rspSubsNotificationStatus;
    }
    p = new Promise( (resolve, reject) => {
        subsNotChannel= tpcp0Client.subscribeNotificationStatus({}, function (err, response) {
            resolve(response);
        });
        subsNotChannel.on("data", emitNotificationStatus);
    });
    p.then(val => {
        rspSubsNotificationStatus.setErrcode(val.errCode);
        rspSubsNotificationStatus.setErrmsg(val.errMsg);
    });
    await p;

    return rspSubsNotificationStatus;
}

async function handleNqrLoadBoard(cmdNqrLoadBoard) {
    const rspNqrLoadBoard = new tpcp_schema.RspNqrLoadBoard();
    rspNqrLoadBoard.setErrcode(-1);
    rspNqrLoadBoard.setErrmsg("NotAssigned");

    p = new Promise( (resolve, reject) => {
        tpcp0Client.cmdNqrLoadBoard({}, function (err, response) {
            resolve(response);
        });
    });
    p.then(val => {
        rspNqrLoadBoard.setErrcode(val.errCode);
        rspNqrLoadBoard.setErrmsg(val.errMsg);
    });
    await p;

    return rspNqrLoadBoard;
}



////////////////////////////////////////////////////////////////////////
/**
 * Main
 */

// function sleep(millis) {
//     return new Promise(resolve => setTimeout(resolve, millis));
// }
  
  
machineId = '0';
async function main() {
    if (process.argv.length >= 3) {
        machineId = process.argv[2];
    }

    portNo = '5000' + machineId;
    tpcp0Client = new tpcp_proto.TPSysService('localhost:' + portNo,
        grpc.credentials.createInsecure());

    //
    // Subscribe all status and relay to MQTT publishing (could also be done on subscmd)
    //
    // console.log('Setup subscriptions', portNo)
    // subsPeChannel = tpcp0Client.subscribeProdEngineStatus({});
    // subsPeChannel.on("data", emitProductionEngineStatus);
    // subsMagCannel = tpcp0Client.subscribeMagazineStatus({});
    // subsMagCannel.on("data", emitMagasineStatus);
    // subsMagCannel = tpcp0Client.subscribeNotificationStatus({});
    // subsMagCannel.on("data", emitNotificationStatus);
        
    //
    // mqtt connection
    //
    const TCP_URL = 'mqtt://localhost:1883'
    const TCP_TLS_URL = 'mqtts://localhost:8883'

    const options = {
        connectTimeout: 4000,

        // Authentication
        clientId: 'PP-machine'+ machineId,
        // username: 'emqx',
        // password: 'emqx',

        keepalive: 60,
        clean: true,
    }

    mqttClient = mqtt.connect(TCP_URL, options)
    mqttClient.on('connect', () => {
        console.log('MQTT connected')
    })
  

    //
    // Tunnel gRPC connection
    //
    portNo = '6000' + machineId;
    var server = new grpc.Server();
    server.addService(myProto.TunnelService.service, {
        message: handleCmd,
        subscribeHeartBeats: subscribeHeartBeats
    });
    server.bind('0.0.0.0:' + portNo, grpc.ServerCredentials.createInsecure());
    server.start();

    //startImageStream();


    console.log("gRPC adapter started, gRPC port to resmgr: ", portNo)
    // setTimeout(quick, 100);
    // setTimeout(startImageStream, 1000);
}

main();
