import Graph from "./graph_library/Graph";
import GraphVertex from "./graph_library/GraphVertex";

/**
 * @param {Graph} graph
 * @param {GraphVertex} startVertex
 * @return {{distances, previousVertices}}
 * 
 * https://github.com/trekhleb/javascript-algorithms/blob/master/src/algorithms/graph/bellman-ford/bellmanFord.js
 */
export default function bellmanFord(graph: Graph, startVertex: GraphVertex) {
    const distances = {};
    const previousVertices = {};
  
    // Init all distances with infinity assuming that currently we can't reach
    // any of the vertices except start one.
    distances[startVertex.getKey()] = 0;
    graph.getAllVertices().forEach((vertex) => {
      previousVertices[vertex.getKey()] = null;
      if (vertex.getKey() !== startVertex.getKey()) {
        distances[vertex.getKey()] = Infinity;
      }
    });
  
    // (|V| - 1) iterations
    for (let iter = 0; iter < (graph.getAllVertices().length - 1); iter += 1) {
      let edges = graph.getAllEdges();
      for (let edge of edges) {
        let from = edge.startVertex;
        let to = edge.endVertex;
        if (distances[from.value] + edge.weight < distances[to.value]) {
          distances[to.value] = distances[from.value] + edge.weight;
          previousVertices[to.value] = from;
        }
      }
    }

    // Detect negative cycle
    // for (let iter = 0; iter < (graph.getAllVertices().length - 1); iter += 1) {
    let edges = graph.getAllEdges();
    let cyclePaths = [];
    let foundCycles = {};
    for (let edge of edges) {
      let cyclePath = [];
      let from = edge.startVertex;
      let to = edge.endVertex;
      if (distances[from.value] + edge.weight < distances[to.value]) {
        // Logging
        // console.log(`NEGATIVE EDGE WEIGHT CYCLE DETECTED`)
        // console.log(`from: ${from.value}`)
        // console.log(`to: ${to.value}`)
          
        // Arbitrage value
        let curr = from;
        let index = 1;
        cyclePath[to.value] = index++;

        while (!cyclePath[curr.value]) {
          cyclePath[curr.value] = index++;
          curr = previousVertices[curr.getKey()];
        }
        cyclePath[curr.value+'_'] = index;
        // console.log(`found arb cycle`, cyclePath);

        // Remove non-cycle edges
        let path = [];
        for (let key of Object.keys(cyclePath)) { path.push(key.replace('_','')); }
        path.reverse();
        for (var i = 0; i < path.length; i++) {
          if (i !== 0 && path[0] === path[i]) {
            path = path.slice(0, i+1);
            break;
          }
        }
        // console.log(`stripped cycle`, path);

        // Ensure uniqueness of cycles
        let uniquePath = path.join('');
        if (!foundCycles[uniquePath]) {
          cyclePaths.push(path);
          foundCycles[uniquePath] = true;
        }
      }
    }
  
    return {
      distances,
      previousVertices,
      cyclePaths
    };
  }
