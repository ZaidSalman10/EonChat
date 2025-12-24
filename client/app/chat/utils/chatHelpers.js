// client/app/chat/utils/chatHelpers.js

// --- REQUEST STACK IMPLEMENTATION ---
export class RequestStack {
  constructor(initialItems = []) {
    this.items = [...initialItems];
  }
  push(element) { this.items.push(element); }
  pop() {
    if (this.isEmpty()) return "Underflow";
    return this.items.pop();
  }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  getStackView() { return [...this.items].reverse(); }
}

// --- SAFE ID HELPER ---
export const getSafeId = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data._id) return data._id.toString();
  if (data.id) return data.id.toString();
  return null;
};


// --- NOTIFICATION STACK IMPLEMENTATION ---

export class NotificationStack {
  constructor(initialItems = []) {
    this.items = [...initialItems];
  }
  push(element) { this.items.push(element); }
  pop() { return this.items.pop(); }
  isEmpty() { return this.items.length === 0; }
  getStackView() { return [...this.items].reverse(); }
}

