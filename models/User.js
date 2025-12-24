const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    minlength: [4, "Username must be at least 4 characters"],
    validate: {
      validator: function (v) {
        // Regex: Alphanumeric only, must contain at least 1 number
        return /^(?=.*[0-9])[a-zA-Z0-9]+$/.test(v);
      },
      message: props => `${props.value} is not a valid username! Must contain a number and no special characters.`
    }
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple users to have 'null' email
    trim: true,
    lowercase: true
  },
  // CHANGED: 'password' -> 'passwordHash' to match your auth.js logic
  passwordHash: {
    type: String,
    required: true,
    minlength: [8, "Password must be at least 8 characters"]
  },
  // ADDED: Friends Graph (Adjacency List) - Crucial for your DSA project
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);