import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter } from 'react-router-dom'
import './styles/main.css';
import App from './App'
import * as serviceWorker from './serviceWorker'

import { ApolloProvider } from 'react-apollo'
import { ApolloClient } from 'apollo-client'
import { ApolloProvider as ApolloHooksProvider } from 'react-apollo-hooks'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { split } from 'apollo-link'
import { WebSocketLink } from 'apollo-link-ws'
import { getMainDefinition } from 'apollo-utilities'
import { DndProvider } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend' 


const httpLink = new HttpLink({uri: 'http://' + window.location.hostname + ':4000'});
//const httpLink = new HttpLink({uri: 'https://localhost:44368/graphql/'}); // Uncomment for stitching. Don't forget to comment the line above.

const wsLink = new WebSocketLink({
  uri: `ws://` + window.location.hostname + `:4000/`,
  //uri: `wss://localhost:44368/graphql/`, // Uncomment for stitching. Don't forget to comment the line above.
  options: {
    reconnect: true
  }
});

const defaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'ignore',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  },
}

const link = split(
  ({query}) => {
    const {kind, operation} = getMainDefinition(query);
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink,
);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  defaultOptions: defaultOptions
})


ReactDOM.render(
  <DndProvider backend={HTML5Backend}>
  <ApolloProvider client={client}>
    <ApolloHooksProvider client={client}>
      <HashRouter>
        <App/>
      </HashRouter>
    </ApolloHooksProvider>
  </ApolloProvider>
  </DndProvider>
  ,
  document.getElementById('root')
)

serviceWorker.unregister()