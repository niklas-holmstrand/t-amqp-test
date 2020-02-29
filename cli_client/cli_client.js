/*
 * test the tpsys_server
 * 
 */

//var PROTO_PATH = __dirname + '../tpcp0.proto';
var PROTO_PATH = '../tpcp0.proto';

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

function presentStatus(pEstate) {
    console.log(pEstate);
}

function main() {
    portNo = '50000';
    if (process.argv.length >= 3) {
        portNo = '5000' + process.argv[2];
    }


    var client = new tpcp_proto.TPSysService('localhost:' + portNo,
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

    if (cmd === 'goTUI') {
        console.log('Giving back control to TUI');
        client.cmdSwitchToTUI({}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

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

        client.cmdStartBatch({
            layoutName: layoutName,
            batchSize: batchSize,
            batchId: batchId
        }, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'pause') {
        console.log('Pausing');
        client.cmdPause({}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'play') {
        console.log('Starting...');
        client.cmdPlay({}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'stop') {
        console.log('Stopping...');
        client.cmdStop({}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'rspLoadBoard') {
        ok = true;
        //console.log(process.argv.length, process.argv);
        //console.log(process.argv.length >= 5, process.argv[4] === 'N');
        if (process.argv.length >= 5 && process.argv[4] === 'N') {
            ok = false;
        } 
        console.log(ok ? 'Confirming board loaded...' : 'No board loaded, pause...');
        client.cmdNqrLoadBoard({ok: ok}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'rspRemoveBoard') {
        console.log('Confirming board removed...');
        client.cmdNqrRemoveBoard({}, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === 'rspUnloadAnyLoadedBoard') {
        
        ok = true;
        boardToUnloadExists = true;
        
        if (process.argv.length >= 5) {
            ok = (process.argv[4] != 'F');
        }
        if (process.argv.length >= 6) {
            boardToUnloadExists = (process.argv[5] != 'F');
        }
        console.log('Confirming if ok to unload any loaded board ok: ' + ok + ' boardToUnloadExists: ' + boardToUnloadExists)
        client.cmdNqrUnloadAnyLoadedBoard({
            ok: ok,
            boardToUnloadExists: boardToUnloadExists
        }, function (err, response) {
            if (response && response.errCode != 0) {
                console.log('Failed: ' + response.errMsg);
            }
        });
        return;
    }

    if (cmd === "getMagState") {
        client.getMagazineStatus({}, function (err, response) {
            console.log('MagazineStatus:');
            console.log(response);
        });
        return;
    }

    if (cmd === "getNotState") {
        client.getNotificationStatus({}, function (err, response) {
            console.log('NotificationStatus:');
            console.log(response);
//            console.log(response.notifications[1].runtimeData[1]);
        });
        return;
    }

    if (!cmd || cmd === "getPeState") {
        client.getProdEngineStatus({}, function (err, response) {
            console.log('ProductionEngineStatus:');
            console.log('State:', response);
        });
        return;
    }

    if (cmd === 'subsPe') {
        console.log('Subscribing production engine');

        channel = client.subscribeProdEngineStatus({});
        channel.on("data", presentStatus);
        return;
    }

    if (cmd === 'subsMag') {
        console.log('Subscribing mags');

        channel2 = client.subscribeMagazineStatus({});
        channel2.on("data", presentStatus);
        return;
    }

    if (cmd === 'subsNot') {
        console.log('Subscribing nots');

        channel3 = client.subscribeNotificationStatus({});
        channel3.on("data", presentStatus);
        return;
    }

    console.log('Unknown cmd:', cmd);
    console.log('Test "node cli_client.js 0 help" to get list of commands');
}

main();
