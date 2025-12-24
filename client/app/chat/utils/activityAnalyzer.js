// client/app/chat/utils/activityAnalyzer.js

class ActivityNode {
  constructor(hour) {
    this.hour = hour; // Key (0-23)
    this.count = 1;   // Value (Number of messages)
    this.left = null;
    this.right = null;
  }
}

export class ActivityBST {
  constructor() {
    this.root = null;
  }

  // DSA: Recursive Insertion
  insert(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (!this.root) {
      this.root = new ActivityNode(hour);
    } else {
      this._insertRecursive(this.root, hour);
    }
  }

  _insertRecursive(node, hour) {
    if (hour === node.hour) {
      node.count++; // Increment if slot already exists
    } else if (hour < node.hour) {
      if (!node.left) node.left = new ActivityNode(hour);
      else this._insertRecursive(node.left, hour);
    } else {
      if (!node.right) node.right = new ActivityNode(hour);
      else this._insertRecursive(node.right, hour);
    }
  }

  // DSA: Traversal to find the peak (Highest count)
  getPeakHour() {
    let peak = { hour: 0, count: 0 };
    this._findMax(this.root, peak);
    return peak;
  }

  _findMax(node, peak) {
    if (!node) return;
    
    // In-order Traversal
    this._findMax(node.left, peak);
    
    if (node.count > peak.count) {
      peak.hour = node.hour;
      peak.count = node.count;
    }
    
    this._findMax(node.right, peak);
  }
}

// Function to process all messages
export const getActivityReport = (messages) => {
  if (messages.length === 0) return null;

  const bst = new ActivityBST();
  messages.forEach(msg => bst.insert(msg.timestamp));

  const peak = bst.getPeakHour();
  
  // Format hour for display (e.g., 14 -> "02:00 PM")
  const formatHour = (h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:00 ${suffix}`;
  };

  return {
    peakTime: formatHour(peak.hour),
    messageCount: peak.count,
    totalAnalyzed: messages.length,
    percentage: ((peak.count / messages.length) * 100).toFixed(1)
  };
};