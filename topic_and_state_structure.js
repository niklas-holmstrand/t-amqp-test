// Open topic hierarchy:
//
// factory/Config/Lines             - Factory_data publishes production lines
// factory/Config/Machines          - Factory_data publishes machines
//
// factory/ProductData/Layouts      - Factory_data (tmp) publishes available Layouts
//
// factory/PnP/Machines/<SNR>/Cmd                           - Resource manager listens
// factory/PnP/Machines/<SNR>/Cmd/<CmdType> - TBD               - Resource manager listens
// factory/PnP/Machines/<SNR>/State/Meta                    - Resource manager publishes
//                                  Availability            - Resource manager publishes
//                                  ProductionEngine        - Machine publishes (via resmgr?)
//                                  ComponentLoading
//                                  Notifications
//                                  Parameters/Category
//                                  Kpi                     - Cdp publishes
//
//
//
// Content of State nodes:
//
// var Meta = {  
//    name: 'Odense',
//    hostname: 'localhost:50009',
//    placeInLine: 1,
//    model: 'My300EX',
// };

// var availability = {
//     resMgrRunning: true,
//     resourceConnected: false,
//     resourceBusy: false,
//     controlOwner: ''
// };

// var myProductionEngine = {
//     state: 'Running',
//     batchId: '23-76-aa',
//     layoutName: 'Demo17',
//     batchSize: 25,
//     boardsCompleted: 0,
//     componentsPerBoard: 252,
//     componentsLeft: 130,
//     componentsMissing: 0
// };


// var myMagSlots = [
//     { state: 'Empty', name: '', slotNo: 1 },
//     { state: 'Present', name: 'Kalle', slotNo: 2 },
//     { state: 'NotYetPicked', name: 'AnnaKarin', slotNo: 3 },
//     { state: 'NotYetPicked', name: 'Lotta', slotNo: 4 },
//     { state: 'Used', name: 'Frida', slotNo: 8 },
//     { state: 'Active', name: 'Oscar', slotNo: 9 },
//     { state: 'Active', name: 'Viktor', slotNo: 10 },
// ];

// var myNotifications = [
//    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
//    runtimeData: ['C0489', 'E-lyt 50 uF 25V', 'Tower0', '4'], id: 1 },
//    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
//    runtimeData: ['C0855', 'Resist 6.8k', 'Tower1', '16'], id: 2 },
// ];

