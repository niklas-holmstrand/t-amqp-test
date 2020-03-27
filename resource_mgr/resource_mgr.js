machineId = process.argv[2];
//
// AMQP stuff
//

amqp = require("amqplib/callback_api");

var amqpChannel;
const requestQueue = 'Machine'+ machineId;
var exchangeName = 'topic_ppMachines';

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
// gRPC-tunnel stuff
//
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

portNo = 50000 + parseInt(machineId);
hostAndPort = 'localhost:' + portNo;
var tunnel = new tunnel_proto.TunnelService(hostAndPort,
                grpc.credentials.createInsecure());
console.log("tunnel started on:", hostAndPort);

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
    clientId: 'resmgr'+ machineId,
    // username: 'emqx',
    // password: 'emqx',

    keepalive: 60,
    clean: true,
}

mqttClient = mqtt.connect(TCP_URL, options)
mqttClient.on('connect', () => {

    mqttClient.subscribe('factory/PnP/Machines/' + machineId + '/Cmd',(err) => {
        console.log(err || 'MQTT Subscribe Success')
      })
    
    console.log('MQTT connected')
})

mqttClient.on('message', (topic, message) => {
    //console.log('Received topic/message', topic, ':', message.toString())
    handleMessage(message);
})
  
//
//
//
const pb_schema = require("../resource_mgr_pb");

var myStatus = {
    resMgrRunning: true,
    resourceConnected: false,
    resourceBusy: false,
    controlOwner: ''
};

//
// Emit status
//
emitStatus = function() {
    console.log('emit status:', machineId, myStatus);

    var topic = "factory/PnP/Machines/" + machineId + '/State/Availability';
    mqttClient.publish( topic, JSON.stringify(myStatus), 
        {retain: true}, (err) => {
        if (err) { console.log('resmgr: mqtt publish err:', err);} 
    })
}
setTimeout(emitStatus, 100); // send fresh status at start

//
// Handle heartbeat subscription
//
function handleHeartBeatSubscription() {
    setTimeout(handleHeartBeatSubscription, 300);
    if(myStatus.resourceConnected) {        // If already connected
        return;                             // skip trying subcribe
    }

    process.stdout.write(".");
    channel = tunnel.subscribeHeartBeats('putte');
    channel.on("data", function(heartBeat) {
        if(myStatus.resourceConnected == false) {
            myStatus.resourceConnected = true; 
            emitStatus();
        }
    });  
    channel.on("error", () => { if(myStatus.resourceConnected) {myStatus.resourceConnected = false; emitStatus();}});  
    channel.on("end", () => { if(myStatus.resourceConnected) {myStatus.resourceConnected = false; emitStatus();}});  
}
setTimeout(handleHeartBeatSubscription, 100);

//
// Handle incomming requests
//
handleMessage = function(msg) {
    //console.log('Handle: ', msg);

    const resmgrCmd = pb_schema.ResmgrCmd.deserializeBinary(msg);
    responseQueue = resmgrCmd.getResponsequeue();
    resmgrCmdType = resmgrCmd.getMsgtype();
    console.log('got ResmgrCmd: ', resmgrCmdType, responseQueue);

    amqpChannel.assertQueue(responseQueue);


    switch(resmgrCmdType) {
        case pb_schema.ResmgrMsgType.SENDREQUESTTYPE:
            const cmdSendRequest = resmgrCmd.getCmdsendrequest();

            clientId  = cmdSendRequest.getClientid();
            reserveResource  = cmdSendRequest.getReserveresource();
            payloadStr = cmdSendRequest.getRequest();
    
            console.log('got CmdSendRequest ', clientId, reserveResource, payloadStr);


            //
            // Check that resource is available
            //
            //TBD

            //
            // Send through tunnel
            //
            tunnel.message({
                requestMsg: payloadStr
            }, function (err, response) {
                //console.log("Got response to request", response);

                if(!response) {
                    console.log("Receied empty response! Ignoring");
                    return;
                }

                //
                // Repack response from server to client
                //
                const rspSendRequest = new pb_schema.RspSendRequest();
                rspSendRequest.setErrcode(0);
                rspSendRequest.setErrmsg("ok");
                rspSendRequest.setResponse(response.responseMsg);
 
                const resmgrRsp = new pb_schema.ResmgrRsp();
                resmgrRsp.setMsgtype(pb_schema.ResmgrMsgType.SENDREQUESTTYPE);
                resmgrRsp.setRspsendrequest(rspSendRequest);

                const bytes = resmgrRsp.serializeBinary();                
                packet = Buffer.from(bytes)
                amqpChannel.sendToQueue(responseQueue, packet);
                console.log('Sent rspSendRequest to ', responseQueue);
            });
            break;

        case pb_schema.ResmgrMsgType.UPDATESTATUSTYPE:
            const cmdUpdateStatus = resmgrCmd.getCmdupdatestatus();

            emitStatus();

            const rspUpdateStatus = new pb_schema.RspUpdateStatus();
            rspUpdateStatus.setErrcode(0);
            rspUpdateStatus.setErrmsg("ok");

            const resmgrRsp = new pb_schema.ResmgrRsp();
            resmgrRsp.setMsgtype(pb_schema.ResmgrMsgType.UPDATESTATUSTYPE);
            resmgrRsp.setRspupdatestatus(rspUpdateStatus);

            const bytes = resmgrRsp.serializeBinary();                
            packet = Buffer.from(bytes)
            amqpChannel.sendToQueue(responseQueue, packet);
        break;
    }
};


