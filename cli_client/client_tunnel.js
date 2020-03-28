/*
 * test the tpsys_server
 * 
 */
const tpcp_schema = require("../tpsys_sim/tpcp_pb");


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
var tunnel_proto = grpc.loadPackageDefinition(packageDefinition).tunnel;

function presentStatus(pEstate) {
    console.log(pEstate);
}

function str2buf(str) {
    var arr = str.split(","), view = new Uint8Array(arr);
    return view.buffer
}

function main() {
    portNo = '50000';
    if (process.argv.length >= 3) {
        portNo = '5000' + process.argv[2];
    }


    var client = new tunnel_proto.TunnelService('localhost:' + portNo,
        grpc.credentials.createInsecure());

    var cmd = null;
    if (process.argv.length >= 4) {
        cmd = process.argv[3];
    } else {
        console.log('Syntax:');
        console.log('node cli_client <machineId> <cmd>');
        console.log('cmd =  "?" for help');
        return
    }

    if (cmd === '?' || cmd === 'h' || cmd === 'help' || cmd === '-h') {
        console.log('=====================');
        console.log('Syntax: node cli_client <machineId> <cmd>');
        console.log('where');
        console.log('');
        console.log('<machineId> = 0, 1 etc');
        console.log('');
        console.log('<cmd> = One of:');
        console.log('getPeState - Get production engine state');
        console.log('getMagState - Get magazines status');
        console.log('getNotState - Get notification status');
        console.log('goTUI - Give back control of TPSys to classic TUI');
        console.log('defineBatch [layoutName [batchSize [batchId]]] - Define a new batch');
        console.log('pause - Pause production');
        console.log('play - Start/resume production');
        console.log('stop - Stop ongoing batch');
        console.log('rspLoadBoard [N] - Confirm that board has been loaded manually (N = pause instead)');
        console.log('rspRemoveBoard - Confirm that board has been removed');
        console.log('rspUnloadAnyLoadedBoard [ok [boardExists]] - Confirm if ok to continue when prompted to unload any loaded board');
        console.log('subsPe - Subscribe production engine status');
        console.log('subsMag - Subscribe mag status');
        console.log('subsNot - Subscribe notification status');
        console.log('=====================');
    }

    // if (cmd === 'goTUI') {
    //     console.log('Giving back control to TUI');
    //     client.cmdSwitchToTUI({}, function (err, response) {
    //         if (response && response.errCode != 0) {
    //             console.log('Failed: ' + response.errMsg);
    //         }
    //     });
    //     return;
    // }

    if (cmd === 'defineBatch') {
        layoutName = 'TheClientLayout';
        batchSize = 75;
        batchId = '982-33-BC';
        
        if (process.argv.length >= 5) {
            layoutName = process.argv[4]
        }
        if (process.argv.length >= 6) {
            batchSize = process.argv[5]
        }
        if (process.argv.length >= 7) {
            batchId = process.argv[6]
        }
        console.log('Define batch LayoutName: ' + layoutName + ' BatchSize: ' + batchSize + ' BatchId: ' + batchId)


        const cmdStartBatch = new tpcp_schema.CmdStartBatch();
        cmdStartBatch.setLayoutname(layoutName);
        cmdStartBatch.setBatchsize(batchSize);
        cmdStartBatch.setBatchid(batchId);

        const tpcpCmd = new tpcp_schema.TpcpCmd();
        tpcpCmd.setCmdstartbatch(cmdStartBatch);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.STARTBATCHTYPE);
        const bytes = tpcpCmd.serializeBinary();

        // Send and wait for response
        client.message({
            requestMsg: bytes
        }, function (err, response) {
            const rbytes = str2buf(response.responseMsg);
            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(rbytes);
        
            // Assume response is correct type
            const rspStartBatch = tpcpRsp.getRspstartbatch();
            const errCode = rspStartBatch.getErrcode();
            const errMsg = rspStartBatch.getErrmsg();

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
                return;
            }
            console.log('Ok');
        });
        return;
    }

    if (cmd === 'pause') {
        console.log('Pausing...');

        const cmdPause = new tpcp_schema.CmdPause();

        const tpcpCmd = new tpcp_schema.TpcpCmd();
        tpcpCmd.setCmdpause(cmdPause);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.PAUSETYPE);
        const bytes = tpcpCmd.serializeBinary();

        // Send and wait for response
        client.message({
            requestMsg: bytes
        }, function (err, response) {
            const rbytes = str2buf(response.responseMsg);
            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(rbytes);
        
            // Assume response is correct type
            const rspPause = tpcpRsp.getRsppause();
            const errCode = rspPause.getErrcode();
            const errMsg = rspPause.getErrmsg();

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
                return;
            }
            console.log('ok');
        });
        return;
    }

    if (cmd === 'play') {
        console.log('Playing...');

        const cmdPlay = new tpcp_schema.CmdPlay();

        const tpcpCmd = new tpcp_schema.TpcpCmd();
        tpcpCmd.setCmdpause(cmdPlay);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.PLAYTYPE);
        const bytes = tpcpCmd.serializeBinary();

        // Send and wait for response
        client.message({
            requestMsg: bytes
        }, function (err, response) {
            const rbytes = str2buf(response.responseMsg);
            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(rbytes);
        
            // Assume response is correct type
            const rspPlay = tpcpRsp.getRspplay();
            const errCode = rspPlay.getErrcode();
            const errMsg = rspPlay.getErrmsg();

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
                return;
            }
            console.log('ok');
        });
        return;
    }

    if (cmd === 'stop') {
        console.log('Stopping...');

        const cmdStop = new tpcp_schema.CmdStop();

        const tpcpCmd = new tpcp_schema.TpcpCmd();
        tpcpCmd.setCmdstop(cmdStop);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.STOPTYPE);
        const bytes = tpcpCmd.serializeBinary();

        // Send and wait for response
        client.message({
            requestMsg: bytes
        }, function (err, response) {
            const rbytes = str2buf(response.responseMsg);
            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(rbytes);
        
            // Assume response is correct type
            const rspStop = tpcpRsp.getRspstop();
            const errCode = rspStop.getErrcode();
            const errMsg = rspStop.getErrmsg();

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
                return;
            }
            console.log('ok');
        });
        return;
    }

     if (!cmd || cmd === "getPeState") {
        const cmdGetProductionEngineStatus = new tpcp_schema.CmdGetProductionEngineStatus();
  

        const tpcpCmd = new tpcp_schema.TpcpCmd();
        tpcpCmd.setCmdgetproductionenginestatus(cmdGetProductionEngineStatus);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.GETPRODUCTIONENGINESTATUSTYPE);
        const bytes = tpcpCmd.serializeBinary();

        // Send and wait for response
        client.message({
            requestMsg: bytes
        }, function (err, response) {
            const rbytes = str2buf(response.responseMsg);
            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(rbytes);
        
            // Assume response is correct type
            const rspGetProductionEngineStatus = tpcpRsp.getRspgetproductionenginestatus();

            switch(rspGetProductionEngineStatus.getState()) {
                case tpcp_schema.ProductionEngineState.STOPPED: state = 'Stopped'; break;
                case tpcp_schema.ProductionEngineState.PAUSED: state = 'Paused'; break;
                case tpcp_schema.ProductionEngineState.RUNNING: state = 'Running'; break;
                default: state = 'Unknown: ' + rspGetProductionEngineStatus.getState(); break;
            }

            console.log("ProductionEngineStatus");
            console.log("State:", state);
            console.log("BatchId:", rspGetProductionEngineStatus.getBatchid());
            console.log("LayoutName:", rspGetProductionEngineStatus.getLayoutname());
            console.log("BatchSize:", rspGetProductionEngineStatus.getBatchsize());
            console.log("BoardsCompleted:", rspGetProductionEngineStatus.getBoardscompleted());
            console.log("ComponentsPerBoard:", rspGetProductionEngineStatus.getComponentsperboard());
            console.log("ComponentsLeft:", rspGetProductionEngineStatus.getComponentsleft());
            console.log("ComponentsMissing:", rspGetProductionEngineStatus.getComponentsmissing());
        });
        return;
     }


//     if (cmd === 'rspLoadBoard') {
//         ok = true;
//         //console.log(process.argv.length, process.argv);
//         //console.log(process.argv.length >= 5, process.argv[4] === 'N');
//         if (process.argv.length >= 5 && process.argv[4] === 'N') {
//             ok = false;
//         } 
//         console.log(ok ? 'Confirming board loaded...' : 'No board loaded, pause...');
//         client.cmdNqrLoadBoard({ok: ok}, function (err, response) {
//             if (response && response.errCode != 0) {
//                 console.log('Failed: ' + response.errMsg);
//             }
//         });
//         return;
//     }

//     if (cmd === 'rspRemoveBoard') {
//         console.log('Confirming board removed...');
//         client.cmdNqrRemoveBoard({}, function (err, response) {
//             if (response && response.errCode != 0) {
//                 console.log('Failed: ' + response.errMsg);
//             }
//         });
//         return;
//     }

//     if (cmd === 'rspUnloadAnyLoadedBoard') {
        
//         ok = true;
//         boardToUnloadExists = true;
        
//         if (process.argv.length >= 5) {
//             ok = (process.argv[4] != 'F');
//         }
//         if (process.argv.length >= 6) {
//             boardToUnloadExists = (process.argv[5] != 'F');
//         }
//         console.log('Confirming if ok to unload any loaded board ok: ' + ok + ' boardToUnloadExists: ' + boardToUnloadExists)
//         client.cmdNqrUnloadAnyLoadedBoard({
//             ok: ok,
//             boardToUnloadExists: boardToUnloadExists
//         }, function (err, response) {
//             if (response && response.errCode != 0) {
//                 console.log('Failed: ' + response.errMsg);
//             }
//         });
//         return;
//     }

//     if (cmd === "getMagState") {
//         client.getMagazineStatus({}, function (err, response) {
//             console.log('MagazineStatus:');
//             console.log(response);
//         });
//         return;
//     }

//     if (cmd === "getNotState") {
//         client.getNotificationStatus({}, function (err, response) {
//             console.log('NotificationStatus:');
//             console.log(response);
// //            console.log(response.notifications[1].runtimeData[1]);
//         });
//         return;
//     }

//     if (cmd === 'subsPe') {
//         console.log('Subscribing production engine');

//         channel = client.subscribeProdEngineStatus({});
//         channel.on("data", presentStatus);
//         return;
//     }

//     if (cmd === 'subsMag') {
//         console.log('Subscribing mags');

//         channel2 = client.subscribeMagazineStatus({});
//         channel2.on("data", presentStatus);
//         return;
//     }

//     if (cmd === 'subsNot') {
//         console.log('Subscribing nots');

//         channel3 = client.subscribeNotificationStatus({});
//         channel3.on("data", presentStatus);
//         return;
//     }

    console.log('Unknown cmd:', cmd);
    console.log('Test "node cli_client.js 0 help" to get list of commands');
}

main();
