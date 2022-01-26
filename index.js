import { request } from 'graphql-request'
import * as UNISWAP from './queries/uniswap.js';

// Fetch most active tokens
let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS);
console.log(mostActiveTokens)

let tokenIds = mostActiveTokens.tokens.map((t) => { return t.id });
let tokenIdsSet = new Set(tokenIds); // For lookup
console.log(tokenIds);

// Build initial graph (adjacency graph)
let graph = {};
for (let id of tokenIds) {
  let tokenAdjSet = new Set();

  let whitelistPoolsRaw = await request(UNISWAP.ENDPOINT, UNISWAP.token_whitelist_pools(id));
  let whitelistPools = whitelistPoolsRaw.token.whitelistPools;

  for (let pool of whitelistPools) {
    let otherToken = (pool.token0.id === id) ? pool.token1.id : pool.token0.id;
    if (tokenIdsSet.has(otherToken)) {
      tokenAdjSet.add(otherToken);
    }
  }

  // Add to graph
  graph[id] = tokenAdjList;
}

console.log(graph);

//TODO: Run route searching logic