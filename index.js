import { rawRequest, request } from 'graphql-request'
import * as UNISWAP from './queries/uniswap.js';
import Graph from './graph_library/Graph.js';
import GraphVertex from './graph_library/GraphVertex.js';
import GraphEdge from './graph_library/GraphEdge.js';
import bellmanFord from './bellman-ford.js';

// Fetch most active tokens
let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS);
console.log(mostActiveTokens)

let tokenIds = mostActiveTokens.tokens.map((t) => { return t.id });
let tokenIdsSet = new Set(tokenIds); // For lookup

// Add vertices to graph
let g = new Graph();
let pools = new Set();
tokenIds.forEach(element => {
  g.addVertex(new GraphVertex(element))
});

// Fetch whitelist pools
for (let id of tokenIds) {
  // Query whitelisted pools for token
  let whitelistPoolsRaw = await request(UNISWAP.ENDPOINT, UNISWAP.token_whitelist_pools(id));
  let whitelistPools = whitelistPoolsRaw.token.whitelistPools;

  // Filter to only
  for (let pool of whitelistPools) {
    let otherToken = (pool.token0.id === id) ? pool.token1.id : pool.token0.id;
    if (tokenIdsSet.has(otherToken)) {
      pools.add(pool.id)
    }
  }
}
console.log(pools)

// Fetch prices
for (let pool of pools) {
  console.log(pool)
  let poolRequest = await request(UNISWAP.ENDPOINT, UNISWAP.fetch_pool(pool));
  let poolData = poolRequest.pool;

  // Some whitelisted pools are inactive for whatever reason
  if (poolData.token1Price != 0 && poolData.token0Price != 0) {

    let vertex0 = g.getVertexByKey(poolData.token0.id)
    let vertex1 = g.getVertexByKey(poolData.token1.id);

    let forwardEdge = new GraphEdge(vertex0, vertex1, -Math.log(Number(poolData.token1Price)));
    let backwardEdge = new GraphEdge(vertex1, vertex0, -Math.log(Number(poolData.token0Price)));

    // Temporary solution to multiple pools per pair
    try {
      g.addEdge(forwardEdge);
      g.addEdge(backwardEdge);

      console.log(poolData.token0.symbol, poolData.token1.symbol, poolData.token0Price, poolData.token1Price)
      console.log(`${poolData.token0.symbol} -> ${poolData.token1.symbol} = ${-Math.log(Number(poolData.token1Price))}`);
      console.log(`${poolData.token1.symbol} -> ${poolData.token0.symbol} = ${-Math.log(Number(poolData.token0Price))}`);
    } catch (error) {
      console.log(`error adding pool`)
    }

  }
}

g.getAllVertices().forEach((vertex) => {
  let result = bellmanFord(g, vertex);
  console.log(result);
})
