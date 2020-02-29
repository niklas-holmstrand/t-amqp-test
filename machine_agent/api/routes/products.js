const express = require('express');
const grpc_client = require('../../grpc_client');

const router = express.Router();

// status
var statSrvTime
var statN


router.post('/', (req, res, next) => {
    res.status(200).json({
        message: 'Handl POST on /products'
    });
});




router.get('/', (req, res, next) => {

    grpc_client.sayHello()
      .sendMessage({name: 'lisa44'})
      .then(response => {
        console.log('Got greeyting:', response.message);
	res.status(200).json({
            message: response.message,
            id_keyy: response.my_id,
            serverData: statSrvTime,
            serverN: statN,
	});
      })
      .catch(err => console.error(err))
    ;

    console.log('exit get');
});

/*
router.get('/', (req, res, next) => {
    var msg;

    grpc_client.sayHello({name: 'lisa44'}, function(err, response) {
      console.log('Got greeting:', response.message);
      msg = reponse.message;

      console.log('exit0');
    });

    console.log('json now');
    res.status(200).json({
        message: msg
    });
  

});
*/

function statusUpdate(s) {
  console.log('status update ' + s.serverTime + " " + s.myInt);
  statSrvTime = s.serverTime
  statN = s.myInt
}

function some_init_testing() {
  // check that grpc is up
//  grpc_client.sayHello({name: 'putte23'}, function(err, response) {
//    console.log('Greeting to :', response.message);
//  });


/*  grpc_client.sayHello()
    .sendMessage({name: 'putte23'})
    .then(response => {
      console.log('Greeting to :', response.message);
    });*/

  channel = grpc_client.subscribe({n: -1});
  channel.on("data", statusUpdate);
  console.log("subscribed")

/*
  grpc_client.subscribe()
    .sendMessage({n: -1})
    .then(statusUpdate)
    .catch(err => console.error(err))
*/
  console.log("subscribed")
}

setTimeout(some_init_testing, 1000);
console.log("timer started")


module.exports = router;
