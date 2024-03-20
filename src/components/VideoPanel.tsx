import React, {useEffect, useRef, useState} from 'react';
import {
    DataHoverEvent,
    PanelProps,
    LoadingState,
    Field,
    Vector,
    TimeRange, DataHoverClearEvent,
    //,DashboardCursorSync
} from '@grafana/data';
import {css, cx} from '@emotion/css';
import {useStyles} from '@grafana/ui';
import {ThemeChangedEvent} from "@grafana/runtime";
import {VideoOptions} from "../types";
//import {getTimezones} from "../utils";

//import {Tooltip, usePanelContext} from "@grafana/ui";

interface Props extends PanelProps<VideoOptions> {
}


export const VideoPanel: React.FC<Props> = ({
                                                timeRange,
                                                options,
                                                data,
                                                width,
                                                height,
                                                eventBus,
                                                replaceVariables
                                            }) => {
        //set Styles (CSS)
        const styles = useStyles(getStyles);
        //create React State for storing time used atm (states re-render on update of value)
        const [time, setTime] = useState(Date.now);
        //create React RefHook for TimeObject (RefHooks do not re-render on update of value)
        const timeObj=useRef(updateTime(data,timeRange,time));

        const timeRef=useRef(-1);
        timeRef.current=-2;
        //if videoURL !== true -> String Empty, avoid null value
        let videoURL = replaceVariables(options.videoURL || '');
        //const timezones = useMemo(() => getTimezones(options.timezone, timeZone), [options.timezone, timeZone]); // -> not needed
        //create OnClick-Handler

        eventBus.getStream(DataHoverEvent).subscribe(x=>{
            // console.log("Payload Point Time")
            // console.log(vid?.currentTime);
            // console.log(x.payload.point["time"]);
            // console.log(timeObj.current)
            // console.log(timeRef.current)
            timeRef.current=x.payload.point["time"];
        });
        useEffect(() => {
            //create subscriber to DataHoverEvents (because all timeseries may not have been loaded once this plugin finished loading, the onClick-Effect gets added on the first DataHoverEvent)
            const subscriber = eventBus.getStream(DataHoverEvent).subscribe(() => {
                //find class u-over (Class of all timeseries) via jquery, then add onclick function to set Time (gotten from Tooltip) on State (triggers Re-Render)
                ($(document.body)).find(".u-over").on("click", function () {
                    //console.log(($("#grafana-portal-container")).find('[aria-label="Timestamp"]').html());
                    //update Time Variable to set it to current Position shown from Timestamp !!!! - Without Timestamp enabled, this does not work - so the plugin doesn't work then either.
                    //This could theoretically be fixed by using a time RefHook (that updates on DataHover (datahover includes position)
                    // -> on every position before a click) and then just sets itself to the state onclick
                    //TODO
                    setTime(timeRef.current);
                });
                subscriber.unsubscribe();
            })
            return () => {
                subscriber.unsubscribe();
            }
        }, [eventBus]);

        useEffect(() => {
            //needed Subscriber because else plugin malfunctions after "Edit Plugin" is used
            const subscriber = eventBus.getStream(ThemeChangedEvent).subscribe(() => {
                timeObj.current = updateTime(data, timeRange, time);
                });
            return () => {
                subscriber.unsubscribe();
            }
        }, [eventBus, data,time,timeRange]);

        //Zukunftsmusik: Follow Arrow TODO -> As stated above, this was one idea to follow every DataHoverEvent, but is Obsolete and unusable! (Does not use RefHook)
        /*useEffect(() => {
            const subscriber = eventBus.getStream(DataHoverEvent).subscribe(event => {
                let t;
                // @ts-ignore
                if (event.payload.rowIndex) {
                    // @ts-ignore
                    t = event.payload.data?.fields[0].values.buffer[event.payload.rowIndex]
                    let vid = document.getElementById("testVid") as HTMLVideoElement | null;
                    if (vid) {
                        vid.currentTime = event.payload.rowIndex / event.payload.data?.fields[0].values.buffer.length * vid.duration;
                    }
                }
            })
            return () => {
                subscriber.unsubscribe();
            }
        });*/

        //timeObject is set to Return value of updateTime -> updateTime sets Time according to Annotation borders and syncs video playback around it. Does not care about seconds / real-time yet. Can easily be programmed to do so - just by removing one border (tfrom or tto) and then calculating from video duration instead of between the borders
        timeObj.current = updateTime(data, timeRange, time);

    //console.log(playbackTime);

        //get video element from DOM
        let vid = document.getElementById("Vid_" + videoURL) as HTMLVideoElement | null;

        //Define video Callback handler Function (sends new DataHoverEvent on every frame in supported browsers)
        const funcToHandle = () => {
            eventBus?.publish({
                type: DataHoverEvent.type,
                payload: {
                    point: {
                        time: (vid?.currentTime && vid?.duration && timeObj.current.tfrom) ? timeObj.current.tfrom + vid?.currentTime*1000 : 0,
                        x: null,
                    },
                },
            });
            vid?.requestVideoFrameCallback(funcToHandle);
        };
        //if vid is available -> set currentTime to clicked position
        if (vid) {
            if (timeObj.current.playbackTime) {
                vid.currentTime = timeObj.current.playbackTime;
            }

        }
        let publishEventEnter = function () {
        };
        let publishEventLeave = function () {
        };

        let intervalID: string | number | NodeJS.Timeout | undefined;
        //check if browser supports requestVideoFrameCallback
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
            vid?.requestVideoFrameCallback(funcToHandle);
        } else {
            //if browser does not support VideoFrameCallback - update Timestamp all 15ms when mouse hovers over video panel (Syncs)
            publishEventLeave = function () {
                clearInterval(intervalID);
                eventBus?.publish({
                    type: DataHoverClearEvent.type,
                    payload: {
                        point: {
                            time: (vid?.currentTime && vid?.duration && timeObj.current.tfrom) ? timeObj.current.tfrom + vid?.currentTime*1000 : 0,
                            x: null,
                        },
                    },
                });
            }
            ;
            publishEventEnter = function () {
                eventBus?.publish({
                    type: DataHoverEvent.type,
                    payload: {
                        point: {
                            time: (vid?.currentTime && vid?.duration && timeObj.current.tfrom) ? timeObj.current.tfrom + vid?.currentTime*1000 : 0,
                            x: null,
                        },
                    },
                });

                intervalID = setInterval(function () {
                    eventBus?.publish({
                        type: DataHoverEvent.type,
                        payload: {
                            point: {
                                time: (vid?.currentTime && vid?.duration && timeObj.current.tfrom) ? timeObj.current.tfrom + vid?.currentTime*1000 : 0,
                                x: null,
                            },
                        },
                    });
                    //console.log(now,metadata);
                    vid?.requestVideoFrameCallback(funcToHandle);

                }, 15);
            }
        }
        //return wrapper with specified Events and video container
        return (
            <div
                className={cx(
                    styles.wrapper,
                    css`
                      width: ${width}px;
                      height: ${height}px;
                    `
                )}
                onMouseEnter={() => publishEventEnter()}
                onMouseLeave={() => publishEventLeave()}
            >
                <video id={"Vid_" + videoURL}
                       className={cx(
                           styles.video,
                           css`
                             width: ${width}px;
                             height: ${height}px;            `
                       )}
                       controls
                >
                    <source src={videoURL}></source>
                </video>
            </div>
        );
    }
;


const getStyles = () => {
    return {
        wrapper: css`
          position: absolute;
        `,
        video: css`
          top: 0;
          left: 0;
        `,
    };
}

interface SeriesData {
    series: Array<{
        fields: Array<Field<any, Vector<any>>>;
        length: number;
        source: Array<{
            tags: string[];
            time: number;

        }>;
    }>;
    state: LoadingState;
    timeRange: TimeRange;

}
function updateTime (data: unknown, timeRange: TimeRange, time: number) {
    let playbackTime: number | null,  tfrom = 0;
    //DATA is Data from Annotations! If no data is present or if the datasource of the panel is not configured as the annotations of the u-plot associated, this plugin will malfunction!
    let dat = data as unknown as SeriesData;
    if (dat.series && dat.series[0]) {
        console.log(dat.series[0]);
        if (dat.series[0]["source"]) {
            for (let i = 0; i < dat.series[0]["source"].length; i++) {
                if (dat.series[0]["source"][i]["tags"].includes("automatedTimeStartAnnotation")) {
                    tfrom = dat.series[0]["source"][i]["time"];
                }
            }
        } else if (dat.series[0]["fields"][5]) {
            for (let i = 0; i < dat.series[0].length; i++) {
                if (dat.series[0]["fields"][5].values[i].includes("automatedTimeStartAnnotation")) {
                    tfrom = dat.series[0]["fields"][2].values[i];
                }
            }
        }
        //console.log(dat.series[0]["source"])
    } else {
        //console.log(dat);
    }
//console.log(timeRange);
    if (!tfrom) {
        tfrom = timeRange.from as unknown as number;
    }
    playbackTime = (time - tfrom)/1000;
    console.log(playbackTime);
    let times = {
        "playbackTime":playbackTime,
        "tfrom":tfrom,
    }
    return (times);
}
