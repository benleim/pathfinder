import { request } from 'graphql-request'
import * as UNISWAP from './dex_queries/uniswap.js';
import * as SUSHISWAP from './dex_queries/sushiswap.js';
import Graph from './graph_library/Graph.js';
import GraphVertex from './graph_library/GraphVertex.js';
import GraphEdge from './graph_library/GraphEdge.js';
import bellmanFord from './bellman-ford.js';

// POOL - MINIMUM TOTAL VALUE LOCKED (USD)
const MIN_TVL = 50_000;

// Fetch most active tokens 
async function fetchTokens(first, skip = 0) {
  let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS(first));
  console.log(mostActiveTokens)

  return mostActiveTokens.tokens.map((t) => { return t.id });
}

function calculatePathWeight(g, cycle) {
  let path = new Array(Object.keys(cycle).length);
  for (let key of Object.keys(cycle)) {
    path[cycle[key] - 1] = key.replace('_','');
  }
  console.log(path, path.length);

  let cycleWeight = 1.0;

  for (let index = path.length - 1; index > 0; index--) {
    let indexNext = (index == 0) ? path.length - 1 : index-1;
    console.log(`new indices: ${index} ${indexNext}`);
    let startVertex = g.getVertexByKey(path[index]);
    let endVertex = g.getVertexByKey(path[indexNext]);
    let edge = g.findEdge(startVertex, endVertex);

    console.log(`Start: ${startVertex.value} | End: ${endVertex.value}`)
    console.log(`Adj edge weight: ${edge.weight} | Raw edge weight: ${edge.rawWeight} | ${edge.getKey()}`);
    console.log(cycleWeight * edge.rawWeight)

    cycleWeight *= edge.rawWeight;

    // Break if sub-cycle found
    if (path[indexNext] === path[path.length - 1]) break;
  }
  return cycleWeight;
}

async function fetchUniswapPools(tokenIds) {
  let pools = new Set();
  let tokenIdsSet = new Set(tokenIds);

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
  return pools;
}

// Fetch prices
async function fetchPoolPrices(g, pools) {
  for (let pool of pools) {
    console.log(pool)
    let poolRequest = await request(UNISWAP.ENDPOINT, UNISWAP.fetch_pool(pool));
    let poolData = poolRequest.pool;

    // Some whitelisted pools are inactive for whatever reason
    // Pools exist with tiny TLV values
    if (poolData.token1Price != 0 && poolData.token0Price != 0 && poolData.totalValueLockedUSD > MIN_TVL) {

      let vertex0 = g.getVertexByKey(poolData.token0.id)
      let vertex1 = g.getVertexByKey(poolData.token1.id);

      // TODO: Adjust weight to factor in gas estimates
      let token1Price = Number(poolData.token1Price);
      let token0Price = Number(poolData.token0Price);
      let forwardEdge = new GraphEdge(vertex0, vertex1, -Math.log(Number(token1Price)), token1Price, { dex: "UNISWAP_V3" });
      let backwardEdge = new GraphEdge(vertex1, vertex0, -Math.log(Number(token0Price)), token0Price, { dex: "UNISWAP_V3" });
      console.log(forwardEdge);

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
}

async function calcArbitrage(g) {
  g.getAllVertices().forEach((vertex) => {
    let result = bellmanFord(g, vertex);
    let cycleWeight = calculatePathWeight(g, result.cyclePath);
    console.log(result);
    console.log(`Arbitrage: ${cycleWeight}`);
    console.log('----------------------')
  });
}

async function main() {
  let g = new Graph(true);

  // Add vertices to graph
  let tokenIds = await fetchTokens(10);
  console.log(SUSHISWAP.PAIRS(tokenIds));
  tokenIds.forEach(element => {
    g.addVertex(new GraphVertex(element))
  });

  let pools = await fetchUniswapPools(tokenIds);

  await fetchPoolPrices(g, pools);
  await calcArbitrage(g);
}

main().catch(error => {
  console.log(error);
});