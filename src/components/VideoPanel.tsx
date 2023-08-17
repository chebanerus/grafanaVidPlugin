import React, {useEffect, useRef, useState} from 'react';
import {
    DataHoverEvent,
    PanelProps,
    LoadingState,
    Field,
    Vector,
    TimeRange,
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
        //if videoURL !== true -> String Empty, avoid null value
        let videoURL = replaceVariables(options.videoURL || '');
        //const timezones = useMemo(() => getTimezones(options.timezone, timeZone), [options.timezone, timeZone]); // -> not needed
        //create OnClick-Handler
        useEffect(() => {
            //create subscriber to DataHoverEvents (because all timeseries may not have been loaded once this plugin finished loading)
            const subscriber = eventBus.getStream(DataHoverEvent).subscribe(() => {
                //find class u-over (Class of all timeseries) via jquery, then add onclick function to set Time (gotten from Tooltip) on State (triggers Re-Render)
                ($(document.body)).find(".u-over").on("click", function () {
                    //console.log(($("#grafana-portal-container")).find('[aria-label="Timestamp"]').html());
                    setTime(Date.parse(($("#grafana-portal-container")).find('[aria-label="Timestamp"]').html()));
                });
                subscriber.unsubscribe();
            })
            return () => {
                subscriber.unsubscribe();
            }
        }, [eventBus]);

        useEffect(() => {
            const subscriber = eventBus.getStream(ThemeChangedEvent).subscribe(() => {
                timeObj.current = updateTime(data, timeRange, time);
                });
            return () => {
                subscriber.unsubscribe();
            }
        }, [eventBus, data,time,timeRange]);

        //Zukunftsmusik: Follow Arrow
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

        timeObj.current = updateTime(data, timeRange, time);

    //console.log(playbackTime);
        let vid = document.getElementById("Vid_" + videoURL) as HTMLVideoElement | null;
        const funcToHandle = () => {
            eventBus?.publish({
                type: DataHoverEvent.type,
                payload: {
                    point: {
                        time: (vid?.currentTime && vid?.duration && timeObj.current.timespan) ? timeObj.current.tfrom + (vid?.currentTime / vid?.duration) * timeObj.current.timespan : 0,
                        x: null,
                    },
                },
            });
            vid?.requestVideoFrameCallback(funcToHandle);
        };
        if (vid) {
            if (timeObj.current.playbackTime) {
                vid.currentTime = timeObj.current.playbackTime * vid.duration;
            }

        }
        let publishEventEnter = function () {
        };
        let publishEventLeave = function () {
        };
        let intervalID: string | number | NodeJS.Timeout | undefined;
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
            vid?.requestVideoFrameCallback(funcToHandle);
        } else {
            publishEventLeave = function () {
                clearInterval(intervalID);
            }
            ;
            publishEventEnter = function () {
                eventBus?.publish({
                    type: DataHoverEvent.type,
                    payload: {
                        point: {
                            time: (vid?.currentTime && vid?.duration && timeObj.current.timespan) ? timeObj.current.tfrom + (vid?.currentTime / vid?.duration) * timeObj.current.timespan : 0,
                            x: null,
                        },
                    },
                });

                intervalID = setInterval(function () {
                    eventBus?.publish({
                        type: DataHoverEvent.type,
                        payload: {
                            point: {
                                time: (vid?.currentTime && vid?.duration && timeObj.current.timespan) ? timeObj.current.tfrom + (vid?.currentTime / vid?.duration) * timeObj.current.timespan : 0,
                                x: null,
                            },
                        },
                    });
                    //console.log(now,metadata);
                    vid?.requestVideoFrameCallback(funcToHandle);

                }, 15);
            }
        }

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
    let playbackTime: number | null, timespan: number | null = null, tfrom = 0, tto = 0;
    let dat = data as unknown as SeriesData;
    if (dat.series && dat.series[0]) {
        console.log(dat.series[0]);
        if (dat.series[0]["source"]) {
            for (let i = 0; i < dat.series[0]["source"].length; i++) {
                if (dat.series[0]["source"][i]["tags"].includes("automatedTimeStartAnnotation")) {
                    tfrom = dat.series[0]["source"][i]["time"];
                }
                if (dat.series[0]["source"][i]["tags"].includes("automatedTimeStopAnnotation")) {
                    tto = dat.series[0]["source"][i]["time"];
                }
            }
        } else if (dat.series[0]["fields"][5]) {
            for (let i = 0; i < dat.series[0].length; i++) {
                if (dat.series[0]["fields"][5].values[i].includes("automatedTimeStartAnnotation")) {
                    tfrom = dat.series[0]["fields"][2].values[i];
                }
                if (dat.series[0]["fields"][5].values[i].includes("automatedTimeStopAnnotation")) {
                    tto = dat.series[0]["fields"][2].values[i];
                }
            }
        }
        //console.log(dat.series[0]["source"])
    } else {
        //console.log(dat);
    }
//console.log(timeRange);
    if (!(tfrom && tto)) {
        tfrom = timeRange.from as unknown as number;
        tto = timeRange.to as unknown as number;
    }
//console.log(tto - tfrom);
    timespan = tto - tfrom;
    playbackTime = ((time - tfrom) / timespan);
    if (tto === 0 || tfrom === 0) {
        playbackTime = 0;
    }
    let times = {
        "playbackTime":playbackTime,
        "tfrom":tfrom,
        "tto":tto,
        "timespan":timespan
    }
    return (times);
}