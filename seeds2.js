var mongoose = require("mongoose");
var Recommendation = require("./models/recommendation");

var dataRecs = [
    {
        author: { 
            username: "chocapec",
            country: "Chile",
            language: "Spanish"
        },
        type: "video",
        name: "Deep Field: The Impossible Magnitude of our Universe",
        recommendationDate: "192021III",
        url: "https://www.youtube.com/watch?v=yDiD8F9ItX0",
        description:"I was lucky enough to meet Mike outside the Guildhall in Portsmouth on his 5 miles out tour. I asked a bouncer for his autograph and he said he will see what he can do. five minutes later, Mike appears so I ask him to sign my album cover with which he said, 'can you hold my guitar whilst I sign it for you ?' I put his guitar around my neck whilst he signed. he then said 'thank you for coming to see me' and gave me his plectrum before going back inside. I was stunned and I was the only person there as it was only around 5 o'clock.......A real gentleman and artist. Thank you mike and if you ever read this, i'm forever grateful that you took the time to say hello to me......",
        status: "future",
        youtubeID: "yDiD8F9ItX0",
        duration: 1787000,
    },
    {
        author: { 
            username: "chocapec",
            country: "Chile",
            language: "Spanish"
        },
        type: "video",
        name: "Journey Through The Universe - HD Documentary",
        recommendationDate: "042020IX",
        url: "https://www.youtube.com/watch?v=mO3Q4bRQZ3k",
        description:"I’m only commenting so that I can be connected to this album in as many ways as possible",
        status: "future",
        youtubeID: "mO3Q4bRQZ3k",
        duration: 5290000,
    },
];

function seedDB(){
    Recommendation.deleteMany({}, function(err){
        if(err){
            console.log(err);
        } 
        console.log("removed recommendations");
        let i = 0;
        dataRecs.forEach(function(seed){
            Recommendation.create(seed, function(err, recommendation){
                if(err){
                    console.log(err);
                } 
            });
            i++
        }); 
        console.log("added "+ i + " recommendations to DB")
    });
}

module.exports = seedDB;