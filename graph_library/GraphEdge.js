// https://github.com/trekhleb/javascript-algorithms/blob/master/src/data-structures/graph/GraphEdge.js
export default class GraphEdge {
    /**
     * @param {GraphVertex} startVertex
     * @param {GraphVertex} endVertex
     * @param {number} [weight=0]
     * @param {number} [rawWeight=0]
     */
    constructor(startVertex, endVertex, weight = 0, rawWeight = 0) {
      this.startVertex = startVertex;
      this.endVertex = endVertex;
      this.weight = weight;
      this.rawWeight = rawWeight;
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