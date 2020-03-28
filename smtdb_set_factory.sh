# !/bin/bash
#
# Script to load factory described in smtdb_set_factory.sql into an smtdb
#
smtdb_host="172.25.16.253"

psql -h $smtdb_host -U postgres -d mydata_common_db <smtdb_set_factory.sql
