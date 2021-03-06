var mongoose = require("mongoose");
var Recommendation = require("./models/recommendation");

var dataRecs = [
    {
        author: { 
            name: "Jorge Pablo Franetovic",
            country: "Chile",
            language: "Spanish"
        },
        type: "video",
        name: "Historia De Un Oso",
        recommendationDate: "062021III",
        url: "https://www.youtube.com/watch?v=7A2HaJjYfOA",
        description:"De Chile pa'l mundo",
        status: "future",
        youtubeID: "7A2HaJjYfOA",
        duration: 618000,
    },
    {
        author: { 
            name: "Jorge Pablo Franetovic",
            country: "Chile",
            language: "Spanish"
        },
        type: "video",
        name: "Nada es lo que parece",
        recommendationDate: "062021III",
        url: "https://www.youtube.com/watch?v=dwWqMgddes4",
        description:"Vendiendo Humo",
        status: "future",
        youtubeID: "dwWqMgddes4",
        duration: 386000,
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