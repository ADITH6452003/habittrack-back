const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const userDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tasks: [{ type: String }],
  checkedTasks: { type: Map, of: Boolean },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const UserData = mongoose.model('UserData', userDataSchema);

module.exports = { User, UserData };