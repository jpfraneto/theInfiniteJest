const axios = require("axios");
const moment = require("moment");
let express = require("express");
let router = express.Router();
let Recommendation = require("../models/recommendation");
let Cycle = require("../models/cycle");
let chiita = require("../middleware/chiita");
let theSource = require("../middleware/theSource");

let today = new Date();
// Root Route
router.get("/", (req, res) => {
    Recommendation.findOne({status:"present"}).exec()
    .then((presentRecommendation) => {
        let now = (new Date).getTime();
        if (presentRecommendation) {
            let elapsedTime = now - presentRecommendation.startingRecommendationTimestamp;
            let elapsedSeconds = Math.floor(elapsedTime/1000);
            res.render("eternity", {
                youtubeID : presentRecommendation.youtubeID,
                elapsedSeconds : elapsedSeconds, 
                presentRecommendation: presentRecommendation,
            })
        } else {
            console.log("There was not a recommendation in the present. The check system function will run now");
            theSource.checkSystem();
            res.render("error");
        }
    })
})

//CREATE - add new recommendation to db
router.post("/", function(req,res){
    let newRecommendation = new Recommendation();
    let author;
    newRecommendation.type = req.body.recommendationType;
    newRecommendation.author = {
        name: req.body.name,
        country: req.body.country,
        email: req.body.email,
        discourseUsername: req.body.username,
    }
    newRecommendation.description = req.body.description;
    newRecommendation.language = req.body.language;
    newRecommendation.status = "future";
    newRecommendation.type = "video";
    newRecommendation.reviewed = false;
    newRecommendation.recommendationDate = new Date();
    let url, duration, name;
    newRecommendation.youtubeID = req.body.newRecommendationID;
    let apiKey = process.env.YOUTUBE_APIKEY;
    let getRequestURL = "https://www.googleapis.com/youtube/v3/videos?id="+newRecommendation.youtubeID+"&key="+apiKey+"&fields=items(id,snippet(title),statistics,%20contentDetails(duration))&part=snippet,statistics,%20contentDetails";
    axios.get(getRequestURL)
    .then(function(response){
        if (response.data.items.length > 0){
            let durationISO = response.data.items[0].contentDetails.duration;
            newRecommendation.name = response.data.items[0].snippet.title;
            newRecommendation.duration = (moment.duration(durationISO, moment.ISO_8601)).asMilliseconds();
            newRecommendation.save(()=>{
                console.log("A new recommendation was saved by " + newRecommendation.author.name + ", with the following youtube ID: " + newRecommendation.youtubeID)
                console.log(newRecommendation);
                res.json({answer:"The recommendation " + newRecommendation.name + " was added successfully to the future! Thanks "+ newRecommendation.author.name +" for your support." })
            });
        } else {
            res.json({answer: "There was an error retrieving the recommendation from youtube. Please try again later, sorry for all the trouble that this means"})
        }
    })
    .catch(()=>{
        res.json({answer: "There was an error retrieving the recommendation from youtube. Please try again later, sorry for all the trouble that this means"})
    });
});

router.post("/nextRecommendationQuery", (req,res) => {
    let answer = {};
    if (req.body.systemStatus === "present") {
        Recommendation.findOne({status:"present"}).exec()
        .then((nextPresentRecommendation)=>{
            answer.recommendation = nextPresentRecommendation;
            let elapsedTime = (new Date).getTime() - nextPresentRecommendation.startingRecommendationTimestamp;
            answer.elapsedSeconds = Math.floor(elapsedTime/1000);
            res.json(answer);
        })
    } else {
        Recommendation.findOne({youtubeID:req.body.videoID}).exec()
        .then((queriedVideo) => { 
            Recommendation.findOne({index: queriedVideo.index+1}).exec()
            .then((nextVideo)=>{
                if (nextVideo) {
                    answer.recommendation = nextVideo;
                    answer.elapsedSeconds = 0;
                    res.json(answer);
                }
            })
        })   
    }
})

router.get("/randomRecommendation", (req, res) => {
    Recommendation.find({status:"past"}).exec()
    .then((allPastRecommendations) =>{
        let randomIndex = Math.floor(Math.random()*allPastRecommendations.length);
        res.json({recommendation:allPastRecommendations[randomIndex]});
    })
})

router.get("/pastTimeTravel", (req, res) => { 
    let answer = {};
    let pastRecommendations = [];
    Recommendation.find({status:"past"}).exec()
    .then((allPastRecommendations) => {
        Cycle.find({}).exec()
        .then((foundCycles)=>{
            let openedCycle = foundCycles[foundCycles.length-1]
            answer.activeCycleStartingTimestamp = openedCycle.startingTimestamp;
            if(allPastRecommendations) {
                answer.pastRecommendations = allPastRecommendations;
                answer.message = "There are " + allPastRecommendations.length + " recommendations in the past and this one was chosen from there."
            } else {
                answer.pastRecommendations = [];
                answer.message = "So bad, there are no recommendations in the past."
            }
            res.json(answer);
        })
    })
})

router.post("/getRecommendationInformation", (req, res) => {
    let answer = {};
    Recommendation.findOne({youtubeID:req.body.recommendationID}).exec()
    .then((queriedRecommendation)=>{
        answer.recommendation = queriedRecommendation;
        res.json(answer);
    })
})

router.get("/getFutureRecommendations", (req, res) => { 
    let response = {futureRecommendations : []};
    let totalDuration = 0;
    Recommendation.find({status:"future"}).exec()
    .then((futureRecommendations)=>{
        futureRecommendations.forEach((recommendation)=>{
            totalDuration += recommendation.duration;
            response.futureRecommendations.push(recommendation.youtubeID);
        })
        response.futureDuration = totalDuration;
        res.json(response);
    })
})

router.post("/checkIfRepeated", (req, res) => {
    let videoID = req.body.videoID
    let response = {
        isRepeated : false,
    }
    Recommendation.findOne({youtubeID:req.body.videoID})
    .then((repeatedRecommendation)=>{
        if (repeatedRecommendation) {
            response.isRepeated = true;
            response.author = repeatedRecommendation.author
        }
        res.json(response)
    })
    .catch(err => console.log("There was an error checking if the video is repeated!"))
});


router.get("/error", (req, res)=>{
    res.render("error");
})

router.get("/:anything", function(req, res) {
    res.render("nonExisting", {today: today});
})


module.exports = router;