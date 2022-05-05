import GraphVertex from "./GraphVertex"

// https://github.com/trekhleb/javascript-algorithms/blob/master/src/data-structures/graph/GraphEdge.js
export default class GraphEdge {

    startVertex: GraphVertex
    endVertex: GraphVertex
    weight: number = 0
    rawWeight: number = 0
    metadata = {}

    constructor(startVertex, endVertex, weight = 0, rawWeight = 0, metadata) {
      this.startVertex = startVertex;
      this.endVertex = endVertex;
      this.weight = weight;
      this.rawWeight = rawWeight;
      this.metadata = metadata;
    }
  
    /**
     * @return {string}
     */
    getKey() {
      const startVertexKey = this.startVertex.getKey();
      const endVertexKey = this.endVertex.getKey();
  
      return `${startVertexKey}_${endVertexKey}`;
    }
  
    /**
     * @return {GraphEdge}
     */
    reverse() {
      const tmp = this.startVertex;
      this.startVertex = this.endVertex;
      this.endVertex = tmp;
  
      return this;
    }
  
    /**
     * @return {string}
     */
    toString() {
      return this.getKey();
    }
  }