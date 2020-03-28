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





/////////////////////////////////// end tpcp0 ////////////////////////////////////////////////////

/*
 *
 */
//var readline = require('readline');

////////////// gRPC tunnel stuff ////////////////////////////
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


////////////////// mqtt for subscriptions /////////////////////////

const mqtt = require('mqtt')
var mqttClient = null;

function emitProductionEngineStatus(peState) {
    var topic = "factory/PnP/Machines/" + machineId + '/State/ProductionEngine';
    mqttClient.publish( topic, JSON.stringify(peState), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish pe err:', err);} 
    })
}

function emitNotificationStatus(notState) {
    var topic = "factory/PnP/Machines/" + machineId + '/State/Notifications';
    mqttClient.publish( topic, JSON.stringify(notState), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish not err:', err);} 
    })
    // var key = "factory.PnP.Machines." + machineId + '.Notifications';
    // subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myNotifications)));
}

function emitMagasineStatus(magState) {
            var topic = "factory/PnP/Machines/" + machineId + '/State/ComponentLoading';
    mqttClient.publish( topic, JSON.stringify(magState), 
        {retain: true}, (err) => {
        if (err) { console.log('tpsys_sim: mqtt publish cl err:', err);} 
    })
    // var key = "factory.PnP.Machines." + machineId + '.ComponentLoading';
    // subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myMagSlots)));
}

///////////////////////////////////////////


// var prodEngineSubscription = true;
// var magSubscription = true;
// var notSubscription = true;
// var cameraImagesSubscription = null;

// var fs = require('fs');
// const sharp = require('sharp');

// ///////////////////////// Internal Machine state //////////////////////////////
// let manaulBoardLoad = false;
// let waitingForBoard = false;

// ///////////////////////// Exported Machine state //////////////////////////////

// var myProductionEngine = {
//     state: 'Running',
//     batchId: '23-76-aa',
//     layoutName: 'Demo17',
//     batchSize: 25,
//     boardsCompleted: 0,
//     componentsPerBoard: 252,
//     componentsLeft: 130,
//     componentsMissing: 0
// };


// var myMagSlots = [
//     { state: 'Empty', name: '', slotNo: 1 },
//     { state: 'Present', name: 'Kalle', slotNo: 2 },
//     { state: 'NotYetPicked', name: 'AnnaKarin', slotNo: 3 },
//     { state: 'NotYetPicked', name: 'Lotta', slotNo: 4 },
//     { state: 'Used', name: 'Frida', slotNo: 8 },
//     { state: 'Active', name: 'Oscar', slotNo: 9 },
//     { state: 'Active', name: 'Viktor', slotNo: 10 },
// ];

// var myNotifications = [
// //    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
// //    runtimeData: ['C0489', 'E-lyt 50 uF 25V', 'Tower0', '4'], id: 1 },
// //    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
// //    runtimeData: ['C0855', 'Resist 6.8k', 'Tower1', '16'], id: 2 },
// ];

// var xGl = 800;
// var nxGl = 800;
// var refLeft = 800;

// var imageFeederObj = {
//   feederImgBase64: "obrazek",
//   x: xGl,
//   y: 5
// };


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
            const cmdStartBatch = tpcpCmd.getCmdstartbatch();
            rspStartBatch = handleStartBatch(cmdStartBatch);
            tpcpRsp.setRspstartbatch(rspStartBatch);
            break;

        case tpcp_schema.TpcpMsgType.GETPRODUCTIONENGINESTATUSTYPE:
            const cmdGetProductionEngineStatus = tpcpCmd.getCmdgetproductionenginestatus();
            rspGetProductionEngineStatus = handleGetProdEngineStatus(cmdGetProductionEngineStatus);
            tpcpRsp.setRspgetproductionenginestatus(rspGetProductionEngineStatus);
            break;

        case tpcp_schema.TpcpMsgType.PAUSETYPE:
            var rspPause;
            await handlePause(tpcpCmd.getCmdpause()).then(val => {rspPause = val;}) ;
            tpcpRsp.setRsppause(rspPause);
            break;

        case tpcp_schema.TpcpMsgType.PLAYTYPE:
            const cmdPlay = tpcpCmd.getCmdplay();
            rspPlay = handlePlay(cmdPlay);
            tpcpRsp.setRspplay(rspPlay);
            break;
    
        case tpcp_schema.TpcpMsgType.STOPTYPE:
            const cmdStop = tpcpCmd.getCmdstop();
            rspStop = handleStop(cmdStop);
            tpcpRsp.setRspstop(rspStop);
            break;

        case tpcp_schema.TpcpMsgType.SUBSPETYPE:
            const cmdSubsPe = tpcpCmd.getCmdsubspe();
            rspSubsPe = handleSubsPe(cmdSubsPe);
            tpcpRsp.setRspsubspe(rspSubsPe);
            break;

        case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:
            const cmdSubsMagazineStatus = tpcpCmd.getCmdsubsmagazinestatus();
            rspSubsMagazineStatus = handleSubsMagazineStatus(cmdSubsMagazineStatus);
            tpcpRsp.setRspsubsmagazinestatus(rspSubsMagazineStatus);
            break;

        case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:
            const cmdSubsNotificationStatus = tpcpCmd.getCmdsubsnotificationstatus();
            rspSubsNotificationStatus = handleSubsNotificationStatus(cmdSubsNotificationStatus);
            tpcpRsp.setRspsubsnotificationstatus(rspSubsNotificationStatus);
            break;
                        
        case tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE:
            const cmdNqrLoadBoard = tpcpCmd.getCmdnqrloadboard();
            rspNqrLoadBoard = handleNqrLoadBoard(cmdNqrLoadBoard);
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


function handleStartBatch(cmdStartBatch) {
    // Create response
    const rspStartBatch = new tpcp_schema.RspStartBatch();
    rspStartBatch.setErrcode(-1);
    rspStartBatch.setErrmsg("NotAssigned");

    console.log("Got StartBatch")
    console.log("Layout name:", cmdStartBatch.getLayoutname())
    console.log("Batch size:", cmdStartBatch.getBatchsize())
    console.log("Batch id:", cmdStartBatch.getBatchid())

    if (myProductionEngine.state != 'Stopped') {
        rspStartBatch.setErrcode(-1);
        rspStartBatch.setErrmsg('Not allowed in current state');
        return rspStartBatch;
    }

    myProductionEngine.state = 'Paused';
    myProductionEngine.batchId = cmdStartBatch.getBatchid();
    myProductionEngine.layoutName = cmdStartBatch.getLayoutname();
    myProductionEngine.batchSize = cmdStartBatch.getBatchsize();

    myProductionEngine.boardsCompleted = 0;
    myProductionEngine.componentsLeft = myProductionEngine.componentsPerBoard;

    rspStartBatch.setErrcode(0);
    rspStartBatch.setErrmsg("ok");
    return rspStartBatch;
}


function handleGetProdEngineStatus(cmdGetProductionEngineStatus) {
    console.log("GetProdEngineStatus")
    const rspGetProductionEngineStatus = new tpcp_schema.RspGetProductionEngineStatus();

    switch(myProductionEngine.state) {
        case 'Stopped': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.STOPPED); break;
        case 'Paused': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.PAUSED); break;
        case 'Running': rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.RUNNING); break;
        default: rspGetProductionEngineStatus.setState(tpcp_schema.ProductionEngineState.UNKNOWN); break;
    }
    rspGetProductionEngineStatus.setBatchid(myProductionEngine.batchId);
    rspGetProductionEngineStatus.setLayoutname(myProductionEngine.layoutName);
    rspGetProductionEngineStatus.setBatchsize(myProductionEngine.batchSize);
    rspGetProductionEngineStatus.setBoardscompleted(myProductionEngine.boardsCompleted);
    rspGetProductionEngineStatus.setComponentsperboard(myProductionEngine.componentsPerBoard);
    rspGetProductionEngineStatus.setComponentsleft(myProductionEngine.componentsLeft);
    rspGetProductionEngineStatus.setComponentsmissing(myProductionEngine.componentsMissing);
  
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

function handlePlay() {
    const rspPlay = new tpcp_schema.RspPlay();
    rspPlay.setErrcode(-1);
    rspPlay.setErrmsg("NotAssigned");

    if (myProductionEngine.state != 'Paused') {
        rspPlay.setErrcode(-1);
        rspPlay.setErrmsg('Not allowed in current state');
        return rspPlay;
    }

    console.log("Play...");
    myProductionEngine.state = 'Running';

    rspPlay.setErrcode(0);
    rspPlay.setErrmsg("ok");
    return rspPlay;
}

function handleStop() {
    const rspStop = new tpcp_schema.RspStop();
    rspStop.setErrcode(-1);
    rspStop.setErrmsg("NotAssigned");

    if (myProductionEngine.state != 'Paused') {
        rspStop.setErrcode(-1);
        rspStop.setErrmsg('Not allowed in current state');
        return rspStop;
    }

    console.log("Stop");
    myProductionEngine.state = 'Stopped';
    myProductionEngine.batchId = '';
    myProductionEngine.layoutName = '';
    myProductionEngine.batchSize = 0;

    rspStop.setErrcode(0);
    rspStop.setErrmsg("ok");
    return rspStop;
}

function handleSubsPe() {
    const rspSubsPe = new tpcp_schema.RspSubsPe();
    rspSubsPe.setErrcode(-1);
    rspSubsPe.setErrmsg("NotAssigned");


    console.log("SubsPe");
    prodEngineSubscription = true;
    emitProductionEngineStatus();

    rspSubsPe.setErrcode(0);
    rspSubsPe.setErrmsg("ok");
    return rspSubsPe;
}

function handleSubsMagazineStatus() {
    const rspSubsMagazineStatus = new tpcp_schema.RspSubsMagazineStatus();
    rspSubsMagazineStatus.setErrcode(-1);
    rspSubsMagazineStatus.setErrmsg("NotAssigned");


    console.log("SubsMagazineStatus");
    magSubscription = true;
    emitMagasineStatus();

    rspSubsMagazineStatus.setErrcode(0);
    rspSubsMagazineStatus.setErrmsg("ok");
    return rspSubsMagazineStatus;
}

function handleSubsNotificationStatus() {
    const rspSubsNotificationStatus = new tpcp_schema.RspSubsNotificationStatus();
    rspSubsNotificationStatus.setErrcode(-1);
    rspSubsNotificationStatus.setErrmsg("NotAssigned");


    console.log("SubsNotificationStatus");
    notSubscription = true;
    emitNotificationStatus();

    rspSubsNotificationStatus.setErrcode(0);
    rspSubsNotificationStatus.setErrmsg("ok");
    return rspSubsNotificationStatus;
}

function handleNqrLoadBoard(cmdNqrLoadBoard) {
    const rspNqrLoadBoard = new tpcp_schema.RspNqrLoadBoard();
    rspNqrLoadBoard.setErrcode(-1);
    rspNqrLoadBoard.setErrmsg("NotAssigned");


    console.log("NqrLoadBoard ok:", cmdNqrLoadBoard.getOk());
    if(waitingForBoard) {
        waitingForBoard = false;
        removeNotification(100);

        if(cmdNqrLoadBoard.getOk()) {
            console.log('Board loaded')
        } else {
            console.log('Board not loaded, pause')
            myProductionEngine.state = 'Paused';
        }
    }

    rspNqrLoadBoard.setErrcode(0);
    rspNqrLoadBoard.setErrmsg("ok");
    return rspNqrLoadBoard;
}



////////////////////////////////////////////////////////////////////////
/**
 * Main
 */

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
  
  
machineId = '0';
async function main() {
    portNo = '50000';
    if (process.argv.length >= 3) {
        machineId = process.argv[2];
    }

    tpcp0Client = new tpcp_proto.TPSysService('localhost:' + portNo,
        grpc.credentials.createInsecure());

    //
    // Subscribe all status and relay to MQTT publishing
    //
    subsPeChannel = tpcp0Client.subscribeProdEngineStatus({});
    subsPeChannel.on("data", emitProductionEngineStatus);
    channel2 = tpcp0Client.subscribeMagazineStatus({});
    channel2.on("data", emitMagasineStatus);
    channel3 = tpcp0Client.subscribeNotificationStatus({});
    channel3.on("data", emitNotificationStatus);
        
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


    console.log("tpsys_sim server started, gRPC port: ", portNo)
    // setTimeout(quick, 100);
    // setTimeout(startImageStream, 1000);
}

main();
