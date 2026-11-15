import React, { useRef, useState } from "react";
import { FaBackward, FaForward, FaPause, FaPlay } from "react-icons/fa";
import styles from "./video-help.module.scss";

/** Silent demonstration video of a module, with play/pause and 10 s skips. */
const VideoHelpPage = ({ videoFile }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      // play() returns a promise that rejects when playback is not possible
      const started = video.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => setIsPlaying(false));
      }
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleRewind = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const handleFastForward = () => {
    const video = videoRef.current;
    if (!video) return;
    const buffered = video.buffered;
    // Nothing buffered yet (video still loading or failed to load)
    if (!buffered || buffered.length === 0) return;

    const nextTime = video.currentTime + 10;

    // Jump only inside what has been loaded
    for (let i = 0; i < buffered.length; i++) {
      if (nextTime >= buffered.start(i) && nextTime < buffered.end(i)) {
        video.currentTime = nextTime;
        return;
      }
    }
    video.currentTime = buffered.end(buffered.length - 1);
  };

  return (
    <figure className={styles.frame}>
      <div className={styles.bar}>
        <span className={styles.caption}>Demonstration</span>
        <span className={styles.controls}>
          <button type="button" className={styles.control} onClick={handleRewind} title="Back 10 seconds" aria-label="Back 10 seconds">
            <FaBackward size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.control}
            onClick={handlePlayPause}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <FaPause size={12} aria-hidden="true" /> : <FaPlay size={12} aria-hidden="true" />}
          </button>
          <button type="button" className={styles.control} onClick={handleFastForward} title="Forward 10 seconds" aria-label="Forward 10 seconds">
            <FaForward size={12} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className={styles.stage}>
        <video
          ref={videoRef}
          className={styles.video}
          onClick={handlePlayPause}
          preload="auto"
          autoPlay
          playsInline
          muted
          loop
        >
          <source src={videoFile} type="video/webm" />
          Your browser does not support the video tag.
        </video>
        {!isPlaying && (
          <button type="button" className={styles.paused} onClick={handlePlayPause}>
            <FaPlay size={14} aria-hidden="true" /> Click to continue
          </button>
        )}
      </div>
    </figure>
  );
};

export default VideoHelpPage;
