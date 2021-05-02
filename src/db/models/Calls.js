const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  answer: {
    type: Object,
  },
  offer: {
    type: Object,
  },
  answerCandidates: {
    type: Array,
  },
  offerCandidates: {
    type: Array,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Call', CallSchema);
