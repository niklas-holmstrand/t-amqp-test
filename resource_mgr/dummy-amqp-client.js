amqp = require("amqplib/callback_api");

var amqpChannel;
const queue = 'FirstQueue';

amqp.connect('amqp://localhost', (err,conn) => {
    if(err) {
        throw err;
    }

    conn.createChannel((err, ch) => {
        amqpChannel = ch;

        ch.assertQueue(queue, {durable: false});
    });

});


var i = 0;
generateMessage = function () {
    var message = "Hello p8 " + i++;
    amqpChannel.sendToQueue(queue, Buffer.from(message));
    console.log('message sent', message);
    setTimeout( generateMessage, 200);
}

setTimeout( generateMessage, 600);

