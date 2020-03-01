// var express = require("express");
// var app = express();
amqp = require("amqplib/callback_api");

//const port = 3001;
var amqpChannel;
const queue = 'FirstQueue';


amqp.connect('amqp://localhost', (err,conn) => {
    conn.createChannel((err, ch) => {

        ch.assertQueue(queue, {durable: false});
        amqpChannel = ch;


//        while(true) {
            console.log('waiting for queue', queue);
            amqpChannel.consume(queue, (message) => {
                console.log('Got: ', message.content.toString());
                handleMessage(message.content.toString());
            }, {noAck: true });
//        }
    });   
});

handleMessage = function(msg) {
    console.log('Handle: ', msg);
};

