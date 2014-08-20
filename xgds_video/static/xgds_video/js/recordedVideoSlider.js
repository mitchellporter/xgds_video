/**
 * Create a slider legend that shows breaks between segments
 */
function createSliderLegend() {
    for (var key in xgds_video.displaySegments) {
        var labels = {}; //key: position, value: label
        var segments = xgds_video.displaySegments[key];
        //list of video segments with same source & episode
        var source = segments[0].source;
        //do not create a legend if any of the segments are missing an end time
        var endPointCheck = true;
        $.each(segments, function(id) {
            var segment = segments[id];
            if (!segment.endTime) {
                endPointCheck = false;
                return false;
            }
        });
        if (!endPointCheck) {
            return;
        }
        //get the total slider range in seconds
        var startTime = xgds_video.masterSlider.slider('option', 'min');
        var endTime = xgds_video.masterSlider.slider('option', 'max');
        var totalDuration = endTime - startTime;  // in seconds
        var color = source.displayColor;
        if (color == '') {
            //assign a random color
            alert('display color is not set in video source. Assigning random color.');
            color = '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
        }
        //handle empty space in front of first segment
        var segStartTimeInSeconds = Math.round(segments[0].startTime / 1000);
        var emptySegmentDuration = segStartTimeInSeconds - startTime;
        var emptySegmentWidth = xgds_video.masterSlider.width() * (emptySegmentDuration / totalDuration);
        xgds_video.masterSlider.before('<img class="' + source.shortName + '-legend' +
                '" alt="emptySegment"' +
                '" width="' + emptySegmentWidth +
        '" height="5px" style="opacity:0.0;">');
        //for each video segment
        $.each(segments, function(id) {
            var segment = segments[id];
            var source = segment.source;
            var segDuration = 0;
            var width = 0;
            //get the duration of the video segment
            segDuration = Math.round((segment.endTime - segment.startTime) / 1000); //in seconds
            width = xgds_video.masterSlider.width() * (segDuration / totalDuration);
            //draw the visualization
            xgds_video.masterSlider.before('<img class="' +
                    source.shortName + '-legend' + '" id=' +
                    'Segment' + id + ' width="' + width +
                    '"alt="Segment' + id + '"' +
                    '" height="5px" ' +
                    'style="background-color:' +
                    color + ';">');
            if (segments[id + 1]) { //if there is a next segment
                var nextSegment = segments[id + 1];
                emptySegmentDuration = Math.round((nextSegment.startTime - segment.endTime) / 1000);
                emptySegmentWidth = xgds_video.masterSlider.width() * (emptySegmentDuration / totalDuration);
                xgds_video.masterSlider.before('<img class="' + source.shortName + '-legend' +
                        '" alt="emptySegment"' +
                        '" width="' + emptySegmentWidth +
                '" height="5px" style="opacity:0.0;">');
            }
        });
        //wrap segments of each source in a div
        $('.' + source.shortName + '-legend').wrapAll('<div class="divider";"></div>');
    }
}


function showTimeOnHover(duration) {
    // Number of tick marks on slider
    var position = $('#masterSlider').position(),
    sliderWidth = $('#masterSlider').width(),
    minX = position.left,
    maxX = minX + sliderWidth;
    $(this).mousemove(function(e) {
        // If within the slider's width, follow it along
        if (e.pageX >= minX && e.pageX <= maxX) {
            var val = (e.pageX - minX);
            //get the time
            var dur = (duration * 1000) * (val / (maxX - minX));
            var currentTime = dur + xgds_video.firstSegment.startTime.getTime();
            currentTime = new Date(currentTime);
            //display as a tooltip
        }
    });
}


function getPercent(width, totalWidth) {
    return Math.round(width / totalWidth * 100);
}


function getTimeString(datetime) {
    var timeString = '';
    if (datetime.getHours().toString().length == 1) {
        timeString += '0' + datetime.getHours() + ':';
    } else {
        timeString += datetime.getHours() + ':';
    }
    if (datetime.getMinutes().toString().length == 1) {
        timeString += '0' + datetime.getMinutes() + ':';
    } else {
        timeString += datetime.getMinutes() + ':';
    }
    if (datetime.getSeconds().toString().length == 1) {
        timeString += '0' + datetime.getSeconds();
    } else {
        timeString += datetime.getSeconds();
    }
    return timeString;
}


/**
 * Slider Callback:
 * update slider time text when moving slider.
 */
function uponSliderMoveCallBack(event, ui) {
    //update slider time label on top
    xgds_video.movingSlider = true;
    var sliderTime = new Date(ui.value * 1000);
    setSliderTimeLabel(sliderTime);
    updateToolTip(ui, sliderTime);
}


/**
 * Slider Callback:
 *    get the current slider position and do
 *    offset = slider position - each video's start time
 *    seek each video at offset. (means each video's offset will be different,
 *    but their test site time same)
 *    update the test site times to equal slider position.
 */
function uponSliderStopCallBack(event, ui) {
    xgds_video.movingSlider = false;
    var currTime = xgds_video.masterSlider.slider('value'); //in seconds
    currTime = new Date(currTime * 1000); //convert to javascript date
    for (var key in xgds_video.displaySegments) {
        var sourceName = xgds_video.displaySegments[key][0].source.shortName;
        jumpToPosition(currTime, sourceName);
        //XXX take care of the case where seek time is not within playable range.
        //then go to the nearest available segment and play from there.
    }
}


/**
 * initialize master slider with range (episode start time->episode end time)
 */
function setupSlider() {
    var endTime = null;
    if (isEmpty(xgds_video.episode)) {
        if (Object.keys(xgds_video.displaySegments).length < 1) {
            return;
        } else {
            endTime = xgds_video.lastSegment.endTime;
        }
    } else { //video episode needed to set slider range
        endTime = (xgds_video.episode.endTime) ? xgds_video.episode.endTime :
            xgds_video.lastSegment.endTime;
    }
    var duration = Math.ceil(endTime.getTime() / 1000) -
    Math.floor(xgds_video.firstSegment.startTime.getTime() / 1000);
    //for time hover label
    if (endTime) {
        xgds_video.masterSlider = $('#masterSlider').slider({
            step: 1,
            //all times are in seconds
            min: Math.floor(xgds_video.firstSegment.startTime.getTime() / 1000),
            max: Math.ceil(endTime.getTime() / 1000),
            stop: uponSliderStopCallBack,
            slide: uponSliderMoveCallBack,
            range: 'min'
        });
        var sliderTime = new Date($('#masterSlider').slider('value') * 1000);
        setSliderTimeLabel(sliderTime);
        updateToolTip(false, sliderTime);
        createSliderLegend();
        //showTimeOnHover(duration);
    } else {
        alert('The end time of video segment not available.' +
        'Cannot setup slider');
    }
}
