// ============================================
// 2. app/chat/utils/botEngine.js (FIXED FOR NEXT.JS)
// ============================================

class TrieNode {
  constructor() {
    this.children = new Map();
    this.knowledgeKeys = [];
    this.weight = 0;
    this.isEndOfWord = false;
  }
}

export class EonBotEngine {
  constructor(knowledgeBase) {
    this.root = new TrieNode();
    this.knowledgeBase = knowledgeBase;
    this.conversationHistory = [];
    this.maxHistorySize = 10;
    
    this.buildTrie();
    this.keywordStats = this.analyzeKeywords();
  }

  buildTrie() {
    Object.keys(this.knowledgeBase).forEach(key => {
      const node = this.knowledgeBase[key];
      
      node.keywords.forEach((word, index) => {
        const normalizedWord = word.toLowerCase().trim();
        const weight = node.keywords.length - index;
        this.insertKeyword(normalizedWord, key, weight);
      });
    });
  }

  insertKeyword(word, knowledgeKey, weight) {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }
    
    node.isEndOfWord = true;
    if (!node.knowledgeKeys.includes(knowledgeKey)) {
      node.knowledgeKeys.push(knowledgeKey);
    }
    node.weight = Math.max(node.weight, weight);
  }

  searchKeyword(word) {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char);
    }
    
    return node.isEndOfWord ? node : null;
  }

  autocomplete(prefix) {
    const results = [];
    const normalizedPrefix = prefix.toLowerCase().trim();
    
    let node = this.root;
    for (const char of normalizedPrefix) {
      if (!node.children.has(char)) {
        return results;
      }
      node = node.children.get(char);
    }
    
    this.collectWords(node, normalizedPrefix, results);
    return results.sort((a, b) => b.weight - a.weight);
  }

  collectWords(node, prefix, results) {
    if (node.isEndOfWord) {
      results.push({
        word: prefix,
        keys: node.knowledgeKeys,
        weight: node.weight
      });
    }
    
    for (const [char, childNode] of node.children.entries()) {
      this.collectWords(childNode, prefix + char, results);
    }
  }

  fuzzySearch(input, maxDistance = 2) {
    const normalizedInput = input.toLowerCase().trim();
    const matches = [];
    
    Object.keys(this.knowledgeBase).forEach(key => {
      this.knowledgeBase[key].keywords.forEach(keyword => {
        const distance = this.levenshteinDistance(normalizedInput, keyword.toLowerCase());
        
        if (distance <= maxDistance) {
          matches.push({
            keyword,
            key,
            distance,
            similarity: 1 - (distance / Math.max(normalizedInput.length, keyword.length))
          });
        }
      });
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],
            dp[i][j - 1],
            dp[i - 1][j - 1]
          );
        }
      }
    }
    
    return dp[m][n];
  }

  analyzeKeywords() {
    const stats = {
      totalKeywords: 0,
      uniqueWords: new Set(),
      topicDistribution: {},
      avgKeywordsPerTopic: 0
    };
    
    Object.keys(this.knowledgeBase).forEach(key => {
      const keywords = this.knowledgeBase[key].keywords;
      stats.totalKeywords += keywords.length;
      
      keywords.forEach(word => {
        stats.uniqueWords.add(word.toLowerCase());
      });
      
      const topic = keywords[0].toLowerCase();
      stats.topicDistribution[topic] = (stats.topicDistribution[topic] || 0) + 1;
    });
    
    stats.avgKeywordsPerTopic = stats.totalKeywords / Object.keys(this.knowledgeBase).length;
    stats.uniqueWords = stats.uniqueWords.size;
    
    return stats;
  }

  getResponse(input) {
    if (!input || typeof input !== 'string') {
      return this.getDefaultResponse();
    }
    
    const normalizedInput = input.toLowerCase().trim();
    const words = normalizedInput
      .replace(/[?.,!;:]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    const matches = [];
    
    // Exact matching
    for (const word of words) {
      const node = this.searchKeyword(word);
      if (node && node.knowledgeKeys.length > 0) {
        node.knowledgeKeys.forEach(key => {
          matches.push({
            key,
            word,
            score: node.weight * 10,
            method: 'exact'
          });
        });
      }
    }
    
    // Prefix matching
    if (matches.length === 0) {
      for (const word of words) {
        if (word.length >= 3) {
          const autocompleteResults = this.autocomplete(word);
          autocompleteResults.slice(0, 3).forEach(result => {
            result.keys.forEach(key => {
              matches.push({
                key,
                word: result.word,
                score: result.weight * 5,
                method: 'prefix'
              });
            });
          });
        }
      }
    }
    
    // Fuzzy matching
    if (matches.length === 0 && words.length > 0) {
      const longestWord = words.reduce((a, b) => a.length > b.length ? a : b);
      
      if (longestWord.length >= 4) {
        const fuzzyResults = this.fuzzySearch(longestWord, 2);
        fuzzyResults.slice(0, 3).forEach(result => {
          matches.push({
            key: result.key,
            word: result.keyword,
            score: result.similarity * 3,
            method: 'fuzzy'
          });
        });
      }
    }
    
    if (matches.length > 0) {
      const bestMatch = this.selectBestMatch(matches, normalizedInput);
      this.addToHistory(normalizedInput, bestMatch.key);
      return this.knowledgeBase[bestMatch.key];
    }
    
    return this.getSmartFallback(words);
  }

  selectBestMatch(matches, originalInput) {
    const scoreMap = new Map();
    
    matches.forEach(match => {
      const currentScore = scoreMap.get(match.key) || 0;
      scoreMap.set(match.key, currentScore + match.score);
    });
    
    scoreMap.forEach((score, key) => {
      const recentlyMentioned = this.conversationHistory
        .slice(-3)
        .some(entry => entry.key === key);
      
      if (recentlyMentioned) {
        scoreMap.set(key, score * 1.5);
      }
    });
    
    let bestKey = null;
    let bestScore = -1;
    
    scoreMap.forEach((score, key) => {
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });
    
    return {
      key: bestKey,
      score: bestScore,
      matchCount: matches.filter(m => m.key === bestKey).length
    };
  }

  getSmartFallback(words) {
    const suggestions = [];
    
    if (words.some(w => ['fast', 'speed', 'performance', 'slow'].includes(w))) {
      suggestions.push("Performance Analysis", "Optimization Techniques");
    } else if (words.some(w => ['tree', 'node', 'leaf', 'root'].includes(w))) {
      suggestions.push("Tree Structures", "BST Deep Dive");
    } else if (words.some(w => ['graph', 'network', 'connection'].includes(w))) {
      suggestions.push("Graph & HashMap", "BFS Algorithm");
    } else {
      suggestions.push("Data Structures Overview", "Algorithms Overview", "Back to Start");
    }
    
    return {
      text: `🤔 I couldn't find an exact match in my DSA knowledge base.\n\n**What I understood:**\n• Input: "${words.join(', ')}"\n\n**Suggestions:**\nTry asking about specific topics like:\n• "How does BFS work?"\n• "Tell me about Stacks"\n• "What's the complexity of HashMaps?"\n• "Explain Trie data structure"\n\n**Statistics:**\n• Total topics: ${Object.keys(this.knowledgeBase).length}\n• Keywords indexed: ${this.keywordStats.totalKeywords}\n• Unique terms: ${this.keywordStats.uniqueWords}`,
      options: suggestions
    };
  }

  getDefaultResponse() {
    return this.knowledgeBase['start'];
  }

  addToHistory(input, key) {
    this.conversationHistory.push({
      input,
      key,
      timestamp: Date.now()
    });
    
    if (this.conversationHistory.length > this.maxHistorySize) {
      this.conversationHistory.shift();
    }
  }

  getMetrics() {
    const trieSize = this.calculateTrieSize(this.root);
    
    return {
      trieNodes: trieSize,
      knowledgeNodes: Object.keys(this.knowledgeBase).length,
      totalKeywords: this.keywordStats.totalKeywords,
      uniqueKeywords: this.keywordStats.uniqueWords,
      avgKeywordsPerNode: this.keywordStats.avgKeywordsPerTopic.toFixed(2),
      memoryEstimate: `~${((trieSize * 48 + this.keywordStats.totalKeywords * 20) / 1024).toFixed(2)} KB`,
      conversationHistorySize: this.conversationHistory.length
    };
  }

  calculateTrieSize(node) {
    let size = 1;
    for (const child of node.children.values()) {
      size += this.calculateTrieSize(child);
    }
    return size;
  }
}

export const createBotEngine = (knowledgeBase) => {
  return new EonBotEngine(knowledgeBase);
};