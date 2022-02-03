/**
 * @param {Graph} graph
 * @param {GraphVertex} startVertex
 * @return {{distances, previousVertices}}
 * 
 * https://github.com/trekhleb/javascript-algorithms/blob/master/src/algorithms/graph/bellman-ford/bellmanFord.js
 */
export default function bellmanFord(graph, startVertex) {
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
  
    // We need (|V| - 1) iterations.
    // for (let iteration = 0; iteration < (graph.getAllVertices().length - 1); iteration += 1) {
    //   // During each iteration go through all vertices.
    //   Object.keys(distances).forEach((vertexKey) => {
    //     const vertex = graph.getVertexByKey(vertexKey);
  
    //     // Go through all vertex edges.
    //     graph.getNeighbors(vertex).forEach((neighbor) => {
    //       const edge = graph.findEdge(vertex, neighbor);
    //       // Find out if the distance to the neighbor is shorter in this iteration
    //       // then in previous one.
    //       const distanceToVertex = distances[vertex.getKey()];
    //       const distanceToNeighbor = distanceToVertex + edge.weight;
    //       if (distanceToNeighbor < distances[neighbor.getKey()]) {
    //         distances[neighbor.getKey()] = distanceToNeighbor;
    //         previousVertices[neighbor.getKey()] = vertex;
    //       }
    //     });
    //   });
    // }
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
      for (let edge of edges) {
        let from = edge.startVertex;
        let to = edge.endVertex;
        // let distNeighbor = (distances[from.value] + edge.weight)
        // console.log(`relaxed dist (iter=${iter}): ` + distNeighbor);
        if (distances[from.value] + edge.weight < distances[to.value]) {
          console.log(`NEGATIVE EDGE WEIGHT CYCLE DETECTED`)
          console.log(edge.getKey())
          // distances[to.value] = -Infinity
          // TODO: go thru the previousVertices to find cycle
          let curr = from;
          let index = 1;

          let cycleVertices = {};

          while (!cycleVertices[curr.value]) {
            cycleVertices[curr.value] = index++;
            curr = previousVertices[to];
          }
          cycleVertices[curr.value+'_'] = index;

          console.log(cycleVertices)
          break;
        }
      }
    // }
  
    return {
      distances,
      previousVertices,
    };
  }
