// client/app/chat/utils/friendGraph.js

/**
 * DSA GRAPH IMPLEMENTATION
 * Representation: Adjacency List (Map of userId -> Set of friendIds)
 */
export class FriendGraph {
  constructor() {
    this.adjacencyList = new Map();
    this.userMap = new Map(); // Stores userId -> username for quick lookup
  }

  // Add a user node to the graph
  addUser(id, username) {
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, new Set());
      this.userMap.set(id, username);
    }
  }

  // Add an undirected edge (Friendship)
  addEdge(user1, user2) {
    if (this.adjacencyList.has(user1) && this.adjacencyList.has(user2)) {
      this.adjacencyList.get(user1).add(user2);
      this.adjacencyList.get(user2).add(user1);
    }
  }

  /**
   * DSA ALGORITHM: BFS/Distance-2 Search
   * Goal: Find users who are connected to my friends but are NOT my friends.
   */
  getRecommendations(myId) {
    if (!this.adjacencyList.has(myId)) return [];

    const myFriends = this.adjacencyList.get(myId);
    const recommendations = new Map(); // use map to count mutual friends

    // Traverse to distance 1 (My Friends)
    myFriends.forEach(friendId => {
      const friendsOfFriend = this.adjacencyList.get(friendId);

      // Traverse to distance 2 (Their Friends)
      friendsOfFriend.forEach(fofId => {
        // Condition: FOF is not ME and FOF is not already my friend
        if (fofId !== myId && !myFriends.has(fofId)) {
          // Count how many mutual friends we have
          recommendations.set(fofId, (recommendations.get(fofId) || 0) + 1);
        }
      });
    });

    // Convert to readable array sorted by mutual friend count
    return Array.from(recommendations.entries())
      .map(([id, mutualCount]) => ({
        _id: id,
        username: this.userMap.get(id),
        mutualCount
      }))
      .sort((a, b) => b.mutualCount - a.mutualCount);
  }
}