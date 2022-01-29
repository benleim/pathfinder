import { rawRequest, request } from 'graphql-request'
import * as UNISWAP from './queries/uniswap.js';
import Graph from './graph.js';

// Fetch most active tokens
let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS);
console.log(mostActiveTokens)

let tokenIds = mostActiveTokens.tokens.map((t) => { return t.id });
let tokenIdsSet = new Set(tokenIds); // For lookup

// Build initial graph (adjacency list)
let g = new Graph();
let pools = new Set();
tokenIds.forEach(element => {
  g.addNode(element);
});

for (let id of tokenIds) {
  g.addNode(id);
  let tokenAdjSet = new Set();

  // Query whitelisted pools for token
  let whitelistPoolsRaw = await request(UNISWAP.ENDPOINT, UNISWAP.token_whitelist_pools(id));
  let whitelistPools = whitelistPoolsRaw.token.whitelistPools;

  // Filter to only
  for (let pool of whitelistPools) {
    let otherToken = (pool.token0.id === id) ? pool.token1.id : pool.token0.id;
    if (tokenIdsSet.has(otherToken)) {
      tokenAdjSet.add(otherToken);
      g.addEdge(id, otherToken);
      pools.add(pool.id)
    }
  }
}

// Fetch prices
for (let pool of pools) {
  let poolRequest = await request(UNISWAP.ENDPOINT, UNISWAP.fetch_pool(pool));
  let poolData = poolRequest.pool;

  g.setEdgeWeight(poolData.token0.id, poolData.token1.id, poolData.token1Price)
  g.setEdgeWeight(poolData.token1.id, poolData.token0.id, poolData.token0Price)
}

console.log(g);
console.log(g.adjList);
console.log(g.edgeWeights);
//TODO: Run route searching logic