export default class LinkedListNode {

    value: any;
    next: LinkedListNode;

    constructor(value: any, next: LinkedListNode = null) {
      this.value = value;
      this.next = next;
    }
  
    toString(callback) {
      return callback ? callback(this.value) : `${this.value}`;
    }
  }