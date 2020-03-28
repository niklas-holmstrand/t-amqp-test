--
-- Setup testfactory for GUI-spike demo
--


DROP TABLE IF EXISTS MYDbLineData_10.machinesInLine CASCADE ;
CREATE TABLE MYDbLineData_10.machinesInLine (
	modInfo             MYDbMetaData_10.modifiedInfo      NOT NULL,
	lineId           	INTEGER NOT NULL,
	machineNumber     MYDbComnData_10.machineNumber,
	id					SERIAL UNIQUE,
	CONSTRAINT machine_alreade_in_a_line    UNIQUE(machineNumber),
	CONSTRAINT no_such_line FOREIGN KEY (lineId) REFERENCES MYDbLineData_10.line(id) ON DELETE CASCADE
) ;

DROP TABLE IF EXISTS MYDbLineData_10.machine CASCADE ;
CREATE TABLE MYDbLineData_10.machine (
	modInfo             MYDbMetaData_10.modifiedInfo      NOT NULL,
	machineNumber     	MYDbComnData_10.machineNumber,
	hostName			MYDbComnData_10.hostName,
	alias				MYDbComnData_10.alias,
	id					SERIAL UNIQUE,
	CONSTRAINT machine_number_exists    UNIQUE(machineNumber)
) ;

--
-- Line 1
--
-- machine 90010
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 90010, '22.33.44.55', 'Helsinki');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 1, 90010);

-- machine 90011
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 90011, '22.33.44.55', 'Turku');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 1, 90011);

-- machine 90012
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 90012, '22.33.44.55', 'Tampere');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 1, 90012);

--
-- Line 2
--
-- machine 21010 - My700
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 21010, '22.33.44.55', 'Odense');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 2, 21010);

-- machine 140010
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 140010, '22.33.44.55', 'Copenhagen');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 2, 140010);

-- machine 140011
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 140011, '22.33.44.55', 'Aalborg');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 2, 140011);

--
-- Line 3
--
-- machine 20010 - My600
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 20010, '22.33.44.55', 'Toledo');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 3, 20010);

-- machine 190010 - My9-19
insert into  mydblinedata_10.machine (modinfo, machinenumber, hostname, alias) values ('("2019-03-26 13:17:49.154459",2)', 190010, '22.33.44.55', 'Madrid');
insert into  mydblinedata_10.machinesinline (modinfo, lineid, machinenumber) values ('("2019-03-26 13:17:49.154459",2)', 3, 190010);



--
-- The line table have to be recreated to make id start from beginning again
--
DROP TABLE IF EXISTS MYDbLineData_10.line CASCADE ;
CREATE TABLE MYDbLineData_10.line (
	-- Data common to all data tables
	modInfo			 MYDbMetaData_10.modifiedInfo      NOT NULL,
	-- Key field (should always be a normalized and upper version of the name)
	normalizedUCName MYDbComnData_10.lineName NOT NULL,
	-- line id
	id				 	SERIAL UNIQUE,
	-- User data
	name              MYDbComnData_10.lineName,
	comment           MYDbComnData_10.comment,
	-- Consistency checks
	CONSTRAINT name_empty          CHECK(name != ''),
	CONSTRAINT name_exists PRIMARY KEY(normalizedUCName)
) ;

insert into  mydblinedata_10.line (modinfo, normalizeducname, name, comment) values ('("2019-03-26 13:17:49.154459",2)', 'FINLAND', 'Finland', 'Trilogy line floor 1');
insert into  mydblinedata_10.line (modinfo, normalizeducname, name, comment) values ('("2019-03-26 13:17:49.154459",2)', 'DENMARK', 'Denmark', 'Synergy line floor 1');
insert into  mydblinedata_10.line (modinfo, normalizeducname, name, comment) values ('("2019-03-26 13:17:49.154459",2)', 'SPAIN', 'Spain', 'NPI line floor 3');
