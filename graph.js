
/** GRAPH
 *  {
 *      token_id: [
 *          { pool_id }
 *      ]
 *  }
 * 
 * PRICES
 * dict[token0][token1] = price
 */

/**
 * Bi-directional Graph class
 */
class Graph {
    
    constructor() {
        this.adjList = new Map();
        this.edgeWeights = new Map();
    }

    setEdgeWeight(node1, node2, weight) {
        if (!this.edgeWeights.has(node1)) this.edgeWeights.set(node1, new Map());
        this.edgeWeights.get(node1).set(node2, weight);
    }

    addNode(id) {
        this.adjList.set(id, new Set());
    }

    addEdge(id, dest) {
        this.adjList.get(id).add(dest);
        this.adjList.get(dest).add(id);
    }

    addEdges(id, dests) {
        for(dest of dests) {
            this.adjList.get(id).add(dest);
            this.adjList.get(dest).add(id);
        }
    }
}

export default Graph;