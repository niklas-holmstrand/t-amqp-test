const { Pool, Client } = require('pg')


//
// current smtDb structure:
// 
// TPSys announces existence to "machines"
// Utility lineConfig writes to "machinesinline" (with machine order implicitely same as in table) and "line"
//
// Here, merge data from "machines" and "machinesinline"
//


//
// For now, vbox at Holmen
//
function makeClient() {
    const client = new Client({
        user: 'postgres',
        host: '172.25.16.253',
        database: 'mydata_common_db',
        password: 'mydata',
        port: 5432,
      })
      client.connect()
      return client;
}
  

//
// Clean machine data joined from dual tables and add machines in line structure;
//
// FOR all lines
//    Add empty machines property
//    retreive all machines in this line and add to lines machines[] prop
//     sort wrt id
//     FOR all machines in this line
//         Add placeInLine property
//         Guess role and 
//
function fixupFactoryData () {
    //console.log('--fixupFactoryData--');
    myProductionLines.map( line => {
        // Add all machine in this line. Assure sorted according to id from smtdb:machinesinline ie their order in the line
        line.machines = myMachines.filter(m => m.lineid == line.id).sort((a, b) => a.id - b.id);
        let placeInLine = 0;
        line.machines.map(m => {
            m.placeInLine = placeInLine++;
            m.role = (m.machinenumber < 90000) ? 'Jet': 'PnP';  // Dirty for now, from snr determine type of machine

            m.connected = false;

            m.name = m.alias;
            delete m.alias;

            m.snr = m.machinenumber;
            delete m.machinenumber;

            if(m.snr >= 20000 && m.snr <= 20999) {
                m.model = 'MY-600';
            } else if(m.snr >= 21000 && m.snr <= 21999) {
                m.model = 'MY-700';
            } else if(m.snr >= 140000 && m.snr <= 149999) {
                m.model = 'MY-200';
            } else if( (m.snr >= 90000 && m.snr <= 99999) ||
                       (m.snr >= 170000 && m.snr <= 179999)) {
                m.model = 'MY-300';
            } else if(m.snr >= 190000 && m.snr <= 199999) {
                m.model = 'MY-9';
            } else {
                m.model = 'MY-XXX';
            }
        });

        //console.log('--- this line: ---', line);
    });

    //console.log('--- myMachines: ---', myMachines);
}

async function getFactoryData() {
    client = makeClient();
    const res = await client.query('select name, normalizeducname, createtime, modifiedtime, comment from mydblytldata_10.layout');
    myLayouts = res.rows;
    //console.log('##### 1', myLayouts);

    client = makeClient();
    const res1 = await client.query(`select mydblinedata_10.machine.machinenumber, alias, mydblinedata_10.machinesinline.id, hostname, mydblinedata_10.machinesinline.lineid 
    from mydblinedata_10.machinesinline 
    inner join mydblinedata_10.machine on mydblinedata_10.machine.machinenumber=mydblinedata_10.machinesinline.machinenumber`);
    myMachines = res1.rows;
    //console.log('##### 2', myMachines);

    client = makeClient();
    const res2 = await client.query('select name, normalizeducname, comment, id from mydblinedata_10.line');
    myProductionLines = res2.rows;
    //console.log('##### 3', myProductionLines);


    fixupFactoryData();
    //(console.log('##### 4', myMachines);

    return {myMachines: myMachines, myProductionLines: myProductionLines, myLayouts: myLayouts}
//    return {myMachines, myProductionLines, myLayouts}
}

//getFactoryData();

module.exports = {getFactoryData}

