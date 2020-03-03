machineId = process.argv[2];
//
// AMQP stuff
//

amqp = require("amqplib/callback_api");

var amqpChannel;
const requestQueue = 'Machine'+ machineId;


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
//
//
const pb_schema = require("../resource_mgr_pb");


//
// Handle incomming requests
//
handleMessage = function(msg) {
    console.log('Handle: ', msg);

    const cmdMsg = pb_schema.CmdMsg.deserializeBinary(msg);
    responseQueue = cmdMsg.getResponsequeue();
    cmdMsgType = cmdMsg.getCmdtype();
    console.log('got CmdMsg: ', cmdMsgType, responseQueue);

    amqpChannel.assertQueue(responseQueue);


    switch(cmdMsgType) {
        case pb_schema.cmdMsgType.CMDSENDREQUESTTYPE:
            const cmdSendRequest = cmdMsg.getCmdsendrequest();

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

                //
                // Repack response from server to client
                //
                const rspSendRequest = new pb_schema.RspSendRequest();
                rspSendRequest.setErrcode(0);
                rspSendRequest.setErrmsg("ok");
                rspSendRequest.setResponse(response.responseMsg);
 
                const rspMsg = new pb_schema.RspMsg();
                rspMsg.setCmdtype(pb_schema.cmdMsgType.CMDSENDREQUESTTYPE);
                rspMsg.setRspsendrequest(rspSendRequest);

                const rbytes = rspMsg.serializeBinary();                
                packet = Buffer.from(rbytes)
                amqpChannel.sendToQueue(responseQueue, packet);
                console.log('Sent rspSendRequest to ', responseQueue);
            });
            break;

        case pb_schema.cmdMsgType.CMDRESERVERESOURCETYPE:
            console.log('### 1 ');
            const cmdReserveResource = cmdMsg.getCmdreserveresource();

            clientId  = cmdReserveResource.getClientid();
            console.log('got CmdReserveResource ', clientId);

            break;
    }
    console.log('### 2 ');
};


