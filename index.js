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

// Fetch prices
for (let pool of pools) {
  console.log(pool)
  let poolRequest = await request(UNISWAP.ENDPOINT, UNISWAP.fetch_pool(pool));
  let poolData = poolRequest.pool;

  // Some whitelisted pools are inactive for whatever reason
  if (poolData.token1Price != 0 && poolData.token0Price != 0) {

    let vertex0 = g.getVertexByKey(poolData.token0.id)
    let vertex1 = g.getVertexByKey(poolData.token1.id);

    // TODO: Adjust weight to factor in gas estimates
    let token1Price = Number(poolData.token1Price);
    let token0Price = Number(poolData.token0Price);
    let forwardEdge = new GraphEdge(vertex0, vertex1, -Math.log(Number(token1Price)), token1Price);
    let backwardEdge = new GraphEdge(vertex1, vertex0, -Math.log(Number(token0Price)), token0Price);

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

function calculatePathWeight(cycle) {
  let path = new Array(Object.keys(cycle).length);
  for (let key of Object.keys(cycle)) {
    path[cycle[key] - 1] = key.replace('_','');
  }
  console.log(path, path.length);

  let cycleWeight = 1.0;
  // TODO: This assumes the cycle includes all nodes in object (not always true)
  for (let index = 0; index < path.length - 1; index++) {
    let indexNext = (Number(index)+1) % path.length
    console.log(index, indexNext);
    let endVertexKey = path[index];
    let endVertex = g.getVertexByKey(endVertexKey);
    let startVertexKey = path[(Number(index) + 1) % path.length];
    let startVertex = g.getVertexByKey(startVertexKey);
    let edge = g.findEdge(startVertex, endVertex);
    console.log(`Start: ${startVertexKey} | End: ${endVertexKey}`)
    console.log(`Adj edge weight: ${edge.weight} | Raw edge weight: ${edge.rawWeight} | ${edge.getKey()}`);
    console.log(cycleWeight * edge.rawWeight)
    cycleWeight *= edge.rawWeight;
  }
  return cycleWeight;
}

g.getAllVertices().forEach((vertex) => {
  let result = bellmanFord(g, vertex);
  let cycleWeight = calculatePathWeight(result.cyclePath);
  console.log(result);
  console.log(cycleWeight);
})
