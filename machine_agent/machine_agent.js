const http = require('http');
const app = require('./app');
const gQlServer = require('./graphql_api');

const port = process.env.PORT || 3002;

const server = http.createServer(app);

server.listen(port);

gQlServer.start(() => console.log(`Server is running on http://localhost:4000`))
