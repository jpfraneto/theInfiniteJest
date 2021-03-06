const axios = require("axios");
const moment = require("moment");
const Recommendation = require("../models/recommendation");
const Cycle = require("../models/cycle");
let seedDB        = require("../seeds2");
let chiita = {};

let nowTime, systemStatus, delay;

// FOR GETTING THE VIDEO INFORMATION

chiita.getYoutubeID = (url)=> {
    url = url.split(/(vi\/|v%3D|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return undefined !== url[2]?url[2].split(/[^0-9a-z_\-]/i)[0]:url[0];
}

chiita.getRecommendationInfo = function(url) {
    videoID = youtube_parser(url);
    keyAPI = process.env.YOUTUBE_APIKEY;
    urlRequest = "https://www.googleapis.com/youtube/v3/videos?id="+videoID+"&key="+keyAPI+"%20&fields=items(id,snippet(title,description),contentDetails(duration,%20regionRestriction),statistics)&part=snippet,contentDetails,statistics"
    const getVideoInfo = () =>{
        try {
            return axios.get(urlRequest);
        } catch (error) {
            console.error(error)
        }
    }
}

module.exports = chiita;