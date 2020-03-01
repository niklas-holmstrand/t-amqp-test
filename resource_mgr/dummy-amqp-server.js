// var express = require("express");
// var app = express();
amqp = require("amqplib/callback_api");

//const port = 3001;

amqp.connect('amqp://localhost', (err,conn) => {
    conn.createChannel((err, ch) => {
        var queue = 'FirstQueue';

        ch.assertQueue(queue, {durable: false});

        console.log('waiting for queue', queue);
        ch.consume(queue, (message) => {
            console.log('Got: ', message.content.toString());
            // console.log(`Got: ${message.content}`);
            // console.log(message.content);
            // msg = JSON.parse(message);
            // console.log(msg);
        }, {noAck: true });
    });
    
});

//app.listen(port, () => console.log('App listening on port', port));

