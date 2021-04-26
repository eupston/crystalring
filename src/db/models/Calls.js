const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  answer: {
    type: Object,
    unique: true,
  },
  offer: {
    type: Object,
    unique: true,
  },
  answerCandidates: {
    type: Array,
    unique: true,
  },
  offerCandidates: {
    type: Array,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Call', CallSchema);
