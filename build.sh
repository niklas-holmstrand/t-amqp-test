#
# Compile proto files
#
protoc --js_out=import_style=commonjs,binary:. tpsys_sim/tpcp.proto
protoc --js_out=import_style=commonjs,binary:. resource_mgr/resource_mgr.proto
protoc --js_out=import_style=commonjs,binary:. factory_data/factory_data.proto
