type VideoTypes = 'url';

export interface VideoOptions {
  videoType: VideoTypes;
  videoURL?: string;
}

export const ConditionalWrapper = ({ condition, wrapper, children }) => (condition ? wrapper(children) : children);
