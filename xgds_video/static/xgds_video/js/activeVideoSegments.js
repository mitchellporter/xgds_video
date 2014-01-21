var masterSlider = '';
var playFlag = true;


function setText(id, messageText) {
    document.getElementById(id).innerHTML = messageText;
}


//helper to parse seektime into hours, minutes, seconds
function seekTimeParser(str) {
    var hmsArray = str.split(':');
    return hmsArray;
}


// find max width of the jwplayer
function getMaxWidth(displaySegments) {
    var width = window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth;
    
    if (Object.keys(displaySegments).length > 1) {
        width = Math.round(width / 2);
    }

    width = width - 100;
    return width;
}


// find max height of jwplayer
function calculateHeight(newWidth, defaultHeight, defaultWidth) {
    var newHeight = defaultHeight;
    var ratio = newWidth / defaultWidth;
    newHeight = Math.round(defaultHeight * ratio);
    return newHeight;
}

function getPlaylistIdxAndOffset(segments,currTime){
    /*
     * Helper for uponSliderStop.
     * Given current time in javascript datetime, 
     * find the playlist item and the offset (seconds) to seek to. 
     */
    var playlistIdx = 0;
    var offset = 0;
    for (var i=0; i< segments.length; i++) {
        if ((currTime >= segments[i].startTime) && (currTime <= segments[i].endTime)) {
            playlistIdx = i;
            offset = currTime - segments[i].startTime; 
            return [playlistIdx,offset]
        }
    }
    return false;
}


/**
 * Seek Video from time.
 * Update the slider value, slider text
 * update the jwplayer position
 *    offset = seek time - video start time.
 **/
function seekToTime() {
    var seekTimeStr = document.getElementById('seekTime').value;

    if ((seekTimeStr == null) || (Object.keys(displaySegments).length < 1)) {
        return;
    }

    for (var key in displaySegments) {
        var segments = displaySegments[key];
        var sourceName = segments[0].source.shortName;

        var seekTime = seekTimeParser(seekTimeStr);
        var seekDateTime = new Date(segments[0].endTime); //XXX for now assume seek time's date is same as first segment's end date
        seekDateTime.setHours(parseInt(seekTime[0]));
        seekDateTime.setMinutes(parseInt(seekTime[1]));
        seekDateTime.setSeconds(parseInt(seekTime[2]));
   
        var player = jwplayer('myPlayer'+sourceName);
        if (player != undefined) {
            if (getPlaylistIdxAndOffset(segments, seekDateTime)) { //if seek time falls under a playable range
                var idx = getPlaylistIdxAndOffset(segments, seekDateTime)[0];
                var offset = getPlaylistIdxAndOffset(segments, seekDateTime)[1];
                
                jwplayer('myPlayer'+sourceName).playlistItem(idx).play(true);
                jwplayer('myPlayer'+sourceName).seek(offset);
                
                if (playFlag) {
                    jwplayer('myPlayer'+sourceName).play(true);
                } else {
                    jwplayer('myPlayer'+sourceName).pause(true);
                }
            }
        }
    }
}
/*
    var seekTimeStr = document.getElementById('seekTime').value;
    if ((seekTimeStr == null) || (displaySegmentsGlobal.length < 1)) {
        return;
    }
    
    $.each(displaySegmentsGlobal, function(idx) {
        var segment = displaySegmentsGlobal[idx];
        if (segment.endTime != null) {  
            var sourceName = segment.source.shortName;
            
            //for now assume that seekTime has the same date as first segments' endDate.
            var seekTime = seekTimeParser(seekTimeStr);
            var seekDateTime = new Date(segment.endTime);
            seekDateTime.setHours(parseInt(seekTime[0]));
            seekDateTime.setMinutes(parseInt(seekTime[1]));
            seekDateTime.setSeconds(parseInt(seekTime[2]));

            var offset = Math.round((seekDateTime - segment.startTime) / 1000); //in seconds
            console.log("seekto time offset: ", offset);
            var player = jwplayer('myPlayer'+sourceName);
            if (player != undefined) {
                setText('testSiteTime'+sourceName, seekTimeStr+' '+segment.timeZone);
                if (offset >= 0) {
                    var doSeek = true;
                    var state = player.getState();
                    if (state == 'IDLE') {
                        player.setMute(true).play(true).onPlay(function() {
                            if (doSeek) {
                                doSeek = false;
                                player.pause(true).seek(offset).play(true);
                            }
                        });
                    } else {
                        if (state != 'BUFFERING') {
                            player.seek(offset).play(true);
                        }
                    }
                }
            }
        }
    });
*/


/**
 * initialize master slider with range (episode start time->episode end time)
 **/
 //XXX slider legend : http://stackoverflow.com/questions/10224856/jquery-ui-slider-labels-under-slider
function setupSlider() {
    if (episode) { //video episode needed to set slider range
        var endTime = (episode.endTime) ? episode.endTime : lastSegment.endTime; 
        if (endTime) {
            masterSlider = $('#masterSlider').slider({
                step: 1,
                min: Math.floor(firstSegment.startTime.getTime() / 1000), //in seconds
                max: Math.ceil(endTime.getTime() / 1000), //in seconds 
                stop: uponSliderStop,
                slide: uponSliderMove,
                range: 'min'
            });
            var sliderTime = new Date($('#masterSlider').slider('value')*1000);
            $('#sliderTimeLabel').val(sliderTime.toTimeString());
        } else {
            alert("The end time of video segment not available. Cannot setup slider");
        }
    } else {
        alert("The video episode is not available.");
    }
}


/**
 * Callback function for play/pause button
 **/
function playPauseButtonCallBack() {
    playFlag = !playFlag;
    $.each(displaySegmentsGlobal, function(idx) {
        var sourceName = displaySegmentsGlobal[idx].source.shortName;
        var player = jwplayer('myPlayer' + sourceName);

        if ((player.getState() == 'PLAYING') ||
            (player.getState() == 'PAUSED')) {

            if (playFlag == true) {
                document.getElementById("playbutton").className="fa fa-pause fa-2x"
                player.play(true);
            } else {
                document.getElementById("playbutton").className="fa fa-play fa-2x"
                player.pause(true);
            }
        }
    });
}


function padNum(num, size) {
    var s = num + '';
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}


function getFilePaths(episode, segments) {
    /* 
     * Helper that returns file paths of video segments with same source
     */
    var filePaths=[];
    $.each(segments,  function(id) {
        var segment = segments[id];
        var source = segment.source;
        var sourceName = segment.source.shortName;
        var path = baseUrl + episode.shortName + '_' + source.shortName + '/Video/Recordings/' + 
            segment.directoryName + padNum(segment.segNumber,3) + '/' + segment.indexFileName;
        filePaths.push(path);
    });
    return filePaths;
}


/**
 * Initialize jw player and call update values
 **/

function setupJWplayer() {
    if (episode) { //if episode exists
        var maxWidth = getMaxWidth(displaySegments);
        for (var key in displaySegments) {
            //construct a playlist from these video segments!
            var segments = displaySegments[key]; //list of video segments with same source & episode
            var source = segments[0].source;
            var videoPaths = getFilePaths(episode,segments);
            var height = calculateHeight(maxWidth, segments[0].settings.height,
                                         segments[0].settings.width);

            jwplayer("myPlayer"+source.shortName).setup({
                height: height,
                width: maxWidth,
                file: videoPaths[0],
                autostart: false,
                controlbar: 'none',
                skin: '/static/javascript/jwplayer/jw6-skin-sdk/skins/five/five.xml',
                events: {
                    onReady: function() {
                        //if it's the first segment, it should start playing.
                        if (firstSegment.startTime == segments[0].startTime) {
                            jwplayer('myPlayer'+source.shortName).play(true);
                            updateValues();
                        }
                    },
                    onComplete: function() {
                        //upon complete, stop. It should start segment at the right time (in updateValues).
                        jwplayer('myPlayer'+source.shortName).pause(true);
                    }
                }, 
                listbar: { //this list bar is just for debug
                    position: 'right',
                    size: 120
                }
            });

            var playlist = [];
            for (var k=0;k<videoPaths.length;k++) {
                var newItem = {
                    file: videoPaths[k],
                    title: videoPaths[k]
                };
                playlist.push(newItem);
            }
            jwplayer("myPlayer"+source.shortName).load(playlist);
         }
    } else {
        alert("episode not available. Cannot set up jwplayer");
    }
}


/**
 * Slider Callback:
 * update slider time text when moving slider.
 **/
function uponSliderMove(event, ui) {
    var sliderTime = new Date(ui.value*1000);
    $('#sliderTimeLabel').val(sliderTime.toTimeString());
}


/**
 * Slider Callback:
 *    get the current slider position and do
 *    offset = slider position - each video's start time
 *    seek each video at offset. (means each video's offset will be different, but their test site time same)
 *    update the test site times to equal slider position.
 **/
function uponSliderStop(event, ui) {
    var currTime = masterSlider.slider('value'); //in seconds
    currTime = new Date(currTime*1000); //convert to javascript date

    for (var key in displaySegments) {
        var segments = displaySegments[key];
        var source = segments[0].source;
    
        var player = jwplayer('myPlayer'+source.shortName);
        //given current time, which segment and what is the offset in that segment?
        if (getPlaylistIdxAndOffset(segments,currTime)) { // if the seektime is in the playable range (within segment start and stop times)
            var index = getPlaylistIdxAndOffset(segments,currTime)[0];
            var offset = getPlaylistIdxAndOffset(segments,currTime)[1];
            var state = player.getState();
            if (state == 'PAUSED') {
                player.playlistItem(index);
                player.seek(offset);
                player.pause(true);
            } else if ((state == 'PLAYING') || (state == 'IDLE')) {
                player.playlistItem(index);
                player.seek(offset);
                player.play(true);
            } else { //buffering
                // player is not ready yet
            }
   
            //set testsite time for each player (get it from the player itself. this should match slider time)
            var testSiteMiliSec = 0;
            for (var s=0; s< index; s++) {
                testSiteMiliSec += segments[s].endTime.getTime() - segments[s].startTime.getTime();
            }
            testSiteMiliSec += (offset*1000);
            testSiteMiliSec += segments[0].startTime.getTime();
            var testSiteTime = new Date(testSiteMiliSec);
            setText('testSiteTime'+source.shortName, testSiteTime.toString()+' '+segments[0].timeZone);
        }
        
    }
}


/*
 * updateValues increments the slider every second (if the state is "play"). 
 */
function updateValues() {
 
    var isBuffering = false;
    for (var key in displaySegments) {
        var segments = displaySegments[key];
        var sourceName = segments[0].source.shortName;
        if (playFlag){ 
            var sliderTime = masterSlider.slider('value');
            if (jwplayer('myPlayer'+sourceName).getState() != 'PLAYING') {
                if (getPlaylistIdxAndOffset(segments,sliderTime)) {
                    var playlistIdx = getPlaylistIdxAndOffset(segments,sliderTime)[0];
                    var itemOffset = getPlaylistIdxAndOffset(segments,sliderTime)[1];
                    jwplayer('myPlayer'+sourceName).playlistItem(playlistIdx).play(true);
                    jwplayer('myPlayer'+sourceName).seek(itemOffset);
                }
            }
        }

        //if even one of the vidoes is buffering pause all the videos and quit.
        if (jwplayer('myPlayer'+sourceName).getState() == 'BUFFERING'){
            isBuffering = true;
            break;
        }
    }

    if ((!playFlag) || isBuffering) { //if it's on pause, slider should not be updated.
        // pause all the other videos and don't update the slider
        for (var key in displaySegments) {
            var sourceName = displaySegments[key][0].source.shortName;
            jwplayer('myPlayer'+sourceName).pause(true);
        }
        return;
    }

    // update the slider count.
    var currTime = masterSlider.slider('value')+1; //in seconds
    masterSlider.slider('value', currTime); //increment slider value by one second
    //XXX investigate why it's incrementing by two seconds
    var sliderTime = new Date(masterSlider.slider('value')*1000);
    $('#sliderTimeLabel').val(sliderTime.toTimeString());

    //recurse every second!
    setTimeout(updateValues,1000);
}

