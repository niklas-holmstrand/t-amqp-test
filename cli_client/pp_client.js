/*
 * test the tpsys_server 
 * 
 */
const tpcp_schema = require("../tpsys_sim/tpcp_pb");
const resMgr_schema = require("../resource_mgr/resource_mgr_pb");

myClientId = "TheTestClientPP"
myQueueName = "TheTestClientPP"; // + Math.floor(Math.random() * 1000)

//
// AMQP connection
//

amqp = require("amqplib/callback_api");
var amqpChannel;
var amqpConnection;
amqp.connect('amqp://localhost', (err,conn) => {
    amqpConnection = conn;
    conn.createChannel((err, ch) => {
	console.log('AMQP channel created');

        ch.assertQueue(myQueueName);
        amqpChannel = ch;

        // Setup consumer
        amqpChannel.consume(myQueueName, (message) => {
            // console.log('Got amqp pck');
            handleResponse(message.content);
        }, {noAck: true });

        main(); // Dont run main until connection is up

    });   
});

//
// MQTT stuff
//
const mqtt = require('mqtt')
var mqttClient = null;
const TCP_URL = 'mqtt://localhost:1883'
const TCP_TLS_URL = 'mqtts://localhost:8883'

const options = {
    connectTimeout: 4000,

    // Authentication
    clientId: 'TheTestClientPP',
    // username: 'emqx',
    // password: 'emqx',

    keepalive: 60,
    clean: true,
}

mqttClient = mqtt.connect(TCP_URL, options)
mqttClient.on('connect', () => {
    
    //console.log('MQTT connected')
    // tbd amqp seems slower to connect..run main from there    main(); // Dont run main until connection is up
})

mqttClient.on('message', (topic, message) => {
    // console.log('Received topic/message', topic, ':', message.toString())
    handleResponse(message);
})



handleResponse = function(packet) {
    //console.log('Handle packet: ', packet);

    //
    // Unpack resource_mgr envelop
    //
    const resmgrRsp = resMgr_schema.ResmgrRsp.deserializeBinary(packet);
    resmgrMsgType = resmgrRsp.getMsgtype();

    switch(resmgrMsgType) {
        case resMgr_schema.ResmgrMsgType.UPDATESTATUSTYPE:

            const rspUpdateStatus = resmgrRsp.getRspupdatestatus();

            errCode  = rspUpdateStatus.getErrcode();
            errMsg  = rspUpdateStatus.getErrmsg();

            if (errCode) {
                console.log("Resource mgr error: errcode/msg:", errCode, errMsg);
                return;
            }

            console.log("Resource mgr status update ok");
            break;

        case resMgr_schema.ResmgrMsgType.SENDREQUESTTYPE:

            const rspSendRequest = resmgrRsp.getRspsendrequest();

            errCode  = rspSendRequest.getErrcode();
            errMsg  = rspSendRequest.getErrmsg();
            //console.log("Got resp to SendRequest, errcode/msg:", errCode, errMsg);

            if (errCode) {
                console.log("Resource mgr error: errcode/msg:", errCode, errMsg);
                process.exit(0); // No TpCp response available
            }

            //
            // A TpCp response is available. Unpack envelope
            //
            r_byteStr = rspSendRequest.getResponse();
            r_bytes = new Uint8Array(r_byteStr.split(","));

            const tpcpRsp = tpcp_schema.TpcpRsp.deserializeBinary(r_bytes);
            tpcpRspType = tpcpRsp.getMsgtype();
            // console.log("Got tpcp message of type:", tpcpRspType);

            switch(tpcpRspType) {
                case tpcp_schema.TpcpMsgType.STARTBATCHTYPE:
                    const rspStartBatch = tpcpRsp.getRspstartbatch();

                    if(rspStartBatch.getErrcode()) {
                        console.log("StartBatch - error, errCode/errMsg:", rspStartBatch.getErrcode(), rspStartBatch.getErrmsg())
                        process.exit(0);
                    }
                    console.log("StartBatch ok")
                    break;

                case tpcp_schema.TpcpMsgType.GETPRODUCTIONENGINESTATUSTYPE:
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
                      
                    break;
    
                case tpcp_schema.TpcpMsgType.PAUSETYPE:
                    const rspPause = tpcpRsp.getRsppause();

                    if(rspPause.getErrcode()) {
                        console.log("Pause - error, errCode/errMsg:", rspPause.getErrcode(), rspPause.getErrmsg())
                        process.exit(0);
                    }
                    console.log("Pause ok")
                    break;
    
                case tpcp_schema.TpcpMsgType.PLAYTYPE:
                    const rspPlay = tpcpRsp.getRspplay();

                    if(rspPlay.getErrcode()) {
                        console.log("Play - error, errCode/errMsg:", rspPlay.getErrcode(), rspPlay.getErrmsg())
                        process.exit(0);
                    }
                    console.log("Play ok")
                    break;
        
                case tpcp_schema.TpcpMsgType.STOPTYPE:
                    const rspStop = tpcpRsp.getRspstop();

                    if(rspStop.getErrcode()) {
                        console.log("Stop - error, errCode/errMsg:", rspStop.getErrcode(), rspStop.getErrmsg())
                        process.exit(0);
                    }
                    console.log("Stop ok")
                    break;
    
                case tpcp_schema.TpcpMsgType.SUBSPETYPE:
                        const rspSubsPe = tpcpRsp.getRspsubspe();
    
                        if(rspSubsPe.getErrcode()) {
                            console.log("SubsPe - error, errCode/errMsg:", rspSubsPe.getErrcode(), rspSubsPe.getErrmsg())
                            process.exit(0);
                        }
                        console.log("SubsPe ok");
                        break;

                case tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE:
                    const rspSubsMagazineStatus = tpcpRsp.getRspsubsmagazinestatus();

                    if(rspSubsMagazineStatus.getErrcode()) {
                        console.log("SubsMagazineStatus - error, errCode/errMsg:", rspSubsMagazineStatus.getErrcode(), rspSubsMagazineStatus.getErrmsg())
                        process.exit(0);
                    }
                    console.log("SubsMagazineStatus ok");
                    break;

                case tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE:
                    const rspSubsNotificationStatus = tpcpRsp.getRspsubsnotificationstatus();

                    if(rspSubsNotificationStatus.getErrcode()) {
                        console.log("SubsNotificationStatus - error, errCode/errMsg:", rspSubsNotificationStatus.getErrcode(), rspSubsNotificationStatus.getErrmsg())
                        process.exit(0);
                    }
                    console.log("SubsNotificationStatus ok");
                    break;

                case tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE:
                    const rspNqrLoadBoard = tpcpRsp.getRspnqrloadboard();

                    if(rspNqrLoadBoard.getErrcode()) {
                        console.log("NqrLoadBoard - error, errCode/errMsg:", rspNqrLoadBoard.getErrcode(), rspNqrLoadBoard.getErrmsg())
                        process.exit(0);
                    }
                    console.log("rspNqrLoadBoard ok");
                    break;
    
    
        
                default:
                    console.log("Unknown tpcp message type received:", tpcpRspType);
    
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
    const tpcpCmd = new tpcp_schema.TpcpCmd();
    tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.NOTYPE); // Set to real cmd if valid cmd-arg is found

    machineId = process.argv[2]
    requestQueue = "Machine" + machineId;



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
//        console.log('resMgrUs - Update status from resource mgr (never seen by tpsys)');
        console.log('monitor - [topic] Monitor messages. Default from status all machines');
        console.log('getTopic [topic] Report any latest data from any topic');
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

        const cmdStartBatch = new tpcp_schema.CmdStartBatch();
        cmdStartBatch.setLayoutname(layoutName);
        cmdStartBatch.setBatchsize(batchSize);
        cmdStartBatch.setBatchid(batchId);

        tpcpCmd.setCmdstartbatch(cmdStartBatch);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.STARTBATCHTYPE);
    }

    if (!cmd || cmd === "getPeState") {
        const cmdGetProductionEngineStatus = new tpcp_schema.CmdGetProductionEngineStatus();
  
        tpcpCmd.setCmdgetproductionenginestatus(cmdGetProductionEngineStatus);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.GETPRODUCTIONENGINESTATUSTYPE);
    }

    if (cmd === 'pause') {
        console.log('Pausing...');

        const cmdPause = new tpcp_schema.CmdPause();
  
        tpcpCmd.setCmdpause(cmdPause);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.PAUSETYPE);
    }

    if (cmd === 'play') {
        console.log('Starting...');

        const cmdPlay = new tpcp_schema.CmdPause();
  
        tpcpCmd.setCmdplay(cmdPlay);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.PLAYTYPE);
    }

    if (cmd === 'stop') {
        console.log('Stopping..');

        const cmdStop = new tpcp_schema.CmdStop();
  
        tpcpCmd.setCmdstop(cmdStop);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.STOPTYPE);
    }


    if (cmd === 'subsPe') {
        // subscribe = true;
        
        // if (process.argv.length >= 5) {
        //     subscribe = process.argv[4]
        // }
        // if(subscribe) {
            console.log('Subscribing production engine');
        // } else {
        //     console.log('Unubscribing production engine');
        // }

        const cmdSubsPe = new tpcp_schema.CmdSubsPe();
  
        tpcpCmd.setCmdsubspe(cmdSubsPe);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.SUBSPETYPE);
    }

    if (cmd === 'subsMag') {
        // subscribe = true;
        
        // if (process.argv.length >= 5) {
        //     subscribe = process.argv[4]
        // }
        // if(subscribe) {
            console.log('Subscribing magazine status');
        // } else {
        //     console.log('Unubscribing production engine');
        // }

        const cmdSubsMagazineStatus = new tpcp_schema.CmdSubsMagazineStatus();
  
        tpcpCmd.setCmdsubsmagazinestatus(cmdSubsMagazineStatus);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.SUBSMAGAZINESTATUSTYPE);
    }

    if (cmd === 'subsNot') {
        // subscribe = true;
        
        // if (process.argv.length >= 5) {
        //     subscribe = process.argv[4]
        // }
        // if(subscribe) {
            console.log('Subscribing notification status');
        // } else {
        //     console.log('Unubscribing production engine');
        // }

        const cmdSubsNotificationStatus = new tpcp_schema.CmdSubsNotificationStatus();
  
        tpcpCmd.setCmdsubsnotificationstatus(cmdSubsNotificationStatus);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.SUBSNOTIFICATIONSTATUSTYPE);
    }



    if (cmd === 'rspLoadBoard') {
        ok = true;
        //console.log(process.argv.length, process.argv);
        //console.log(process.argv.length >= 5, process.argv[4] === 'N');
        if (process.argv.length >= 5 && process.argv[4] === 'N') {
            ok = false;
        } 
        console.log(ok ? 'Confirming board loaded...' : 'No board loaded, pause...');

        const cmdNqrLoadBoard = new tpcp_schema.CmdNqrLoadBoard();
        cmdNqrLoadBoard.setOk(ok);

        tpcpCmd.setCmdnqrloadboard(cmdNqrLoadBoard);
        tpcpCmd.setMsgtype(tpcp_schema.TpcpMsgType.NQRLOADBOARDTYPE);
    }

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

    if (cmd === 'resMgrUs') {
        console.log('Update resMgr status');

        const cmdUpdateStatus = new resMgr_schema.CmdUpdateStatus();

        const resmgrCmd = new resMgr_schema.ResmgrCmd();
        resmgrCmd.setMsgtype(resMgr_schema.ResmgrMsgType.UPDATESTATUSTYPE);
        resmgrCmd.setResponsequeue(myQueueName);
        resmgrCmd.setCmdupdatestatus(cmdUpdateStatus);

        const bytes = resmgrCmd.serializeBinary();
        packet = Buffer.from(bytes)
        amqpChannel.assertQueue(requestQueue);
        amqpChannel.sendToQueue(requestQueue, packet);

        return;
    }

    if (cmd === 'monitor') {

        topic = 'factory/PnP/Machines/+/State/+';

        if (process.argv.length >= 5) {
            topic = process.argv[4]
        }

        const TCP_URL = 'mqtt://localhost:1883'       
        const options = {
            connectTimeout: 4000,
            clientId: 'TheTestClientPPSubs',
            keepalive: 60,
            clean: true,
        }
        
        mqttSubsClient = mqtt.connect(TCP_URL, options)
        mqttSubsClient.on('connect', () => {
        

            mqttSubsClient.subscribe(topic, (err) => {
                if(err) { console.log('testclient_pp subs stat error:', err)}
            })

            mqttSubsClient.on('message', (topic, message) => {
                console.log('Got', topic, ':', message.toString())
            })
              
        });

        return;
    }


    if (cmd === 'getTopic') {

        topic = "factory/Config/Machines";

        if (process.argv.length >= 5) {
            topic = process.argv[4]
        }
 
        const TCP_URL = 'mqtt://localhost:1883'       
        const options = {
            connectTimeout: 4000,
            clientId: 'TheTestClientPPSubs',
            keepalive: 60,
            clean: true,
        }
        
        mqttSubsClient = mqtt.connect(TCP_URL, options)
        mqttSubsClient.on('connect', () => {
        

            mqttSubsClient.subscribe(topic, (err) => {
                if(err) { console.log('testclient_pp subs anytopic error:', err)}
            })

            mqttSubsClient.on('message', (topic, message) => {
                console.log(message.toString())
                mqttSubsClient.end();
                process.exit(0);
            })
              
        });
        
        return;
    }


    //
    // If a command have been set, send it.
    //
    if(tpcpCmd.getMsgtype()  != tpcp_schema.TpcpMsgType.NOTYPE ) {

        //
        // Create resource_mgr payload
        //
        const cmdSendRequest = new resMgr_schema.CmdSendRequest();
        cmdSendRequest.setClientid(myClientId);
        cmdSendRequest.setReserveresource(false);
        tpcpCmdByteStr = tpcpCmd.serializeBinary().toString()     // To string since protobuff seems to only support "string payload"
        cmdSendRequest.setRequest(tpcpCmdByteStr);

        //
        // Put in resource_mgr envelop
        //
        const resmgrCmd = new resMgr_schema.ResmgrCmd();
        resmgrCmd.setMsgtype(resMgr_schema.ResmgrMsgType.SENDREQUESTTYPE);
        resmgrCmd.setResponsequeue(myQueueName);
        resmgrCmd.setCmdsendrequest(cmdSendRequest);

        //
        // Put on message queue
        //
        const bytes = resmgrCmd.serializeBinary();
        packet = Buffer.from(bytes)
        amqpChannel.assertQueue(requestQueue);
        amqpChannel.sendToQueue(requestQueue, packet);
        //console.log('message sent to', requestQueue);
        
        return;
    }

    console.log('Unknown cmd:', cmd);
    console.log('Test "node cli_client.js 0 help" to get list of commands');
    process.exit(-1);
}

//main();
