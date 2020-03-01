// var express = require("express");
// var app = express();

amqp = require("amqplib/callback_api");

const port = 3001;

amqp.connect('amqp://localhost', (err,conn) => {
    if(err) {
        throw err;
    }

    conn.createChannel((err, ch) => {
        var queue = 'FirstQueue';
        var message = "Hello p8";

        ch.assertQueue(queue, {durable: false});
        ch.sendToQueue(queue, Buffer.from(message));
        console.log('message sent');
    });

    // setTimeout( () => {
    //     conn.close();
    //     process.exit(0); 
    // }, 500);
    
});

//app.listen(port, () => console.log('App listening on port', port));

