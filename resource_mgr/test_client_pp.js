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


handleResponse = function(msg) {
    console.log('Handle: ', msg);
        //
        // Unpack resource_mgr envelop
        //
        const repMsg = new resMgr_schema.RspMsg();
        console.log('got RspMsg: ', cmdMsg.getCmdtype());
    
//switch            
        //
        // Unpack resource_mgr payload and check for errors already here
        //
        
        //
        // Unpack tpcp envelop
        //
//switch            
        
        //
        // Unpack tpcp payload and report result
        //

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


        //
        // Put payload in TpCp envelop
        //
        const cmdMsg = new tpcp_schema.CmdMsg();
        cmdMsg.setCmdstartbatch(cmdStartBatch);
        cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE);
  //      const bytes = cmdMsg.serializeBinary();
  //      console.log("### cmdMsg binary " + bytes)

        //
        // Create resource_mgr payload
        //
        const cmdSendRequest = new resMgr_schema.CmdSendRequest();
        cmdSendRequest.setClientid(myClientId);
        cmdSendRequest.setReserveresource(false);
        const cmdMsgBytes = cmdMsg.serializeBinary();
        byteStr = cmdMsgBytes.toString()
        cmdSendRequest.setRequest(byteStr);

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
        

        //
        // tmp try recreate
        //
        const r_cmdMsg = resMgr_schema.CmdMsg.deserializeBinary(packet);
        r_responseQueue = r_cmdMsg.getResponsequeue();
        r_cmdMsgType = r_cmdMsg.getCmdtype();
        console.log('recreate rmgr-CmdMsg: ', r_cmdMsgType, r_responseQueue);
    
        const r_cmdSendRequest = r_cmdMsg.getCmdsendrequest();

        r_clientId  = r_cmdSendRequest.getClientid();
        r_reserveResource  = r_cmdSendRequest.getReserveresource();
        r_byteStr = r_cmdSendRequest.getRequest();

        r_bytes = new Uint8Array(r_byteStr.split(","));
        console.log("### r_bytes:", r_bytes);
    
        const rt_cmdMsg = tpcp_schema.CmdMsg.deserializeBinary(r_bytes);
        const rt_cmdStartBatch = rt_cmdMsg.getCmdstartbatch();

        console.log("rt_", rt_cmdStartBatch.toString())
        console.log("rt_", rt_cmdStartBatch.getLayoutname())
        console.log("rt_", rt_cmdStartBatch.getBatchsize())

        ///////////////////////////////////////////////////////////////////////////////////////



        // const msg = new tpcp_schema.CmdStartBatch();
        // console.log('#####', msg);
        // msg.setLayoutname(layoutName);
        // msg.setBatchsize(batchSize);
        // msg.setBatchid(batchId);
        // const tbytes = msg.serializeBinary();
        // console.log("binary " + tbytes)

        // const recMsg = tpcp_schema.CmdStartBatch.deserializeBinary(tbytes);

        // console.log(recMsg);
        // console.log(recMsg.name)
        // console.log(recMsg.toString())
        // console.log(recMsg.getLayoutname())
        // console.log(recMsg.getBatchsize())

        console.log('#####2');

        // //###################################################################################
        // // pattern below
        // //###################################################################################
        // const cmdMsg = new tpcp_schema.CmdMsg();

        // // const cmdStartBatch = new tpcp_schema.CmdStartBatch();
        // // cmdStartBatch.setLayoutname(layoutName);
        // // cmdStartBatch.setBatchsize(batchSize);
        // // cmdStartBatch.setBatchid(batchId);
        // // cmdMsg.setCmdstartbatch(cmdStartBatch);
        // // cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE);

        // const cmdPause = new tpcp_schema.CmdPause();
        // cmdMsg.setCmdpause(cmdPause);
        // cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDPAUSETYPE);




        // const tbytes = cmdMsg.serializeBinary();
        // console.log("binary " + tbytes)
        // const recCmdMsg = tpcp_schema.CmdMsg.deserializeBinary(tbytes);



        // console.log("## recCmdMsg", recCmdMsg);
        // console.log("##2 recCmdMsg", recCmdMsg.getCmdtype());

        // switch(recCmdMsg.getCmdtype()) {
        //     case tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE:
        //         const reccmdStartBatch = recCmdMsg.getCmdstartbatch();
    
        //         console.log(reccmdStartBatch.toString())
        //         console.log(reccmdStartBatch.getLayoutname())
        //         console.log(reccmdStartBatch.getBatchsize())
        //         break;
        //     case tpcp_schema.cmdMsgType.CMDPAUSETYPE:
        //         const reccmdPause = recCmdMsg.getCmdpause();

        //         console.log("Pausing")
        //         break;
                    
        // }
        // //###################################################################################
        // // pattern end
        // //###################################################################################
        // console.log('#####3');


        // const cmdMsg = new tpcp_schema.CmdMsg();

        // const cmdStartBatch = new tpcp_schema.CmdStartBatch();
        // cmdStartBatch.setLayoutname(layoutName);
        // cmdStartBatch.setBatchsize(batchSize);
        // cmdStartBatch.setBatchid(batchId);
        // cmdMsg.setCmdstartbatch(cmdStartBatch);
        // cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDSTARTBATCHTYPE);
        // const bytes = cmdMsg.serializeBinary();
        // console.log("binary " + bytes)

    


        // client.message({
        //     requestMsg: bytes
        // }, function (err, response) {
        //     console.log("### response", response);

        //     // temp dirty, received as string, convert back to bytes....TBD
        //     const rbytes = str2buf(response.responseMsg);
        //     const rspMsg = tpcp_schema.RspMsg.deserializeBinary(rbytes);
        //     console.log("rspMsg ", rspMsg)
        
        
        //     console.log("##2 rspMsg", rspMsg.getCmdtype());
        
        //     // Assume response is correct type
        //     const rspStartBatch = rspMsg.getRspstartbatch();
        //     console.log("rspStartBatch", rspStartBatch);
        //     const errCode = rspStartBatch.getErrcode();
        //     const errMsg = rspStartBatch.getErrmsg();
        //     console.log("-- rec --", errCode, errMsg);

        //     if (errCode != 0) {
        //         console.log('Failed: ' + errMsg);
        //     }
        // });
        return;
    }

    if (cmd === 'pause') {

        console.log('Pausing');

        const cmdMsg = new tpcp_schema.CmdMsg();
        const cmdPause = new tpcp_schema.CmdPause();
        cmdMsg.setCmdpause(cmdPause);
        cmdMsg.setCmdtype(tpcp_schema.cmdMsgType.CMDPAUSETYPE);
        const bytes = cmdMsg.serializeBinary();



        client.message({
            requestMsg: bytes
        }, function (err, response) {

            console.log("### response", response);

            // temp dirty, received as string, convert back to bytes....TBD
            const rbytes = str2buf(response.responseMsg);
            const rspMsg = tpcp_schema.RspMsg.deserializeBinary(rbytes);
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

//main();
