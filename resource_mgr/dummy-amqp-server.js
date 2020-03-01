amqp = require("amqplib/callback_api");

var amqpChannel;
const queue = 'FirstQueue';


amqp.connect('amqp://localhost', (err,conn) => {
    conn.createChannel((err, ch) => {

        ch.assertQueue(queue, {durable: false});
        amqpChannel = ch;

        // Setup consumer
        amqpChannel.consume(queue, (message) => {
            console.log('Got: ', message.content.toString());
            handleMessage(message.content.toString());
        }, {noAck: true });
    });   
});


handleMessage = function(msg) {
    console.log('Handle: ', msg);
};

