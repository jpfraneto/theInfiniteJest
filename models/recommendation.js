var mongoose = require("mongoose");

var recommendationSchema = new mongoose.Schema({
    index : Number,
    author: {
        name: String,
        username: String,
        country: String,
        language: String,
        email: String
    },
    name: String,
    reviewed: Boolean,
    type: String,
    recommendationDate: {
        type: String,
        default: Date.now.toString(),
    },
    url: String,
    youtubeID : String,
    description:String,
    language : String,
    status: String,
    duration: Number,
    startingRecommendationTimestamp: Number,
    endingRecommendationTimestamp: Number,
    timestampDifference: Number
});

module.exports = mongoose.model("Recommendation", recommendationSchema);