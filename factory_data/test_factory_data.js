
myQueueName = "Test_factoryData";

amqp = require("amqplib/callback_api");
var amqpChannel;
const requestQueue = 'FactoryDataCmd';

var amqpConnection;
amqp.connect('amqp://localhost', (err,conn) => {
    amqpConnection = conn;
    conn.createChannel((err, ch) => {

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


const factory_data_schema = require("./factory_data_pb");
handleResponse = function(packet) {
    console.log('Handle packet: ', packet);

    //
    // Unpack envelop
    //
    const facdataRsp = factory_data_schema.FacdataRsp.deserializeBinary(packet);
    msgType = facdataRsp.getMsgtype();
    errCode  = facdataRsp.getErrcode();
    errMsg  = facdataRsp.getErrmsg();

    if (errCode) {
        console.log("Facdata error: errcode/msg:", errCode, errMsg);
        process.exit(errCode);
    }

    switch(msgType) {
        case factory_data_schema.FacdataMsgType.GETLINESTYPE:

            const rspGetLines = facdataRsp.getRspgetlines();
            lines = rspGetLines.getLines();

            linesData = JSON.parse(lines);
            console.log("Production lines:", linesData);
            break;

        case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:

            const rspGetMachines = facdataRsp.getRspgetmachines();
            machinesStr = rspGetMachines.getMachines();

            machinesData = JSON.parse(machinesStr);
            console.log("Production machines:", machinesData);
            break;

        case factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE:

            const rspGetLayouts = facdataRsp.getRspgetlayouts();
            layoutsStr = rspGetLayouts.getLayouts();

            layoutsData = JSON.parse(layoutsStr);
            console.log("Layouts:", layoutsData);
            break;

        default:
            console.log("Unknown tpcp message type received:", msgType);
        break;

    }

    // Command is sent and reponse handled - Done
    process.exit(0);
};

//
//
//

function main() {
    facdataCmd = new factory_data_schema.FacdataCmd();
    facdataCmd.setMsgtype(factory_data_schema.FacdataMsgType.NOTYPE);
    facdataCmd.setResponsequeue(myQueueName);


    var cmd = null;
    if (process.argv.length >= 3) {
        cmd = process.argv[2];
    } else {
        console.log('Syntax:');
        console.log('node test_factory_data <cmd>');
        console.log('cmd =  "?" for help');
        process.exit(-1);
    }

    if (cmd === '?' || cmd === 'h' || cmd === 'help' || cmd === '-h') {
        console.log('=====================');
        console.log('Syntax: node test_factory_data <cmd>');
        console.log('where');
        console.log('');
        console.log('<cmd> = One of:');
        console.log('getLines - Get production lines');
        console.log('getMachines - Get machines');
        console.log('getLayouts - Get layouts');
        console.log('=====================');
        process.exit(0);
    }

    if (cmd === 'getLines') {
        console.log('Get production lines...');

        const cmdGetLines = new factory_data_schema.CmdGetLines();

        facdataCmd.setCmdgetlines(cmdGetLines);
        facdataCmd.setMsgtype(factory_data_schema.FacdataMsgType.GETLINESTYPE);
    }

    if (cmd === 'getMachines') {
        console.log('Get production machines...');

        const cmdGetMachines = new factory_data_schema.CmdGetMachines();

        facdataCmd.setCmdgetmachines(cmdGetMachines);
        facdataCmd.setMsgtype(factory_data_schema.FacdataMsgType.GETMACHINESTYPE);
    }

    if (cmd === 'getLayouts') {
        console.log('Get production layouts...');

        const cmdGetLayouts = new factory_data_schema.CmdGetLayouts();

        facdataCmd.setCmdgetlayouts(cmdGetLayouts);
        facdataCmd.setMsgtype(factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE);
    }


    //
    // If a command have been set, send it.
    //
    if(facdataCmd.getMsgtype() != factory_data_schema.FacdataMsgType.NOTYPE ) {

        //
        // Put on message queue
        //
        const bytes = facdataCmd.serializeBinary();
        packet = Buffer.from(bytes)
        amqpChannel.assertQueue(requestQueue);
        amqpChannel.sendToQueue(requestQueue, packet);
        //console.log('message sent to', requestQueue);
        
        return;
    }

    console.log('Unknown cmd:', cmd);
    console.log('Test "node test_factory_data help" to get list of commands');
    process.exit(-1);
}

