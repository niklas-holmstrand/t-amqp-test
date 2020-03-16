// State hierarchy:
//
// factory.PnP.Machines.<SNR>.Availability.<data>
//                            ProductionEngine.<data>
//                            ----------------  = Atom 
//                            ComponentLoading
//                            Notifications.<data>
//                            -------------  = Atom with dynamic size - Store as one string
//                            Parameters.Category
//                                       --------  = Atom 

//
// Content of atomic nodes:
//
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
// //    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
// //    runtimeData: ['C0489', 'E-lyt 50 uF 25V', 'Tower0', '4'], id: 1 },
// //    { type: 'ComponentNotAvailable', severity: 'OperatorAlert', 
// //    runtimeData: ['C0855', 'Resist 6.8k', 'Tower1', '16'], id: 2 },
// ];



//
// To get a fresh cache from producers  - ie for common cashe
//
// Start subscribing atomic updates
// Send subscribe command to all producers. They will publish their entire status.
//
// on newState; myCache = merge newState on myCache ( = overwrite existing nodes, keep non existing nodes) - merge()?
// function refreshCache(existing, fresh)
//  

//
// To get a fresh (part-) cache based on common cache  - eg for GuiProvider or stat_mon
//
// Start subscribing atomic updates
// on newState; localCache = merge newState on localCache ( = overwrite existing nodes, keep non existing nodes) - merge()?
// <same as above>
//
// Get common chache
// on commonCache; localCache = extend localCache with commonCache ( = for nonexistant keys in localCache, extend from commonCache)
// function extendCache(existing, olcCompleteCashe)
// 

_=require('lodash');

// 
// refreshCache - extend or overwrite data with  new state information
//  ( = overwrite existing nodes, keep nodes that are not in "fresh")
// 
function refreshCache(existing, fresh) {
    return _.merge(existing, fresh);  
}

// 
// extendCache - extend or a cashe with complete data that may be older than status in existing cache
//  ( = for nonexistant keys in existing, extend from oldCompleteCashe, throw away rest of oldCompleteCashe)
// 
function extendCache(existing, oldCompleteCashe) {
    return _.merge(oldCompleteCashe, existing);  
}

receivedAtom =
{
    factory: {
        PnP : {
            Machines: {
                M0: {
                    ProductionEngine: {
                        State: 'Running',
                        ComponentsLeft: 16,
                        ComponentsMissing: 1
                    },
                }
            }
        }
    }
}                           

collectedFromSubs = 
{
    factory: {
        PnP : {
            Machines: {
                M0: {
                    ProductionEngine: {
                        State: 'Running',
                        ComponentsLeft: 32,
                        ComponentsMissing: 3
                    },
                },
                M1: {
                    Notifications: '{\
                        "0": { "Type": 25, "Severity": 2, "RuntimeData": {"0": "435699 - Resist 47 k"}}\
                    }'
                },
            }
        }
    }
}                           

fromCache = 
{
    factory: {
        PnP : {
            Machines: {
                M0: {
                    ProductionEngine: {
                        State: 'Running',
                        ComponentsLeft: 34,
                        ComponentsMissing: 3
                    },
                    Notifications: '{\
                        "0": { "Type": 22, "Severity": 2, "RuntimeData": {"0": "935631 - Cap 56 uF"}}\
                    }'
                },
                M1: {
                    ProductionEngine: {
                        State: 'Paused',
                        ComponentsLeft: 100,
                        ComponentsMissing: 0
                    },
                    Notifications: '{\
                        "0": { "Type": 23, "Severity": 2, "RuntimeData": {"0": "435631 - Resist 56 k"}},\
                        "1": { "Type": 23, "Severity": 2, "RuntimeData": {"0": "435644 - Resist 10 k"}},\
                    }'
                },
            }
        }
    }
}                           

//
// Test refreshCache()
// Simulate common cache role: start collecting and get a larg update with complete fresh cache
//
myState = refreshCache(fromCache, collectedFromSubs);
//console.log('refreshCache: ', JSON.stringify(myState, null, 4) );

if (myState.factory.PnP.Machines.M0.ProductionEngine.ComponentsLeft == 32) {
    console.log('ok')
} else {
    console.log('Old data not overwritten!')
}
if (myState.factory.PnP.Machines.M1.ProductionEngine.State == 'Paused') {
    console.log('ok')
} else {
    console.log('Existing data lost!')
}
m1Notifications = JSON.parse(myState.factory.PnP.Machines.M1.Notifications);
//console.log('m1Notifications:', m1Notifications);
if (!m1Notifications['1']) {
    console.log('ok')
} else {
    console.log('Old notification still exists!')
}
if (m1Notifications['0'].Type == 25) {
    console.log('ok')
} else {
    console.log('Lost notification?', m1Notifications);
}
console.log('');


//
// Test extendCache()
// Simulate common cache's client role: start collecting fresh data and extend but not overwrite with received cache
//
myState = refreshCache(collectedFromSubs, receivedAtom);    // initial collecting of states
myState = extendCache(myState, fromCache);                  // Extend with old cache

if (myState.factory.PnP.Machines.M0.ProductionEngine.ComponentsLeft == 16) {
    console.log('ok')
} else {
    console.log('Overwritten by old data!')
}
if (myState.factory.PnP.Machines.M1.ProductionEngine.State == 'Paused') {
    console.log('ok')
} else {
    console.log('Missing old cache data')
}
m1Notifications = JSON.parse(myState.factory.PnP.Machines.M1.Notifications);
if (!m1Notifications['n1']) {
    console.log('ok')
} else {
    console.log('Old notification were added!')
}
if (m1Notifications['0'].Type == 25) {
    console.log('ok')
} else {
    console.log('Lost notification?', m1Notifications);
}
console.log('');








// fromCache.factory.PnP.Machines.M0 = receivedFromSubs0.factory.PnP.Machines.M0;
// myState = fromCache;

//fromCache.factory.PnP.Machines.M0 = Object.assign(fromCache.factory.PnP.Machines.M0, receivedFromSubs0.factory.PnP.Machines.M0);
//myState = Object.assign(fromCache, receivedFromSubs0);
//myState = Object.assign(receivedFromSubs0, fromCache);

//myState = {...fromCache, ...receivedFromSubs0};
//myState = {...receivedFromSubs0, ...fromCache};
//myState = _.merge(fromCache, receivedFromSubs0);        // OK deep merge.

// console.log('myState', myState);
// console.log('');
// console.log('myState JSON', JSON.stringify(myState, null, 4) );
// console.log('');
// console.log('PE0 ', myState.factory.PnP.Machines.M0.ProductionEngine );
// console.log('');
// console.log('PE0  JSON', JSON.stringify(myState.factory.PnP.Machines.M0.ProductionEngine) );
// console.log('');
// console.log('PE0  JSON', JSON.stringify(myState['factory']['PnP']['Machines']['M0']['ProductionEngine'], null, 4) );
// console.log('');

// console.log('PE01 ', myState );
// console.log('');
// console.log('PE02 ', myState.factory );
// console.log('');
// console.log('PE03 ', myState.factory.PnP );
// console.log('');
// console.log('PE04 ', myState.factory.PnP.Machines );
// console.log('');
// console.log('PE05 ', myState.factory.PnP.Machines.M0 );
// console.log('');
// console.log('PE06 ', myState.factory.PnP.Machines.M0.ProductionEngine );
// console.log('');

