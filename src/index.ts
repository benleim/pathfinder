import { request } from 'graphql-request'
const UNISWAP = require('./dex_queries/uniswap');
import * as SUSHISWAP from './dex_queries/sushiswap';
import Graph from './graph_library/Graph';
import GraphVertex from './graph_library/GraphVertex';
import GraphEdge from './graph_library/GraphEdge';
import bellmanFord from './bellman-ford';

// POOL - MINIMUM TOTAL VALUE LOCKED (USD)
const MIN_TVL = 50_000;

// Fetch most active tokens 
async function fetchTokens(first, skip = 0) {
  let mostActiveTokens = await request(UNISWAP.ENDPOINT, UNISWAP.HIGHEST_VOLUME_TOKENS(first));
  console.log(mostActiveTokens)

  return mostActiveTokens.tokens.map((t) => { return t.id });
}

function calculatePathWeight(g, cycle) {
  let cycleWeight = 1.0;
  console.log(cycle.length);
  for (let index = 0; index < cycle.length - 1; index++) {
    let indexNext = index + 1;
    console.log(`new indices: ${index} ${indexNext}`);
    let startVertex = g.getVertexByKey(cycle[index]);
    let endVertex = g.getVertexByKey(cycle[indexNext]);
    let edge = g.findEdge(startVertex, endVertex);

    console.log(`Start: ${startVertex.value} | End: ${endVertex.value}`)
    console.log(`Adj edge weight: ${edge.weight} | Raw edge weight: ${edge.rawWeight} | ${edge.getKey()}`);
    console.log(`DEX: ${edge.metadata.dex}`)
    console.log(cycleWeight * edge.rawWeight)

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
async function fetchPoolPrices(g: Graph, pools: Set<string>, dex) {
  console.log(pools);
  for (var pool of Array.from(pools.values())) {
    console.log(dex, pool)
    let DEX_ENDPOINT =  (dex === "UNISWAP_V3") ? UNISWAP.ENDPOINT :
                        (dex === "SUSHISWAP") ? SUSHISWAP.ENDPOINT : "";
    let DEX_QUERY =     (dex === "UNISWAP_V3") ? UNISWAP.fetch_pool(pool) :
                        (dex === "SUSHISWAP") ? SUSHISWAP.PAIR(pool) : "";;

    let poolRequest = await request(DEX_ENDPOINT, DEX_QUERY);
    let poolData =  (dex === "UNISWAP_V3") ? poolRequest.pool :
                    (dex === "SUSHISWAP") ? poolRequest.pair : [];
    console.log(poolData);

    // Some whitelisted pools are inactive for whatever reason
    // Pools exist with tiny TLV values
    let reserves =  (dex === "UNISWAP_V3") ? Number(poolData.totalValueLockedUSD) : 
                    (dex === "SUSHISWAP") ? Number(poolData.reserveUSD) : 0;
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
          console.log(`replacing: ${poolData.token0.symbol}->${poolData.token1.symbol} from ${forwardEdgeExists.rawWeight} to ${forwardEdge.rawWeight}`)
          g.deleteEdge(forwardEdgeExists);
          g.addEdge(forwardEdge);
        }
      } else {
        g.addEdge(forwardEdge);
      }

      if (backwardEdgeExists) {
        if (backwardEdgeExists.rawWeight < backwardEdge.rawWeight) {
          console.log(`replacing: ${poolData.token1.symbol}->${poolData.token0.symbol} from ${backwardEdgeExists.rawWeight} to ${backwardEdge.rawWeight}`)
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

async function main() {
  let TOKENS_NUMBER = fetchParameters();
  let g: Graph = new Graph(true);

  // Add vertices to graph
  let tokenIds = await fetchTokens(TOKENS_NUMBER);
  tokenIds.forEach(element => {
    g.addVertex(new GraphVertex(element))
  });

  let uniPools: Set<string> = await fetchUniswapPools(tokenIds);
  let sushiPools: Set<string> = await fetchSushiswapPools(tokenIds);

  await fetchPoolPrices(g, uniPools, "UNISWAP_V3");
  await fetchPoolPrices(g, sushiPools, "SUSHISWAP");

  console.log(g);
  let arbitrageData = await calcArbitrage(g);
  console.log(arbitrageData);
  console.log(arbitrageData.length);

  printGraphEdges(g);
}

// debugging stuff
function printGraphEdges(g) {
  let edges = g.getAllEdges();
  for (let edge of edges) {
    console.log(`${edge.startVertex} -> ${edge.endVertex} | ${edge.rawWeight} | DEX: ${edge.metadata.dex}`);
  }
}

function fetchParameters() {
  return (process.argv.length == 3) ? process.argv[2] : 5; // default to 5 in absence
}

main().catch(error => {
  console.log(error);
});