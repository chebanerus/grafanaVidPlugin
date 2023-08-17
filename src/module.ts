import {PanelPlugin} from '@grafana/data';
import {VideoOptions} from './types';
import {VideoPanel} from './components/VideoPanel';

export const plugin = new PanelPlugin<VideoOptions>(VideoPanel).setNoPadding().setPanelOptions((builder) => {
    return builder
        .addRadio({
            path: 'videoType',
            name: 'Source',
            defaultValue: 'url',
            settings: {
                options: [
                    {
                        value: 'url',
                        label: 'File',
                    },
                ],
            },
        })
        .addTextInput({
            path: 'videoURL',
            name: 'URL',
            description: 'A URL to a valid video file.',
            settings: {
                placeholder: 'https://example.com/video.mp4',
            },
            showIf: (config) => config.videoType === 'url',
        })
});
