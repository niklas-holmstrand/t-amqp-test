/*
 * Monitor factory status
 * 
 */

amqp = require("amqplib/callback_api");
amqp.connect('amqp://localhost', (err,conn) => {

    var bindings = ['#'];

    conn.createChannel(function(error1, channel) {
        if (error1) {
          throw error1;
        }
        var exchange = 'topic_ppMachines';
    
        channel.assertExchange(exchange, 'topic', {
          durable: false
        });
    
        channel.assertQueue('', {
          exclusive: true
        }, function(error2, q) {
          if (error2) {
            throw error2;
          }

          
          bindings.forEach(function(key) {
            channel.bindQueue(q.queue, exchange, key);
          });
    
          channel.consume(q.queue, function(msg) {
            //console.log("Got:", msg.fields.routingKey, msg.content.toString());
            handleStatusUpdates(msg);
          }, {
            noAck: true
          });
        });
    });
});


function handleStatusUpdates(msg) {
    topic = msg.fields.routingKey.split(".");
    machineId = topic[0];
    rootTopic = topic[1]
    recState = JSON.parse(msg.content.toString());
    //console.log("Handle status update", machineId, rootTopic, recState);
    detectedMachines[machineId] = true;
  
    if (rootTopic == "ResourceState") {
        resoruceStateCashe[machineId] = recState; 
    }
  
    if (rootTopic == "ProductionEngine") {
        productionEnginesCashe[machineId] = recState; 
    }
  
    if (rootTopic == "Notifications") {
        notificationStatusCashe[machineId] = recState; 
    }
  
    if (rootTopic == "ComponentLoading") {
        magazineStatusCashe[machineId] = recState; 
    }
  
}
  
//////////
//
// Status chashing
//
detectedMachines = []; // Just boolean to mark form which machines some status is available
resoruceStateCashe = []; 
productionEnginesCashe = []; 
notificationStatusCashe = []; 
magazineStatusCashe = []; 

// Got: 2.ComponentLoading [{"state":"Empty","name":"","slotNo":1},{"state":"Present","name":"Kalle","slotNo":2},{"state":"NotYetPicked","name":"AnnaKarin","slotNo":3},{"state":"Used","name":"Lotta","slotNo":4},{"state":"Used","name":"Frida","slotNo":8},{"state":"Active","name":"Oscar","slotNo":9},{"state":"Active","name":"Viktor","slotNo":10}]
// Got: 1.ProductionEngine {"state":"Running","batchId":"sgfsg","layoutName":"TL_SinglePcb","batchSize":776,"boardsCompleted":74,"componentsPerBoard":252,"componentsLeft":118,"componentsMissing":0}
//Got: 0.ResourceState {"resMgrRunning":true,"resourceConnected":true,"resourceBusy":false,"controlOwner":""}

var sprintf = require('sprintf-js').sprintf;

function presentProp(title, cashe, propery) {
    s = sprintf('%20s', title)
    detectedMachines.forEach((val, i) => {
        if(cashe[i]) {
            s = s + sprintf('%15s', cashe[i][propery])
        } else {
            s = s + sprintf('%15s', " ")
        }
    });
    console.log(s);
}


function presentStatus() {
    setTimeout(presentStatus, 200)
    console.clear();


    s = sprintf('%20s', "MachineId ")
    detectedMachines.forEach((val, i) => {
        s = s + sprintf('%15s', i)
    });
    console.log(s);
    console.log();

    presentProp("Connected:", resoruceStateCashe, "resourceConnected");
    presentProp("Busy:", resoruceStateCashe, "resourceBusy");
    presentProp("Control owner:", resoruceStateCashe, "controlOwner");
    console.log();
    presentProp("State:", productionEnginesCashe, "state");
    presentProp("Components left:", productionEnginesCashe, "componentsLeft");
    presentProp("Layout name:", productionEnginesCashe, "layoutName");
    presentProp("Batch id:", productionEnginesCashe, "batchId");
    presentProp("Batch size:", productionEnginesCashe, "batchSize");
    presentProp("Boards completed:", productionEnginesCashe, "boardsCompleted");
    presentProp("Comps per board:", productionEnginesCashe, "componentsPerBoard");
    presentProp("Components missing:", productionEnginesCashe, "componentsMissing");
}
setTimeout(presentStatus, 10)


