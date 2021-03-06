const axios = require("axios");
const moment = require("moment");
const Recommendation = require("../models/recommendation");
const Cycle = require("../models/cycle");
let seedDB        = require("../seeds2");
let theSource = {};

theSource.sendRecommendationToPast = () => {
    // console.log("inside the sendRecommendationToPast function")
    Recommendation.findOne({status:'present'})
    .exec()
    .then( (presentRecommendation) => {
        let timestampDifference = (new Date).getTime() - presentRecommendation.endingRecommendationTimestamp;
        presentRecommendation.status = "past";
        presentRecommendation.timestampDifference = timestampDifference;
        presentRecommendation.save()
        .then(()=>{
            console.log('The recommendation ' + presentRecommendation.name + ' was sent to the past, now the theMind function should be executed');
            console.log('The difference between the supposed ending timestamp and the actual one is: ' + timestampDifference)
            theSource.theMind();
        })
    })
}

theSource.checkSystem = () => {
    console.log("inside the checkSystem function");
    Recommendation.findOne({status:"present"})
    .exec()
    .then((presentRecommendation)=>{
        if (presentRecommendation) {
            let now = (new Date).getTime();
            let timestampDifference = presentRecommendation.endingRecommendationTimestamp - now;
            console.log(timestampDifference);
            if (timestampDifference >= 0) {
                console.log("A setTimeout will start now and be triggered in " + timestampDifference/1000 + " seconds")
                setTimeout(theSource.sendRecommendationToPast, timestampDifference)
            } else { 
                theSource.sendRecommendationToPast();
            }
        } else {
            console.log("There was not a recommendation in the present. This is weird. The theMind function will be called")
            theSource.theMind();
        }
    })
}

theSource.theMind = () => {
    // console.log("inside the the mind function")
    Recommendation.find({}).exec()
    .then((allRecommendations)=>{
        let pastRecommendations = allRecommendations.filter(({status}) => "past".includes(status));
        let presentRecommendation = allRecommendations.filter(({status}) => "present".includes(status));
        let futureRecommendations = allRecommendations.filter(({status}) => "future".includes(status));
        if ( presentRecommendation.length > 1 ) {
            theSource.checkSystem();
        } else if ( futureRecommendations.length > 0 ) {
            let randomIndex = Math.floor(Math.random()*futureRecommendations.length);
            let newPresentRecommendation = futureRecommendations[randomIndex];
            let now = (new Date).getTime();
            newPresentRecommendation.status = "present";
            newPresentRecommendation.startingRecommendationTimestamp = now;
            newPresentRecommendation.endingRecommendationTimestamp = now + newPresentRecommendation.duration;
            newPresentRecommendation.index = pastRecommendations.length;
            newPresentRecommendation.save()
            .then(()=>{
                console.log('The recommendation ' + newPresentRecommendation.name + ' was brought to the present, and the timeout will send this recommendation to the past in ' + newPresentRecommendation.duration/1000 + ' seconds');
                setTimeout(theSource.sendRecommendationToPast, newPresentRecommendation.duration);
                // setTimeout(theSource.sendRecommendationToPast, 1111);
            })
        } else {
            theSource.bigBang();
        }
    })
}

theSource.bigBang = async (callback) => {
    console.log("inside the big bang function... emptyness, void, silence...................")
    await Recommendation.find().exec()
    .then( (pastRecommendations) => {
        if (pastRecommendations.length > 0) {
            for (i=0; i<pastRecommendations.length;i++) {
                pastRecommendations[i].status = "future";
                pastRecommendations[i].startingRecommendationTimestamp = ""; 
                pastRecommendations[i].endingRecommendationTimestamp = ""; 
                pastRecommendations[i].timestampDifference = ""; 
                pastRecommendations[i].index = ""; 
                pastRecommendations[i].save()
            }
            theSource.closeCycle(pastRecommendations.length)
        }
    })
    .then(()=>{
        console.log('the theMind function will be executed from inside the bigBang function')
        setTimeout(theSource.theMind, 0);
    })
}

theSource.openCycle = () => {
    Cycle.find({}).exec()
    .then((foundCycles)=>{
        let newCycle = new Cycle({
            startingTimestamp : (new Date).getTime(),
        })
        if (foundCycles.length > 0 ) {
            newCycle.cycleIndex = foundCycles.length;
        } else {
            newCycle.cycleIndex = 0;
        }
        newCycle.save()
        .then(()=>{
            console.log("The new cycle was opened")
        })
    })
}

theSource.closeCycle = (numberOfRecommendations = 0) => {
    Cycle.find({}).exec()
    .then((foundCycles)=>{
        if(foundCycles.length > 0){
            let lastCycle = foundCycles[foundCycles.length-1];
            lastCycle.numberOfRecommendations = numberOfRecommendations;
            lastCycle.cycleDuration = (new Date).getTime() - lastCycle.startingTimestamp;
            lastCycle.save()
            .then(()=>{
                console.log("The cycle #" + lastCycle.cycleIndex + " was closed and saved in the DB");
            })
        }
    })
    .then(()=>{
        theSource.openCycle();
    })
}

module.exports = theSource;