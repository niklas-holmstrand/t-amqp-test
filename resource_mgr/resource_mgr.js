machineId = process.argv[2];
//
// AMQP stuff
//

amqp = require("amqplib/callback_api");

var amqpChannel;
const requestQueue = 'Machine'+ machineId;
var exchangeName = 'topic_ppMachines';
var subscriptionAmqpChannel;

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

    conn.createChannel(function(error1, channel) {
        if (error1) {
          throw error1;
        }
        subscriptionAmqpChannel = channel;
    
        channel.assertExchange(exchangeName, 'topic', {
          durable: false
        });
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
    var key = machineId + '.ResourceState';
    subscriptionAmqpChannel.publish(exchangeName, key, Buffer.from(JSON.stringify(myStatus)));
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
    console.log('Handle: ', msg);

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
                console.log("### response", response);

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

        case pb_schema.ResmgrMsgType.RESERVERESOURCETYPE:
            console.log('### 1 ');
            const cmdReserveResource = resmgrCmd.getCmdreserveresource();

            clientId  = cmdReserveResource.getClientid();
            console.log('got CmdReserveResource ', clientId);

            break;
    }
    console.log('### 2 ');
};


