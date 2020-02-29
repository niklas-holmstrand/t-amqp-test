/*
 * test the tpsys_server
 * 
 */
const pb_schema = require("../tpcp0_pb");


//var PROTO_PATH = __dirname + '../tpcp0.proto';
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

        console.log('PB-Start batch...');

        // const msg = new pb_schema.CmdStartBatch();
        // console.log('#####', msg);
        // msg.setLayoutname(layoutName);
        // msg.setBatchsize(batchSize);
        // msg.setBatchid(batchId);
        // const tbytes = msg.serializeBinary();
        // console.log("binary " + tbytes)

        // const recMsg = pb_schema.CmdStartBatch.deserializeBinary(tbytes);

        // console.log(recMsg);
        // console.log(recMsg.name)
        // console.log(recMsg.toString())
        // console.log(recMsg.getLayoutname())
        // console.log(recMsg.getBatchsize())

        console.log('#####2');

        // //###################################################################################
        // // pattern below
        // //###################################################################################
        // const cmdMsg = new pb_schema.CmdMsg();

        // // const cmdStartBatch = new pb_schema.CmdStartBatch();
        // // cmdStartBatch.setLayoutname(layoutName);
        // // cmdStartBatch.setBatchsize(batchSize);
        // // cmdStartBatch.setBatchid(batchId);
        // // cmdMsg.setCmdstartbatch(cmdStartBatch);
        // // cmdMsg.setCmdtype(pb_schema.cmdMsgType.CMDSTARTBATCHTYPE);

        // const cmdPause = new pb_schema.CmdPause();
        // cmdMsg.setCmdpause(cmdPause);
        // cmdMsg.setCmdtype(pb_schema.cmdMsgType.CMDPAUSETYPE);




        // const tbytes = cmdMsg.serializeBinary();
        // console.log("binary " + tbytes)
        // const recCmdMsg = pb_schema.CmdMsg.deserializeBinary(tbytes);



        // console.log("## recCmdMsg", recCmdMsg);
        // console.log("##2 recCmdMsg", recCmdMsg.getCmdtype());

        // switch(recCmdMsg.getCmdtype()) {
        //     case pb_schema.cmdMsgType.CMDSTARTBATCHTYPE:
        //         const reccmdStartBatch = recCmdMsg.getCmdstartbatch();
    
        //         console.log(reccmdStartBatch.toString())
        //         console.log(reccmdStartBatch.getLayoutname())
        //         console.log(reccmdStartBatch.getBatchsize())
        //         break;
        //     case pb_schema.cmdMsgType.CMDPAUSETYPE:
        //         const reccmdPause = recCmdMsg.getCmdpause();

        //         console.log("Pausing")
        //         break;
                    
        // }
        // //###################################################################################
        // // pattern end
        // //###################################################################################
        console.log('#####3');


        const cmdMsg = new pb_schema.CmdMsg();

        const cmdStartBatch = new pb_schema.CmdStartBatch();
        cmdStartBatch.setLayoutname(layoutName);
        cmdStartBatch.setBatchsize(batchSize);
        cmdStartBatch.setBatchid(batchId);
        cmdMsg.setCmdstartbatch(cmdStartBatch);
        cmdMsg.setCmdtype(pb_schema.cmdMsgType.CMDSTARTBATCHTYPE);
        const bytes = cmdMsg.serializeBinary();
        console.log("binary " + bytes)

    


        client.message({
            requestMsg: bytes
        }, function (err, response) {
            console.log("### response", response);

            // temp dirty, received as string, convert back to bytes....TBD
            const rbytes = str2buf(response.responseMsg);
            const rspMsg = pb_schema.RspMsg.deserializeBinary(rbytes);
            console.log("rspMsg ", rspMsg)
        
        
            console.log("##2 rspMsg", rspMsg.getCmdtype());
        
            // Assume response is correct type
            const rspStartBatch = rspMsg.getRspstartbatch();
            console.log("rspStartBatch", rspStartBatch);
            const errCode = rspStartBatch.getErrcode();
            const errMsg = rspStartBatch.getErrmsg();
            console.log("-- rec --", errCode, errMsg);

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
            }
        });
        return;
    }

    if (cmd === 'pause') {

        console.log('Pausing');

        const cmdMsg = new pb_schema.CmdMsg();
        const cmdPause = new pb_schema.CmdPause();
        cmdMsg.setCmdpause(cmdPause);
        cmdMsg.setCmdtype(pb_schema.cmdMsgType.CMDPAUSETYPE);
        const bytes = cmdMsg.serializeBinary();



        client.message({
            requestMsg: bytes
        }, function (err, response) {

            console.log("### response", response);

            // temp dirty, received as string, convert back to bytes....TBD
            const rbytes = str2buf(response.responseMsg);
            const rspMsg = pb_schema.RspMsg.deserializeBinary(rbytes);
            console.log("rspMsg ", rspMsg)
        
        
            console.log("##2 rspMsg", rspMsg.getCmdtype());
        
            // Assume response is correct type
            const rspPause = rspMsg.getRsppause();
            console.log("rspPause", rspPause);
            const errCode = rspPause.getErrcode();
            const errMsg = rspPause.getErrmsg();
            console.log("-- rec --", errCode, errMsg);

            if (errCode != 0) {
                console.log('Failed: ' + errMsg);
            }
        });
        return;
    }

//     if (cmd === 'play') {
//         console.log('Starting...');
//         client.cmdPlay({}, function (err, response) {
//             if (response && response.errCode != 0) {
//                 console.log('Failed: ' + response.errMsg);
//             }
//         });
//         return;
//     }

//     if (cmd === 'stop') {
//         console.log('Stopping...');
//         client.cmdStop({}, function (err, response) {
//             if (response && response.errCode != 0) {
//                 console.log('Failed: ' + response.errMsg);
//             }
//         });
//         return;
//     }

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

//     if (!cmd || cmd === "getPeState") {
//         client.getProdEngineStatus({}, function (err, response) {
//             console.log('ProductionEngineStatus:');
//             console.log('State:', response);
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
