const axios = require("axios");
const moment = require("moment");
let express = require("express");
let router = express.Router();
let passport = require("passport");
let User = require("../models/user");
const middlewareObj = require("../middleware");
let Recommendation = require("../models/recommendation");
let Cycle = require("../models/cycle");
let theSource = require("../middleware/theSource");
const cryptoRandomString = require('crypto-random-string');

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
                presentRecommendation: {
                    name: presentRecommendation.name,
                    recommenderName : presentRecommendation.author.name || presentRecommendation.author.username,
                    country : presentRecommendation.author.country,
                    description : presentRecommendation.description
                },
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
    if(!req.user){
        newRecommendation.author = {
            name: req.body.name,
            country: req.body.country,
            email: req.body.email,
        }
    } else {
        newRecommendation.author = {
            id: req.user._id,
            username: req.user.username,
            country: req.user.country,
            name: req.user.username,
            language: req.user.language
        }
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
                if(req.user){
                    req.user.recommendations.push(newRecommendation);
                    req.user.save(()=>{
                        console.log("The user was updated with the new recommendation")
                    });
                }
                console.log("A new recommendation was saved by " + newRecommendation.author.name + ", with the following youtube ID: " + newRecommendation.youtubeID)
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
            if (req.user) {
                if (req.user.favoriteRecommendations) {
                    let indexOfRecommendation = req.user.favoriteRecommendations.indexOf(nextPresentRecommendation._id);
                    if (indexOfRecommendation === -1) {
                        answer.isFavorited = false;
                    } else {
                        answer.isFavorited = true;
                    }
                } else {
                    answer.isFavorited = false;
                }
            } else {
                answer.isFavorited = undefined;
            }
            res.json(answer);
        })
    } else if (req.body.systemStatus === "past") {
        Recommendation.findOne({youtubeID:req.body.videoID}).exec()
        .then((queriedVideo) => { 
            Recommendation.findOne({index: queriedVideo.index+1}).exec()
            .then((nextVideo)=>{
                if (nextVideo) {
                    answer.recommendation = nextVideo;
                    if (req.user) {
                        if (req.user.favoriteRecommendations) {
                            let indexOfRecommendation = req.user.favoriteRecommendations.indexOf(nextVideo._id);
                            if (indexOfRecommendation === -1) {
                                answer.isFavorited = false;
                            } else {
                                answer.isFavorited = true;
                            }
                        } else {
                            answer.isFavorited = false;
                        }
                    } else {
                        answer.isFavorited = undefined;
                    }
                    answer.elapsedSeconds = 0;
                    res.json(answer);
                }
            })
        })   
    } else if (req.body.systemStatus === "favorites"){
        User.findOne({username:req.user.username}).populate("favoriteRecommendations")
        .then((foundUser)=>{
            let favoriteRecommendations = foundUser.favoriteRecommendations;
            answer.recommendation = favoriteRecommendations[Math.floor(Math.random()*favoriteRecommendations.length)]
            answer.isFavorited = true;
            answer.elapsedSeconds = 0;
            res.json(answer);
        })
    } else if (req.body.systemStatus === "recommendations"){
        User.findOne({username:req.user.username}).populate("recommendations")
        .then((foundUser)=>{
            let userRecommendations = foundUser.recommendations;
            answer.recommendation = userRecommendations[Math.floor(Math.random()*userRecommendations.length)]
            answer.isFavorited = true;
            answer.elapsedSeconds = 0;
            res.json(answer);
        })
    }
})

router.get("/getUserInfo", (req, res) => {
    if(req.user){
        res.send({username:req.user.username, country:req.user.country, language:req.user.language})
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

router.post("/userTimeTravel", (req, res) => { 
    let answer = {};
    let userRecommendations = [];
    User.findOne({username:req.user.username}).populate("favoriteRecommendations").populate("recommendations").exec()
    .then((foundUser) => {
        if(req.body.userQuery === "favorites"){
            if(foundUser.favoriteRecommendations.length>0) {
                answer.userRecommendations = foundUser.favoriteRecommendations;
                answer.message = "There are " + foundUser.favoriteRecommendations.length + " recommendations in the past and this one was chosen from there."
            } else {
                answer.userRecommendations = [];
                answer.message = "So bad, there are no recommendations in this user."
            }
            res.json(answer);
        } else {
            if(foundUser.recommendations.length>0) {
                answer.userRecommendations = foundUser.recommendations;
                answer.message = "There are " + foundUser.recommendations.length + " recommendations in the past and this one was chosen from there."
            } else {
                answer.userRecommendations = [];
                answer.message = "So bad, there are no recommendations in this user."
            }
            res.json(answer);
        }
    })
})

router.post("/getRecommendationInformation", (req, res) => {
    let answer = {};
    Recommendation.findOne({youtubeID:req.body.recommendationID}).exec()
    .then((queriedRecommendation)=>{
        answer.recommendation = queriedRecommendation;
        if (req.user) {
            if (req.user.favoriteRecommendations) {
                let indexOfRecommendation = req.user.favoriteRecommendations.indexOf(queriedRecommendation._id);
                if (indexOfRecommendation === -1) {
                    answer.isFavorited = false;
                } else {
                    answer.isFavorited = true;
                }
            } else {
                answer.isFavorited = false;
            }
        } else {
            answer.isFavorited = undefined;
        }
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

router.post("/favorited", (req, res) => {
    let answer = {};
    if (req.user){
        Recommendation.findOne({youtubeID:req.body.recommendationID}).exec()
        .then((thisRecommendation)=>{
            req.user.favoriteRecommendations.push(thisRecommendation);
            req.user.save(()=>{
                console.log("The recommendation was added to the user")
            });
        })
        answer.user = req.user;
        res.json(answer);
    } else {
        answer.user = undefined;
        res.json(answer);
    }
});

router.post("/unfavorited", (req, res) => {
    let answer = {};
    if (req.user){
        Recommendation.findOne({youtubeID:req.body.recommendationID}).exec()
        .then((thisRecommendation)=>{
            const index = req.user.favoriteRecommendations.indexOf(thisRecommendation._id);
            if( index > -1 ){
                req.user.favoriteRecommendations.splice(index,1);
            } else {
                console.log("The recommendation was not in the user's profile")
            }
            req.user.save(()=>{
                console.log("Updated the user after deleting the recommendation " + thisRecommendation.name);
            })
        })
        answer.user = req.user;
        res.json(answer);
    } else {
        answer.user = undefined;
        res.json(answer);
    }
});

router.get("/getFavoriteRecommendations", (req, res) => {
    User.findOne({"username" : req.user.username}).populate("favoriteRecommendations")
    .then((foundUser) => {
        res.json(foundUser.favoriteRecommendations)
    });
})

router.get("/getUserRecommendations", (req, res) => {
    User.findOne({"username" : req.user.username}).populate("recommendations")
    .then((foundUser) => {
        res.json(foundUser.recommendations)
    });
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

router.get("/reviewer", (req, res)=>{
    Recommendation.findOne({reviewed:false})
    .then((recommendationForReview)=>{
        if(recommendationForReview){
            res.render("reviewer", {
                youtubeID : recommendationForReview.youtubeID,
                elapsedSeconds : 0, 
                recommendation: {
                    name: recommendationForReview.name,
                    recommenderName : recommendationForReview.author.name || recommendationForReview.author.username,
                    country : recommendationForReview.author.country,
                    description : recommendationForReview.description,
                    recommendationID : recommendationForReview._id
                },
            })
        } else {
            console.log("There are not any more recommendations that need to be reviewed, you are going to be redirected to the present")
            res.redirect("/")
        }
    })
})

router.post("/reviewer", (req, res)=>{
    if (req.body.password === process.env.REVIEWER_PASS){
        Recommendation.findById(req.body.recommendationID)
        .then((foundRecommendation)=>{
            foundRecommendation.reviewed = true;
            if(req.body.reviewerRadioBtn === "true"){
                foundRecommendation.save(()=>{
                    console.log("The recommendation " + foundRecommendation.name + " was reviewed and sent to the future");
                    res.redirect("/reviewer")
                })
            } else {
                foundRecommendation.status = "void";
                foundRecommendation.save(()=>{
                    console.log("The recommendation " + foundRecommendation.name + " doesn't work and was sent to the void");
                    res.redirect("/reviewer")
                })
            }
        })
    } else {
        console.log("The password is incorrect")
        res.redirect("/reviewer")
    }
})

router.get("/error", (req, res)=>{
    res.render("error");
})


router.get("/registerSuccess", function(req, res){
    res.render("registerSuccess");
})

router.get("/register", (req, res)=>{
    res.render("register")
})

//handle sign up logic
router.post("/register", async function (req,res, next) {
    try {
        const randomString = cryptoRandomString({length: 128});
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const registeredUser = await User.register(user,password);
        registeredUser.name = req.body.name;
        registeredUser.country = req.body.country;
        registeredUser.language = req.body.language;
        registeredUser.active = false;
        registeredUser.activeExpires = Date.now() + 24*3600*1000;
        registeredUser.activeToken = randomString;
        middlewareObj.sendVerificationEmail(registeredUser.username ,registeredUser.email, registeredUser.activeToken);
        registeredUser.save(()=>{
            res.redirect('/registerSuccess');
        });
    } catch (e) {
        req.flash('error', e.message);
        console.log(e);
        res.redirect('register');
    }
});

router.get("/password_reset/:resetCode", function (req, res) {
    res.render("password_reset");
});

router.post("/password_reset_verification", (req, res)=>{
    let answer = {};
    let nowTimestamp = (new Date()).getTime();
    User.findOne({email:req.body.email})
    .then((foundUser)=>{
        if(foundUser.passResetString === req.body.resetCode){
            if (foundUser.passResetExpires>nowTimestamp){
                answer.status = true;
                answer.message = "All OK with this account, proceed to update the password"
            } else {
                answer.status = false;
                answer.message = "Your code for creating a new password has expired, please click the following link to get a new one."
            }
        } else {
            answer.status = false;
            answer.message = "I'm sorry, but the email you provided does not match the one in our end. Try again, or click the following link to get a new code."
        }
    })
})

router.post("/password_reset", (req, res) => {
    User.findOne({email:req.body.email})
    .then((foundUser)=>{
        if(foundUser){
            foundUser.setPassword(req.body.newPassword, ()=> {
                foundUser.passResetString = "";
                foundUser.passResetExpires = "";
                foundUser.save()
                .then(()=>{
                    req.login(foundUser, (err)=>{
                        if(err){console.log(err)}
                        res.redirect("/");
                    })
                })
            })
        } else {
            res.redirect("error");
        }
    })
})

router.post("/pass_reset", async function(req, res){
    let answer = {};
    const randomCode = cryptoRandomString({length: 128});
    if(middlewareObj.validateEmail(req.body.passReset)){
        User.findOne({email:req.body.passReset})
        .then((foundUser)=>{
            foundUser.passResetString = randomCode;
            foundUser.passResetExpires = (new Date()).getTime() + 7200000;
            foundUser.save(async ()=>{
                middlewareObj.sendResetEmail(foundUser.username, foundUser.email, randomCode);
                answer.message = "The email with the link for resetting the password was sent!";
                res.json(answer);
            })
        })
    } else {
        User.findOne({username:req.body.passReset})
        .then((foundUser)=>{
            foundUser.passResetString = randomCode;
            foundUser.passResetExpires = (new Date()).getTime() + 7200000;
            foundUser.save(async ()=>{
                console.log("The user was saved with the string that resets the password");
                middlewareObj.sendResetEmail(foundUser.username, foundUser.email, randomCode);
                answer.message = "The email with the link for resetting the password was sent!";
                res.json(answer);
            })
        })
    }
})

router.get("/verifyAccount", function(req, res){
    res.render("verifyAccount");
})

router.get("/verified", (req, res)=>{
    res.render("verified");
})

router.get("/verifyEmail/:code", function(req, res){
    User.findOne({activeToken:req.params.code, activeExpires:{$gt: Date.now()}})
    .then((foundUser)=>{
        if(!foundUser.active){
            foundUser.active = true;
            foundUser.save(()=>{
                console.log("The user " + foundUser.username + " was activated!");
                req.login(foundUser, (err)=>{
                    if(err){console.log(err)}
                    res.redirect("/verified");
                })
            })
        } else {
            req.login(foundUser, (err)=>{
                if(err){console.log(err)}
                res.redirect("/");
            })
        }
    })
    .catch((err)=>{
        console.log(err);
        res.redirect("error");
    })
})

router.get('/api/user_data', function(req, res) {
    if (req.user === undefined) {
        res.json({status:"notLoggedIn"});
    } else {
        res.json({
            username: req.user.username,
            verificationStatus: req.user.active,
            status:"loggedIn"
        });
    }
});

// show login form
router.get("/login", function(req, res){
    if(req.isAuthenticated()) {
        return res.redirect("/");
    } 
    res.render("login")
});

router.get("/login/error", function(req, res){
    res.render("loginError")
})

router.get("/loginFailure", function(req,res){
    res.render("loginFailure", {today: today});
})

// handling login logic

router.post('/login', middlewareObj.isVerified, passport.authenticate('local', {failureFlash:true, failureRedirect:'/login/error'}), (req, res)=>{
    req.flash('success', 'welcome back');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
});

// logout route
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("/");
});

router.get("/:anything", function(req, res) {
    res.render("nonExisting", {today: today});
})

module.exports = router;