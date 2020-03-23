protoc --js_out=import_style=commonjs,binary:. tpcp0.proto
protoc --js_out=import_style=commonjs,binary:. resource_mgr.proto
cd factory_data
protoc --js_out=import_style=commonjs,binary:. factory_data.proto
cd ..

npm install
cd frontend/tpsys_tiny
npm install

