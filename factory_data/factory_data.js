//
// Select between hardcoded default facotory and reading data from smtdb by uncommenting one of below lines
//
const {getFactoryData} = require('./myFactory')
//const {getFactoryData} = require('./smtDbFactory')

// Cached data. For now only read once
var myLayouts;
var myMachines;
var myProductionLines;

//
// mqtt for subscriptions
//
const mqtt = require('mqtt')

const TCP_URL = 'mqtt://localhost:1883'
const TCP_TLS_URL = 'mqtts://localhost:8883'

const options = {
    connectTimeout: 4000,

    // Authentication
    clientId: 'FactoryDataProvider',
    // username: 'emqx',
    // password: 'emqx',

    keepalive: 60,
    clean: true,
}

mqttClient = mqtt.connect(TCP_URL, options)
mqttClient.on('connect', () => {
    console.log('MQTT connected')

    main()  // Wait for connectiion before running main
})

//
// AMQP stuff
//
amqp = require("amqplib/callback_api");
var amqpChannel;
const requestQueue = 'FactoryDataCmd';
//var exchangeName = 'topic_ppMachines';
//var subscriptionAmqpChannel;

amqp.connect('amqp://localhost', (err,conn) => {
    conn.createChannel((err, ch) => {

        ch.assertQueue(requestQueue);
        amqpChannel = ch;

        // Setup consumer
        amqpChannel.consume(requestQueue, (message) => {
            console.log('Got: message');
            handleMessage(message.content);
        }, {noAck: true });
    });   
});




//
// Handle incomming requests
//
const factory_data_schema = require("./factory_data_pb");
handleMessage = function(msg) {
    console.log('Handle: ', msg);

    const facdataCmd = factory_data_schema.FacdataCmd.deserializeBinary(msg);
    responseQueue = facdataCmd.getResponsequeue();
    cmdType = facdataCmd.getMsgtype();
    console.log('got facdataCmd: ', cmdType, responseQueue);

    amqpChannel.assertQueue(responseQueue);
    facdataRsp = new factory_data_schema.FacdataRsp();

    switch(cmdType) {
        case factory_data_schema.FacdataMsgType.GETLINESTYPE:
            const rspGetLines = new factory_data_schema.RspGetLines();

            // For now, just asume data is never changed, use own cache
            rspGetLines.setLines(JSON.stringify(myProductionLines));

            facdataRsp.setMsgtype(factory_data_schema.FacdataMsgType.GETLINESTYPE);
            facdataRsp.setRspgetlines(rspGetLines);
            facdataRsp.setErrcode(0);
            facdataRsp.setErrmsg("ok");
            break;

        case factory_data_schema.FacdataMsgType.GETMACHINESTYPE:
            const rspGetMachines = new factory_data_schema.RspGetMachines();

            // For now, just asume data is never changed, use own cache
            rspGetMachines.setMachines(JSON.stringify(myMachines));

            facdataRsp.setMsgtype(factory_data_schema.FacdataMsgType.GETMACHINESTYPE);
            facdataRsp.setRspgetmachines(rspGetMachines);
            facdataRsp.setErrcode(0);
            facdataRsp.setErrmsg("ok");
        break;
        
        case factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE:
            const rspGetLayouts = new factory_data_schema.RspGetLayouts();

            // For now, just asume data is never changed, use own cache
            rspGetLayouts.setLayouts(JSON.stringify(myLayouts));

            facdataRsp.setMsgtype(factory_data_schema.FacdataMsgType.GETLAYOUTSTYPE);
            facdataRsp.setRspgetlayouts(rspGetLayouts);
            facdataRsp.setErrcode(0);
            facdataRsp.setErrmsg("ok");
        break;
        
        default: 
            console.log("factory_data: ignoring unexpected cmd type!", cmdType)
    }

    //
    // Post response
    // 
    const bytes = facdataRsp.serializeBinary();                
    packet = Buffer.from(bytes)
    amqpChannel.sendToQueue(responseQueue, packet);
    console.log('Rsp sent to ', responseQueue);
};


//////////////////////////////////////
//
// Main...
//
//////////////////////////////////////

async function initialize() {
    return await getFactoryData();
}

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
  
async function main() {
    //
    // Wait for data connection is ready, then init my factory data
    //
    factory = await initialize();
    myLayouts = factory.myLayouts;
    myMachines = factory.myMachines;
    myProductionLines = factory.myProductionLines;
    console.log('factory_data starting', myProductionLines);


    mqttClient.publish( 'factory/Config/Lines', JSON.stringify(myProductionLines), 
        {retain: true}, (err) => {
        if (err) { console.log('factory_data: mqtt publish lines err:', err);} 
    })
    mqttClient.publish( 'factory/Config/Machines', JSON.stringify(myMachines), 
        {retain: true}, (err) => {
        if (err) { console.log('factory_data: mqtt publish lines err:', err);} 
    })
    mqttClient.publish( 'factory/ProductData/Layouts', JSON.stringify(myLayouts), 
        {retain: true}, (err) => {
        if (err) { console.log('factory_data: mqtt publish lines err:', err);} 
    })

    // Give node some time to connect amqp
    await sleep(200);
}

