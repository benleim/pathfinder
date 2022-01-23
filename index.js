import { ApolloClient, InMemoryCache } from '@apollo/client';

const cache = new InMemoryCache();

const client = new ApolloClient({
    // Provide required constructor fields
    cache: cache,
    uri: process.env.UNI_V3_URL,
  
    // Provide some optional constructor fields
    name: 'pathfinder',
    version: '1.0',
    queryDeduplication: false,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
      },
    },
  });

  