import React, {useRef,useState } from 'react';
import styles from './video-help.module.scss';


const VideoHelpPage = ({ videoFile,  }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused  || video.ended) {
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

    // Check if the next time point is within the buffered range.
    for(let i = 0; i < buffered.length; i++) {
        // If it is, update the current time.
        if(nextTime >= buffered.start(i) && nextTime < buffered.end(i)) {
            video.currentTime = nextTime;
            return;
        }
    }

    // If it isn't, set the current time to the latest point in the buffered range.
    video.currentTime = buffered.end(buffered.length - 1);
  };

  return (  
        
            <div style={{ display: 'flex', flexDirection: 'row'}}>
              
           <div className={styles.fastRewind} onClick={handleRewind} />


        <div style={{ backgroundColor: 'white' , flex: 19, borderStyle:"solid", display:"grid" , margin: "3px" }} >
      
          <video  ref={videoRef} onClick={handlePlayPause} width='100%' style={{objectPosition: "left top", objectFit:"cover", backgroundColor: '#fff' }} preload="auto" autoPlay playsinline  muted loop >
          <source src={videoFile} type="video/webm" />
          Your browser does not support the video tag.
        </video>
        {!isPlaying && (
                <div style={{ 
                    display: "flex",
                    top: 0, 
                    left: 0, 
                    backgroundColor: 'rgba(255, 255, 255, 0.7)'
                }}>
                    Click to continue
                </div>
            )}
       


        </div>
        
        <div        
          className={styles.fastForward}
          onClick={handleFastForward}
        />
        </div>      
      
  
  );
}
export default VideoHelpPage;