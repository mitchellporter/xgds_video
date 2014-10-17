import pytz
import re
import datetime
import os

from xgds_video import settings
# from plrpExplorer.views import getVideoDelay # FIX-ME: should be abstracted better from video

TIME_ZONE = pytz.timezone(settings.XGDS_VIDEO_TIME_ZONE['code'])
VIDEO_DELAY_SECONDS = 0


def getShortTimeString(dateTime):
    return dateTime.strftime("%H:%M:%S")


def convertUtcToLocal(time):
    if time:
        time = time.replace(tzinfo=pytz.UTC)
        return time.astimezone(TIME_ZONE)
    else:
        return ""


def pythonDatetimeToJSON(pyDateTime):
    if pyDateTime:
        return {"year": pyDateTime.year, "month": pyDateTime.month, "day": pyDateTime.day,
                "hour": pyDateTime.hour, "min": pyDateTime.minute, "seconds": pyDateTime.second}
    else:
        return ""


def processLine(videoDirUrl, line):
    # line = 'prog_index0.ts\n'
    # videoDirUrl = '/data/20140327A_OUT/Video/Recordings/Segment000'
    line = line.rstrip("\n")
    if line.startswith("fileSequence"):
        return videoDirUrl + "/" + line
    else:
        return line


def setSegmentEndTimes(segments, episode, source):
    """
    If both the episode endtime and segments' endtimes are not available (we are live),
    set the segment end time as endTime value inferred from the index file
    Given dictionary of segments (key = source, value = segment).
    """
    if not episode:
        print "CANNOT set segment end times for empty episode" + str(episode)
        return

#     for sourceShortName, segments in sourceSegmentsDict.iteritems():
    flightName = episode.shortName + '_' + source.shortName
#     segments = sourceSegmentsDict[source.shortName]
    segments = sorted(segments, key=lambda segment: segment.segNumber)
    # if last segment has no endTime 
    if (segments[-1].endTime is None) and (episode.endTime is None):
        segment = segments[-1]  # last segment
        suffix = getIndexFileSuffix(flightName, source.shortName, segment.segNumber)
        path = settings.DATA_ROOT + suffix
        segmentDuration = getTotalDuration(path)
        segment.endTime = segment.startTime + datetime.timedelta(seconds=segmentDuration)
        segment.save()


def find_between(s, first, last):
    """
    Helper that finds the substring between first and last strings.
    """
    try:
        start = s.index(first) + len(first)
        end = s.index(last, start)
        return s[start:end]
    except ValueError:
        return ""


def getTotalDuration(path):
    """
    Given path to the index file of a segment, returns the total duration of the
    segment
    """
    try:
        indexFile = open(path)
    except IOError:
        print "path not found for segments " + path
        return 0

    totalDuration = 0
    for line in indexFile:
        if line.startswith("#EXTINF"):
            timeValue = find_between(line, ":", ",")
            totalDuration += int(float(timeValue))

    indexFile.close()
    return totalDuration


def findEndMarker(item):
    if re.match("#EXT-X-ENDLIST", item):
        return True


def padNum(num, size):
    s = str(num)
    while len(s) < size:
        s = '0' + s
    return s


def getIndexFileSuffix(flightName, sourceShortName, segmentNumber):
    # path = flightName + '/' + sourceShortName + "/Video/Recordings/Segment" + \
    # padNum(segmentNumber, 3) + '/prog_index.m3u8'
    path = "images/" + flightName + '/' + sourceShortName + "/Segment" + \
        padNum(segmentNumber, 3) + '/prog_index.m3u8'
    return path


def updateIndexFilePrefix(indexFileSuffix, subst):
    """
    search and replace in file
    pattern: regex pattern for searching
    subst: string you want to replace with.
    """
    # foundEndMarker = False
    # open the file
    indexFilePath = settings.DATA_ROOT + indexFileSuffix
    print "indexFilePath: %s" % indexFilePath
    segmentDirectoryUrl = settings.DATA_URL + os.path.dirname(indexFileSuffix)
    print "segmentDirectoryUrl: %s" % segmentDirectoryUrl
    baseFile = open(indexFilePath)
    videoDelayInSecs = VIDEO_DELAY_SECONDS  # getVideoDelay() - settings.XGDS_VIDEO_DELAY_MINIMUM_SEC
    if videoDelayInSecs < 0:
        videoDelayInSecs = 0
    videoDelayInSegments = int(round(videoDelayInSecs / settings.XGDS_VIDEO_SEGMENT_SEC))
    videoDelayInLines = 2 * videoDelayInSegments + 1

    #  edit the index file
    clips = baseFile.read().split('#EXTINF:')
    header = clips.pop(0)
    clips.pop(0)  # badFirstClip
    processedClips = '#EXTINF:'.join([header] + clips)
    lineList = processedClips.split("\n")
    maxLineNum = len(lineList) - videoDelayInLines
    processedIndex = []
    for idx, line in enumerate(lineList):
        if idx < maxLineNum:
            processedIndex.append(processLine(segmentDirectoryUrl, line))
    baseFile.close()
    if videoDelayInSecs == 0:
        if not any([findEndMarker(item) for item in processedIndex]):
            processedIndex.append("#EXT-X-ENDLIST")
    else:
        print "Video delay non-zero - NOT adding any extra end tag"
    return "\n".join(processedIndex) + "\n"
