/*
 * test the tpsys_server 
 * 
 */
const tpcp_schema = require("../tpcp0_pb");
const resMgr_schema = require("../resource_mgr_pb");

myClientId = "TheTestClientPP"
myQueueName = "TheTestClientPP"

amqp = require("amqplib/callback_api");
var amqpChannel;
amqp.connect('amqp://localhost', (err,conn) => {
    conn.createChannel((err, ch) => {

        ch.assertQueue(myQueueName);
        amqpChannel = ch;

        // Setup consumer
        amqpChannel.consume(myQueueName, (message) => {
            console.log('Got amqp pck');
            handleResponse(message.content);
        }, {noAck: true });

        main(); // Dont run main until connection is up

    });   
});


handleResponse = function(packet) {
    console.log('Handle packet: ', packet);
    //
    // Unpack resource_mgr envelop
    //
    const r_rspMsg = resMgr_schema.RspMsg.deserializeBinary(packet);
    r_rspMsgType = r_rspMsg.getCmdtype();

    switch(r_rspMsgType) {
        case resMgr_schema.cmdMsgType.CMDSENDREQUESTTYPE:

            const r_rspSendRequest = r_rspMsg.getRspsendrequest();

            r_errCode  = r_rspSendRequest.getErrcode();
            r_errMsg  = r_rspSendRequest.getErrmsg();
            console.log("Got resp to SendRequest, errcode/msg:", r_errCode, r_errMsg);

            if (r_errCode) {
                console.log("Resource mgr error: errcode/msg:", r_errCode, r_errMsg);
                process.exit(0); // No TpCp response available
            }

            //
            // A TpCp response is available. Unpack envelope
            //
            r_byteStr = r_rspSendRequest.getResponse();
            r_bytes = new Uint8Array(r_byteStr.split(","));

            const rspMsg = tpcp_schema.RspMsg.deserializeBinary(r_bytes);
            rspMsgType = rspMsg.getCmdtype();
            console.log("Got tpcp message of type:", rspMsgType);

            switch(rspMsgType) {
                case tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE:
                    const rspStartBatch = rspMsg.getRspstartbatch();

                    if(rspStartBatch.getErrcode()) {
                        console.log("StartBatch - error, errCode/errMsg:", rspStartBatch.getErrcode(), rspStartBatch.getErrmsg())
                        process.exit(0);
                    }
                    console.log("StartBatch ok")
                    break;

                case tpcp_schema.cmdMsgType.CMDPAUSETYPE:
                        const rspPause = rspMsg.getRsppause();
    
                        if(rspPause.getErrcode()) {
                            console.log("Pause - error, errCode/errMsg:", rspStartBatch.getErrcode(), rspStartBatch.getErrmsg())
                            process.exit(0);
                        }
                        console.log("Pause ok")
                    break;
    
                default:
                    console.log("Unknown tpcp message type received:", rspMsgType);

            }
        break;
    }

    // Command is sent and reponse handled - Done
    process.exit(0);
};


///////////////////////////////////////////////////////////////






function presentStatus(pEstate) {
    console.log(pEstate);
}

function str2buf(str) {
    var arr = str.split(","), view = new Uint8Array(arr);
    return view.buffer
}

function main() {
    const cmdMsg = new tpcp_schema.CmdMsg();
    cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDNOTYPE); // Set to real cmd if valid cmd-arg is found

    requestQueue = "Machine" + process.argv[2];



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

        ///////////////////////////////////////////////////////////////////////////////////////
        //
        // Create TpCp payload
        //
        const cmdStartBatch = new tpcp_schema.CmdStartBatch();
        cmdStartBatch.setLayoutname(layoutName);
        cmdStartBatch.setBatchsize(batchSize);
        cmdStartBatch.setBatchid(batchId);

        // Put payload in TpCp envelop
        cmdMsg.setCmdstartbatch(cmdStartBatch);
        cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE);

    }

    if (cmd === 'pause') {

        console.log('Pausing');

        const cmdPause = new tpcp_schema.CmdPause();
  
        // Put payload in TpCp envelop
        cmdMsg.setCmdpause(cmdPause);
        cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDPAUSETYPE);
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

    //
    // If a command have been set, send it.
    //
    if(cmdMsg.getCmdtype()  != tpcp_schema.cmdMsgType.CMDNOTYPE ) {

        //
        // Create resource_mgr payload
        //
        const cmdSendRequest = new resMgr_schema.CmdSendRequest();
        cmdSendRequest.setClientid(myClientId);
        cmdSendRequest.setReserveresource(false);
        cmdMsgByteStr = cmdMsg.serializeBinary().toString()     // To string since protobuff seems to only support "string payload"
        cmdSendRequest.setRequest(cmdMsgByteStr);

        //
        // Put in resource_mgr envelop
        //
        const cmdMsg_rm = new resMgr_schema.CmdMsg();
        cmdMsg_rm.setCmdtype(resMgr_schema.cmdMsgType.CMDSENDREQUEST);
        cmdMsg_rm.setResponsequeue(myQueueName);
        cmdMsg_rm.setCmdsendrequest(cmdSendRequest);
        const bytes_rm = cmdMsg_rm.serializeBinary();

        //
        // Put on queue
        //
        packet = Buffer.from(bytes_rm)
        amqpChannel.assertQueue(requestQueue);
        amqpChannel.sendToQueue(requestQueue, packet);
        console.log('message sent to', requestQueue);
        
        return;
    }

    console.log('Unknown cmd:', cmd);
    console.log('Test "node cli_client.js 0 help" to get list of commands');
    process.exit(-1);
}

//main();
