/*
 * TPsys grpc simulator very 00 version
 *
 */
var readline = require('readline');

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


////////////////// amqp for subscriptions /////////////////////////

var amqp = require('amqplib/callback_api');
var subscriptionAmqpChannel
var exchangeName = 'topic_ppMachines';

amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    subscriptionAmqpChannel = channel;

    channel.assertExchange(exchangeName, 'topic', {
      durable: false
    });


  });
});

  ///////////////////////////////////////////


var prodEngineSubscription = null;
var magSubscription = null;
var notSubscription = null;
var cameraImagesSubscription = null;

var fs = require('fs');
const sharp = require('sharp');

///////////////////////// Internal Machine state //////////////////////////////
let manaulBoardLoad = false;
let waitingForBoard = false;

///////////////////////// Exported Machine state //////////////////////////////

var myProductionEngine = {
    state: 'Running',
    batchId: '23-76-aa',
    layoutName: 'Demo17',
    batchSize: 25,
    boardsCompleted: 0,
    componentsPerBoard: 252,
    componentsLeft: 130,
    componentsMissing: 0
};


var myMagSlots = [
    { state: 'Empty', name: '', slotNo: 1 },
    { state: 'Present', name: 'Kalle', slotNo: 2 },
    { state: 'NotYetPicked', name: 'AnnaKarin', slotNo: 3 },
    { state: 'NotYetPicked', name: 'Lotta', slotNo: 4 },
    { state: 'Used', name: 'Frida', slotNo: 8 },
    { state: 'Active', name: 'Oscar', slotNo: 9 },
    { state: 'Active', name: 'Viktor', slotNo: 10 },
];

var myNotifications = [
//    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
//    runtimeData: ['C0489', 'E-lyt 50 uF 25V', 'Tower0', '4'], id: 1 },
//    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
//    runtimeData: ['C0855', 'Resist 6.8k', 'Tower1', '16'], id: 2 },
];

var xGl = 800;
var nxGl = 800;
var refLeft = 800;

var imageFeederObj = {
  feederImgBase64: "obrazek",
  x: xGl,
  y: 5
};


////////////////////////////////// TpCp //////////////////////////////////////////////
const tpcp_schema = require("../tpcp0_pb");

function handleCmd(call, callback) {
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
            const cmdPause = tpcpCmd.getCmdpause();
            rspPause = handlePause(cmdPause);
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

function handlePause(cmdPause) {
    const rspPause = new tpcp_schema.RspPause();
    rspPause.setErrcode(-1);
    rspPause.setErrmsg("NotAssigned");

    if (myProductionEngine.state != 'Running') {
        rspPause.setErrcode(-1);
        rspPause.setErrmsg('Not allowed in current state');
        return rspPause;NotificationStatus
    }

    console.log("Pausing")
    myProductionEngine.state = 'Paused';

    rspPause.setErrcode(0);
    rspPause.setErrmsg("ok");
    return rspPause;
}

function handlePlay(call, callback) {
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

function handleStop(call, callback) {
    const rspStop = new tpcp_schema.RspStop();
    rspStop.setErrcode(-1);
    rspStop.setErrmsg("NotAssigned");

    if (myProductionEngine.state != 'Stopped') {
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

function handleSubsPe(call, callback) {
    const rspSubsPe = new tpcp_schema.RspSubsPe();
    rspSubsPe.setErrcode(-1);
    rspSubsPe.setErrmsg("NotAssigned");


    console.log("SubsPe");
    prodEngineSubscription = true;

    rspSubsPe.setErrcode(0);
    rspSubsPe.setErrmsg("ok");
    return rspSubsPe;
}

function handleSubsMagazineStatus(call, callback) {
    const rspSubsMagazineStatus = new tpcp_schema.RspSubsMagazineStatus();
    rspSubsMagazineStatus.setErrcode(-1);
    rspSubsMagazineStatus.setErrmsg("NotAssigned");


    console.log("SubsMagazineStatus");
    magSubscription = true;

    rspSubsMagazineStatus.setErrcode(0);
    rspSubsMagazineStatus.setErrmsg("ok");
    return rspSubsMagazineStatus;
}

function handleSubsNotificationStatus(call, callback) {
    const rspSubsNotificationStatus = new tpcp_schema.RspSubsNotificationStatus();
    rspSubsNotificationStatus.setErrcode(-1);
    rspSubsNotificationStatus.setErrmsg("NotAssigned");


    console.log("SubsNotificationStatus");
    notSubscription = true;

    rspSubsNotificationStatus.setErrcode(0);
    rspSubsNotificationStatus.setErrmsg("ok");
    return rspSubsNotificationStatus;
}


// function getMagazineStatus(call, callback) {
//     console.log("GetMagazineStatus")
//     const msg = { magSlots: myMagSlots }
//     callback(null, msg);
// }

// function getNotificationStatus(call, callback) {
//     console.log("getNotificationStatus")
//     const msg = { notifications: myNotifications }
//     callback(null, msg);
// }

// function getImageFromFeeder(call, callback) {
//   console.log("getImageFromFeeder");

//   let originalImage = "./resources/reference.jpg";

//   sharp(originalImage)
//     .extract({
//       width: 500,
//       height: 500,
//       left: 800,
//       top: 750
//     })
//     .toBuffer()
//     .then(buffer => {
//         const msg = {
//           feederImgBase64: `data:image/png;base64,${buffer.toString("base64")}`,
//           x: 800,
//           y: 750
//         };
//         callback(null, msg);
//     }
//     );
// }

// function getImageFromFeederOffset(call, callback) {
//   console.log("getImageFromFeederOffset");

//   const referenceLeft = 800;
//   const referenceTop = 750;

//   const newLeft = call.request.x > 0 ? call.request.x : referenceLeft;
//   const newTop =  call.request.y > 0 ? call.request.y : referenceTop;

//   nxGl = newLeft;
//   //refLeft = refLeft + newLeft;

//   console.log(`new left je: ${newLeft}`);

//   let originalImage = "./resources/reference.jpg";

//   sharp(originalImage)
//     .extract({
//       width: 500,
//       height: 500,
//       left: newLeft,
//       top: newTop
//     })
//     .toBuffer()
//     .then(buffer => {
//         console.log(`after crop`)
//         const msg = {
//           feederImgBase64: `data:image/jpg;base64,${buffer.toString("base64")}`,
//           x: newLeft,
//           y: newTop
//         };
//         callback(null, msg);
//     }
//     );
// }

// function moveCamX(call, callback) {
//   console.log("moveCamX");

//   const referenceLeft = 800;

//   const newLeft = call.request.x > 0 ? call.request.x : referenceLeft;

//   nxGl = newLeft;
//   callback(null, { result: true });
// }

// function cmdStartBatch(call, callback) {
//     if (myProductionEngine.state != 'Stopped') {
//         return callback(null, { errCode: -1, errMsg: 'Not allowed in current state' });
//     }

//     myProductionEngine.state = 'Paused';
//     myProductionEngine.batchId = call.request.batchId;
//     myProductionEngine.layoutName = call.request.layoutName;
//     myProductionEngine.batchSize = call.request.batchSize;

//     myProductionEngine.boardsCompleted = 0;
//     myProductionEngine.componentsLeft = myProductionEngine.componentsPerBoard;

//     return callback(null, { errCode: 0, errMsg: '' });
// }

// function cmdNqrLoadBoard(call, callback) {

//     if(waitingForBoard) {
//         waitingForBoard = false;
//         removeNotification(100);

//         if(call.request.ok) {
//             console.log('Board loaded')
//         } else {
//             console.log('Board not loaded, pause')
//             myProductionEngine.state = 'Paused';
//         }

//     } else {
//         console.log('unexpected CmdNqrLoadBoard')
//         callback(null, { errCode: -1, errMsg: 'Unexpected CmdNqrLoadBoard' });
//         return;
//     }
//     callback(null, { errCode: 0, errMsg: '' });
// }




// function subscribeCameraImages(call, callback) {
//     console.log('subs subscribeCameraImages');
//     cameraImagesSubscription = call;

//     sendFeederImage();
// }

/////////////////////////////////////// Add / remove notifications /////////////////////////////////////////
function addNotification(newNot) {
    old = myNotifications.find(n => n.id === newNot.id);
    if(!old) {
        myNotifications.push(newNot)
    }
}

function removeNotification(id) {
    newNotifications = myNotifications.filter(n => n.id !== id);
    //console.log('deleting notif', newNotifications, myNotifications);
    myNotifications = newNotifications
}

//////////////////////////////////// Simulation of life ////////////////////////////////////////////

var prevPeStateJsonStr = null;
var prevMagStateJsonStr = null;
var prevNotStateJsonStr = null;

function quick() {
    setTimeout(quick, 300);
    // IF mag 4 is disabled, simulate missing components
    if(myMagSlots[4].state === 'Present' || myMagSlots[4].state === 'Empty') {
        myProductionEngine.componentsMissing = 25;

        addNotification({ type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
        runtimeData: ['C0489', 'E-lyt 50 uF 25V', 'Tower0', '9'], id: 1 });
        addNotification({ type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
        runtimeData: ['C0855', 'Resist 6.8k', 'Tower1', '16'], id: 2 });

        if(myProductionEngine.componentsLeft <= 25)
            myProductionEngine.state = 'Paused';
    } else {
        myProductionEngine.componentsMissing = 0;
        removeNotification(1);
        removeNotification(2);
    }

    // If running, simulate consumption etc
    if (myProductionEngine.state === 'Running' && !waitingForBoard) {
        if (myProductionEngine.componentsLeft > 0) {

            myProductionEngine.componentsLeft -= 1;
            if (myProductionEngine.componentsLeft < 100) {
                myMagSlots[2].state = 'Used';
            }
            if (myProductionEngine.componentsLeft < myProductionEngine.componentsPerBoard / 2) {
                myMagSlots[3].state = 'Used';
            }

        } else {
            myProductionEngine.boardsCompleted++;
            myMagSlots[2].state = 'NotYetPicked';
            myMagSlots[3].state = 'NotYetPicked';
            myProductionEngine.componentsLeft = myProductionEngine.componentsPerBoard;

            if (myProductionEngine.boardsCompleted === myProductionEngine.batchSize) {
                myProductionEngine.state = 'Paused'
            }

            if (manaulBoardLoad) {
                waitingForBoard = true;
                addNotification({ type: 'LoadBoardRequest', severity: 'Query', 
                    runtimeData: [], id: 100 });
                console.log('wait for board..');
            }
        }
    }


    //
    // Report any changes in PE to any subscribers
    // Very ugly string comparsion due to problems comparing/cloning arrays. ToBeImproved.
    //
    productionEngineJsonStr = JSON.stringify(myProductionEngine)
    if (productionEngineJsonStr !== prevPeStateJsonStr) {
        prevPeStateJsonStr = productionEngineJsonStr;

        if (prodEngineSubscription) {
            var key = machineId + '.ProductionEngine';
            subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myProductionEngine)));
        }
    }
    
    //
    // Report any changes in Notification to any subscriber
    // Very ugly string comparsion due to problems comparing/cloning arrays. ToBeImproved.
    //
    notificationJsonStr = JSON.stringify(myNotifications)
    if (notificationJsonStr !== prevNotStateJsonStr) {
        prevNotStateJsonStr = notificationJsonStr;

        if (notSubscription) {
            var key = machineId + '.Notifications';
            subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myNotifications)));
        }
    }


    //
    // Report any changes in mag to any subscribers
    // Very ugly string comparsion due to problems comparing/cloning arrays. ToBeImproved.
    //
    magJsonStr = JSON.stringify(myMagSlots)
    if (magJsonStr !== prevMagStateJsonStr) {
        prevMagStateJsonStr = magJsonStr

        if (magSubscription) {
            var key = machineId + '.ComponentLoading';
            subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myMagSlots)));
        }
    }

}



////////////////////////////////////////////////////////////////////////
// Input form stdin
////////////////////////////////////////////////////////////////////////


var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', line => {
    console.log('got line:', line);
    words = line.split(' ');
    if(!words[0]) {
        return;
    }

    if(words[0] === '?' || words[0] === 'h' || words[0] === 'help') {
        console.log('========== Cmds =============');
        console.log('magbut <slotNo>         Press mag button');
        console.log('magrem <slotNo>         Remove mag');
        console.log('magins <slotNo> <name>  Insert mag');
        console.log('manload                 Toggle manual loading of boards');
        console.log('=============================');
        return;
    }

    if(words[0] === 'magbut') {
        slotNo = 1;
        if(words[1]) {
            slotNo = parseInt(words[1]);
        }

        i = findMagSlot(slotNo);
        if(i == null)  {
            console.log('Cant find magslot ' + slotNo + '!');
            return;
        }

        if(myMagSlots[i]['state'] === 'Present') {
            myMagSlots[i]['state'] = 'Active';
        } else if (myMagSlots[i]['state'] === 'Active' || myMagSlots[i]['state'] === 'Used') {
            myMagSlots[i]['state'] = 'Present';
        }
        console.log('Magslot ' + slotNo + ': ', myMagSlots[i]);
        return;
    }

    if(words[0] === 'magrem') {
        slotNo = 1;
        if(words[1]) {
            slotNo = parseInt(words[1]);
        }

        i = findMagSlot(slotNo);
        if(i == null) return;

        myMagSlots[i]['state'] = 'Empty';
        myMagSlots[i]['name'] = '';
        return;
    }

    if(words[0] === 'magins') {
        slotNo = 1;
        if(words[1]) {
            slotNo = parseInt(words[1]);
        }
        name = 'Putte';
        if(words[2]) {
            name = words[2];
        }

        i = findMagSlot(slotNo);
        if(i == null) return;

        if(myMagSlots[i]['state'] === 'Empty') {
            myMagSlots[i]['state'] = 'Present';
            myMagSlots[i]['name'] = name;
            console.log('Inserted magazine');
        } else {
            console.log('Magazine ', myMagSlots[i]['name'], 'already in slot ', slotNo);
        }
        return;
    }

    if(words[0] === 'manload') {
        manaulBoardLoad = !manaulBoardLoad;
        console.log('Manual loading of boards:', manaulBoardLoad);
        return;
    }

    console.log('Cmd not found:', line);
});

// Return index to mag in slotno
function findMagSlot(slotNo) {

    i = null;
    myMagSlots.map((slotData, index, a) => {
        if(slotData['slotNo'] === slotNo) {
            i = index;
        }
    })
    return i;
}

function sendFeederImage() {
    const referenceTop = 750;
    const step = 4;

    if((nxGl - xGl) < -step) {
        xGl -= step;
    } else if ((nxGl - xGl) > step) {
        xGl += step;
    }

    const newLeft = xGl;
    const newTop = referenceTop;

    let originalImage = "./resources/reference.jpg";

    sharp(originalImage)
      .extract({
        width: 500,
        height: 500,
        left: newLeft,
        top: newTop
      })
      .toBuffer()
      .then(buffer => {
        const msg = {
          feederImgBase64: `data:image/jpg;base64,${buffer.toString("base64")}`,
          x: newLeft,
          y: newTop
        };
        cameraImagesSubscription.write(msg);
      });
}

const fps15 = 66.66;
const fps24 = 41.66;
const fps30 = 33.33;
const fps60 =  16.66;

function startImageStream() {
    setTimeout(startImageStream, fps30);
    if(cameraImagesSubscription) {
       sendFeederImage()
    }
}

////////////////////////////////////////////////////////////////////////
/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
machineId = '0';
function main() {
    portNo = '50000';
    if (process.argv.length >= 3) {
        machineId = process.argv[2];
    }
    portNo = '5000' + machineId;

    var server = new grpc.Server();
    server.addService(myProto.TunnelService.service, {
        message: handleCmd
    });
    server.bind('0.0.0.0:' + portNo, grpc.ServerCredentials.createInsecure());
    server.start();

    //startImageStream();


    console.log("server started, port: ", portNo)
    setTimeout(quick, 100);
    setTimeout(startImageStream, 1000);
}

main();
