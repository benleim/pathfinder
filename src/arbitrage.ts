import { request } from 'graphql-request'
import * as UNISWAP from './dex_queries/uniswap';
import * as SUSHISWAP from './dex_queries/sushiswap';

import Graph from './graph_library/Graph';
import GraphVertex from './graph_library/GraphVertex';
import GraphEdge from './graph_library/GraphEdge';
import bellmanFord from './bellman-ford';
import { DEX, MIN_TVL } from './constants';

// Fetch most active tokens 
async function fetchTokens(first, skip = 0, dex: DEX) {
  let dexEndpoint = (dex === DEX.UniswapV3) ? UNISWAP.ENDPOINT : SUSHISWAP.ENDPOINT;
  let tokensQuery = (dex === DEX.UniswapV3) ? UNISWAP.HIGHEST_VOLUME_TOKENS(first) : SUSHISWAP.HIGHEST_VOLUME_TOKENS(first, skip);
  let mostActiveTokens = await request(dexEndpoint, tokensQuery);
  console.log(`Tokens:`, mostActiveTokens.tokens)

  return mostActiveTokens.tokens.map((t) => { return t.id });
}

function calculatePathWeight(g, cycle) {
  let cycleWeight = 1.0;
  // console.log(cycle.length);
  for (let index = 0; index < cycle.length - 1; index++) {
    let indexNext = index + 1;
    // console.log(`new indices: ${index} ${indexNext}`);
    let startVertex = g.getVertexByKey(cycle[index]);
    let endVertex = g.getVertexByKey(cycle[indexNext]);
    let edge = g.findEdge(startVertex, endVertex);

    // console.log(`Start: ${startVertex.value} | End: ${endVertex.value}`)
    // console.log(`Adj edge weight: ${edge.weight} | Raw edge weight: ${edge.rawWeight} | ${edge.getKey()}`);
    // console.log(`DEX: ${edge.metadata.dex}`)
    // console.log(cycleWeight * edge.rawWeight)

    cycleWeight *= edge.rawWeight;
  }
  return cycleWeight;
}

async function fetchUniswapPools(tokenIds) {
  let pools = new Set<string>();
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

async function fetchSushiswapPools(tokenIds) {
  let pools = new Set<string>();

  // Fetch pools
  let poolsDataRaw = await request(SUSHISWAP.ENDPOINT, SUSHISWAP.PAIRS(tokenIds));
  let poolsData = poolsDataRaw.pairs;

  // Filter to only
  for (let pool of poolsData) {
    pools.add(pool.id);
  }
  return pools;
}

// Fetch prices
async function fetchPoolPrices(g: Graph, pools: Set<string>, dex: DEX, debug: boolean = false) {
  if (debug) console.log(pools);
  for (var pool of Array.from(pools.values())) {
    if (debug) console.log(dex, pool) //debug
    let DEX_ENDPOINT =  (dex === DEX.UniswapV3) ? UNISWAP.ENDPOINT :
                        (dex === DEX.Sushiswap) ? SUSHISWAP.ENDPOINT : "";
    let DEX_QUERY =     (dex === DEX.UniswapV3) ? UNISWAP.fetch_pool(pool) :
                        (dex === DEX.Sushiswap) ? SUSHISWAP.PAIR(pool) : "";;

    let poolRequest = await request(DEX_ENDPOINT, DEX_QUERY);
    let poolData =  (dex === DEX.UniswapV3) ? poolRequest.pool :
                    (dex === DEX.Sushiswap) ? poolRequest.pair : [];
    if (debug) console.log(poolData); //debug

    // Some whitelisted pools are inactive for whatever reason
    // Pools exist with tiny TLV values
    let reserves =  (dex === DEX.UniswapV3) ? Number(poolData.totalValueLockedUSD) : 
                    (dex === DEX.Sushiswap) ? Number(poolData.reserveUSD) : 0;
    if (poolData.token1Price != 0 && poolData.token0Price != 0 && reserves > MIN_TVL) {

      let vertex0 = g.getVertexByKey(poolData.token0.id);
      let vertex1 = g.getVertexByKey(poolData.token1.id);

      // TODO: Adjust weight to factor in gas estimates
      let token1Price = Number(poolData.token1Price);
      let token0Price = Number(poolData.token0Price);
      let forwardEdge = new GraphEdge(vertex0, vertex1, -Math.log(Number(token1Price)), token1Price, { dex: dex, address: pool });
      let backwardEdge = new GraphEdge(vertex1, vertex0, -Math.log(Number(token0Price)), token0Price, { dex: dex, address: pool });

      // Temporary solution to multiple pools per pair
      // TODO: Check if edge exists, if yes, replace iff price is more favorable (allows cross-DEX)
      let forwardEdgeExists = g.findEdge(vertex0, vertex1);
      let backwardEdgeExists = g.findEdge(vertex1, vertex0);

      if (forwardEdgeExists) {
        if (forwardEdgeExists.rawWeight < forwardEdge.rawWeight) {
          if (debug) console.log(`replacing: ${poolData.token0.symbol}->${poolData.token1.symbol} from ${forwardEdgeExists.rawWeight} to ${forwardEdge.rawWeight}`)
          g.deleteEdge(forwardEdgeExists);
          g.addEdge(forwardEdge);
        }
      } else {
        g.addEdge(forwardEdge);
      }

      if (backwardEdgeExists) {
        if (backwardEdgeExists.rawWeight < backwardEdge.rawWeight) {
          if (debug) console.log(`replacing: ${poolData.token1.symbol}->${poolData.token0.symbol} from ${backwardEdgeExists.rawWeight} to ${backwardEdge.rawWeight}`)
          g.deleteEdge(backwardEdgeExists);
          g.addEdge(backwardEdge);
        }
      } else {
        g.addEdge(backwardEdge);
      }
    }
  }
}

/**
 * Calculates all arbitrage cycles in given graph
 * @param {*} g - graph
 * @returns array of cycles & negative cycle value
 */
async function calcArbitrage(g) {
  let arbitrageData = [];
  let uniqueCycle = {};
  g.getAllVertices().forEach((vertex) => {
    let result = bellmanFord(g, vertex);
    let cyclePaths = result.cyclePaths;
    for (var cycle of cyclePaths) {
      let cycleString = cycle.join('');
      let cycleWeight = calculatePathWeight(g, cycle);
      if (!uniqueCycle[cycleString]) {
        uniqueCycle[cycleString] = true;
        arbitrageData.push({ cycle: cycle, cycleWeight: cycleWeight });
      }
    }
  });
  return arbitrageData;
}

async function main(numberTokens: number = 5, DEXs: Set<DEX>, debug: boolean = false) {
  let g: Graph = new Graph(true);

  // Add vertices to graph
  let defaultDex: DEX = (DEXs.size === 1 && DEXs.has(DEX.Sushiswap)) ? DEX.Sushiswap :
                        (DEXs.size === 1 && DEXs.has(DEX.UniswapV3)) ? DEX.UniswapV3 : DEX.UniswapV3;
  let tokenIds = await fetchTokens(numberTokens, 0, defaultDex);
  tokenIds.forEach(element => {
    g.addVertex(new GraphVertex(element))
  });

  // Check which DEXs to arb
  if (DEXs.has(DEX.UniswapV3)) {
    let uniPools: Set<string> = await fetchUniswapPools(tokenIds);
    await fetchPoolPrices(g, uniPools, DEX.UniswapV3, debug);
  }
  if (DEXs.has(DEX.Sushiswap)) {
    let sushiPools: Set<string> = await fetchSushiswapPools(tokenIds);
    await fetchPoolPrices(g, sushiPools, DEX.Sushiswap, debug);
  }

  let arbitrageData = await calcArbitrage(g);
  console.log(`Cycles:`, arbitrageData);
  console.log(`There were ${arbitrageData.length} arbitrage cycles detected.`);

  // printGraphEdges(g);
}

// debugging stuff
function printGraphEdges(g) {
  let edges = g.getAllEdges();
  for (let edge of edges) {
    console.log(`${edge.startVertex} -> ${edge.endVertex} | ${edge.rawWeight} | DEX: ${edge.metadata.dex}`);
  }
}

// Exports
export {
  main
}