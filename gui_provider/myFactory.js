machine0 = {
  name: 'Helsinki',
  snr: 'my300-9n0143',
  hostname: 'localhost:50000',
  placeInLine: 0,
  model: 'My300HX',
  role: 'PnP',
  connected: false,
  id: 0
};
machine1 = {
  name: 'Turku',
  snr: 'my300-9n0164',
  hostname: 'localhost:50001',
  placeInLine: 1,
  model: 'My300DX',
  role: 'PnP',
  connected: false,
  id: 1
};
machine2 = {
  name: 'Tampere',
  snr: 'my300-9n0043',
  hostname: 'localhost:50002',
  placeInLine: 2,
  model: 'My300EX',
  role: 'PnP',
  connected: false,
  id: 2
};
machine3 = {
  name: 'Lyon',
  snr: 'my700-n0001',
  hostname: '1.1.1.1',
  placeInLine: 0,
  model: 'My700',
  role: 'Jet',
  connected: false,
  id: 775
};
machine4 = {
  name: 'Paris',
  snr: 'my200-14n0092',
  hostname: 'localhost:50003',
  placeInLine: 1,
  model: 'My200DX',
  role: 'PnP',
  connected: false,
  id: 4
};
machine5 = {
  name: 'Toulouse',
  snr: 'my200-14n0093',
  hostname: 'localhost:50004',
  placeInLine: 2,
  model: 'My200DX',
  role: 'PnP',
  connected: false,
  id: 5
};
machine6 = {
  name: 'Grenoble',
  snr: '7K-0223',
  hostname: '1.1.1.1',
  placeInLine: 3,
  model: '7K-3D',
  role: 'Aoi',
  connected: false,
  id: 6
};
machine7 = {
  name: 'Copenhagen',
  snr: 'my300-9n0542',
  hostname: 'localhost:50007',
  placeInLine: 1,
  model: 'My300HX',
  role: 'PnP',
  connected: false,
  id: 7
};
machine8 = {
  name: 'Aalborg',
  snr: 'my300-9n0543',
  hostname: 'localhost:50008',
  placeInLine: 1,
  model: 'My300DX',
  role: 'PnP',
  connected: false,
  id: 8
};
machine9 = {
  name: 'Odense',
  snr: 'my300-9n0544',
  hostname: 'localhost:50009',
  placeInLine: 1,
  model: 'My300EX',
  role: 'PnP',
  connected: false,
  id: 9
};

async function getFactoryData() {
  let p = new Promise((resolve, reject) => {

    const myMachines = [machine0, machine1, machine2, machine3, machine4, machine5, machine6, machine7, machine8, machine9];
    const myProductionLines = [
      {name: 'Finland', comment: 'Trilogy line floor 1', machines: [machine0, machine1, machine2]},
      {name: 'France', comment: 'Synergy line floor 1', machines: [machine3, machine4, machine5, machine6]},
      {name: 'Denmark', comment: 'Synergy line floor 2', machines: [machine7, machine8, machine9]},
    ];
    const myLayouts = [{name: 'TL_SinglePcb'}, {name: 'TL_MultiplePcb'}, {name: 'TL_Quick'}]

    resolve({myMachines: myMachines, myProductionLines: myProductionLines, myLayouts: myLayouts})
  });

  return p;
}

module.exports = {getFactoryData}
