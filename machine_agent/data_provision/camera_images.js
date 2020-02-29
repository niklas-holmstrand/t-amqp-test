const { grpcConnections } = require("../grpc_client");

var cameraImagesSubscription = null;

function CameraImages(machine = 0) {
  let cameraImagesState = null;

  this.getMyCameraImagesState = () => cameraImagesState;
  this.getMachine = () => machine;

  this.makeUpdater = function() {
    return function(newState) {
      cameraImagesState = newState;
      clients.forEach(callback => {
        callback(newState, 0);
      });
    };
  };
}

function startCameraImagesSubscription(m) {
  if (!cameraImagesSubscription) {
    cameraImagesSubscription = new CameraImages(0);
    cameraImagesSubscriptions.push(cameraImagesSubscription);
  }

  const grpcConnection = grpcConnections.find(c => c.machineId === 0);

  const channel = grpcConnection.connection.subscribeCameraImages({ n: -1 });
  channel.on("data", cameraImagesSubscription.makeUpdater());

  channel.on("error", () => {
    console.log("Connection lost in camera images sub to ");
  });
}

function getCameraImagesState(machineId = 0) {
  return cameraImagesSubscription.getMyCameraImagesState();
}

//
// Register callback to listen to updates
//
function onCameraImagesUpdate(callback) {
  clients.push(callback);
}

//
// Locals & initialization
//
let clients = [];
let cameraImagesSubscriptions = [];

module.exports = {
  getCameraImagesState,
  onCameraImagesUpdate,
  startCameraImagesSubscription
};
