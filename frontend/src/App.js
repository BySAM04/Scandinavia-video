import React, { useRef, useEffect, useState } from 'react';
import './App.css';

// All the high-quality Scandinavian landscape images
const images = [
  // Fjords and Mountains
  'https://images.pexels.com/photos/18937801/pexels-photo-18937801.jpeg',
  'https://images.pexels.com/photos/31539227/pexels-photo-31539227.jpeg',
  'https://images.unsplash.com/photo-1696537380062-e6275d9a3c8e',
  'https://images.unsplash.com/photo-1664734266597-6395d5881ce1',
  'https://images.pexels.com/photos/32367917/pexels-photo-32367917.jpeg',
  'https://images.pexels.com/photos/32397520/pexels-photo-32397520.jpeg',
  'https://images.unsplash.com/photo-1494791368093-85217fbbf8de',
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65',
  // Forests
  'https://images.unsplash.com/photo-1568864453925-206c927dab0a',
  'https://images.unsplash.com/photo-1511884642898-4c92249e20b6',
  'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1',
  'https://images.pexels.com/photos/6551897/pexels-photo-6551897.jpeg',
  // Lakes
  'https://images.unsplash.com/photo-1742458500183-7c5dd1ecd9eb',
  'https://images.unsplash.com/photo-1742458498544-fe7b769c6fa7',
  'https://images.pexels.com/photos/14144952/pexels-photo-14144952.jpeg',
  'https://images.pexels.com/photos/32383994/pexels-photo-32383994.jpeg'
];

// Instagram Story dimensions
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const VIDEO_DURATION = 15; // seconds
const FPS = 30;

function App() {
  const canvasRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadedImages, setLoadedImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationStateRef = useRef(false); // Use ref to track animation state

  // Preload all images with better error handling
  useEffect(() => {
    const loadImages = async () => {
      console.log('Starting to load images...');
      const imagePromises = images.map((src, index) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => {
            console.log(`Image ${index + 1} loaded successfully:`, {
              src: src.substring(0, 50) + '...',
              width: img.naturalWidth,
              height: img.naturalHeight
            });
            resolve(img);
          };
          
          img.onerror = (error) => {
            console.error(`Failed to load image ${index + 1}:`, src, error);
            // Create a fallback colored rectangle
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            
            // Create a gradient background as fallback
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];
            gradient.addColorStop(0, colors[index % colors.length]);
            gradient.addColorStop(1, colors[(index + 1) % colors.length]);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Convert canvas to image
            const fallbackImg = new Image();
            fallbackImg.src = canvas.toDataURL();
            fallbackImg.onload = () => resolve(fallbackImg);
          };
          
          // Set src last to trigger loading
          img.crossOrigin = 'anonymous';
          img.src = src;
        });
      });

      try {
        const loaded = await Promise.all(imagePromises);
        console.log(`Successfully loaded ${loaded.length} images`);
        setLoadedImages(loaded);
      } catch (error) {
        console.error('Error in image loading process:', error);
      }
    };

    loadImages();
  }, []);

  // Animation function with improved error handling
  const animate = (canvas, ctx, loadedImgs, startTime) => {
    if (!isAnimating) return;

    try {
      const currentTime = (Date.now() - startTime) / 1000; // Convert to seconds
      const progressPercent = Math.min(currentTime / VIDEO_DURATION, 1);
      setProgress(progressPercent);

      // Clear canvas with test color to verify it's working
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (loadedImgs.length === 0) {
        console.error('No loaded images available for animation');
        return;
      }

      // Calculate which images to show and transition between
      const totalScenes = Math.min(loadedImgs.length, 8); // Use first 8 images for better timing
      const sceneIndex = Math.floor((currentTime / VIDEO_DURATION) * totalScenes);
      const nextSceneIndex = (sceneIndex + 1) % totalScenes;
      const sceneProgress = ((currentTime / VIDEO_DURATION) * totalScenes) % 1;

      const currentImg = loadedImgs[sceneIndex];
      const nextImg = loadedImgs[nextSceneIndex];

      console.log(`Scene: ${sceneIndex}, Progress: ${sceneProgress.toFixed(2)}, Time: ${currentTime.toFixed(1)}s`);

      if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
        // Calculate scaling to cover the canvas while maintaining aspect ratio
        const imgAspect = currentImg.naturalWidth / currentImg.naturalHeight;
        const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawHeight = CANVAS_HEIGHT;
          drawWidth = drawHeight * imgAspect;
          offsetX = (CANVAS_WIDTH - drawWidth) / 2;
          offsetY = 0;
        } else {
          // Image is taller than canvas
          drawWidth = CANVAS_WIDTH;
          drawHeight = drawWidth / imgAspect;
          offsetX = 0;
          offsetY = (CANVAS_HEIGHT - drawHeight) / 2;
        }

        // Add zoom effect for dynamism
        const zoomFactor = 1 + (sceneProgress * 0.1); // Slight zoom during each scene
        drawWidth *= zoomFactor;
        drawHeight *= zoomFactor;
        offsetX -= (drawWidth - CANVAS_WIDTH) / 2;
        offsetY -= (drawHeight - CANVAS_HEIGHT) / 2;

        // Draw current image
        const fadeOut = sceneProgress > 0.7 ? (sceneProgress - 0.7) / 0.3 : 0;
        ctx.globalAlpha = 1 - fadeOut;
        
        try {
          ctx.drawImage(currentImg, offsetX, offsetY, drawWidth, drawHeight);
          console.log(`Drew current image ${sceneIndex} successfully`);
        } catch (imgError) {
          console.error('Error drawing current image:', imgError);
        }

        // Draw next image with fade-in effect
        if (nextImg && nextImg.complete && nextImg.naturalWidth > 0 && sceneProgress > 0.7) {
          ctx.globalAlpha = fadeOut;
          
          // Calculate scaling for next image
          const nextImgAspect = nextImg.naturalWidth / nextImg.naturalHeight;
          let nextDrawWidth, nextDrawHeight, nextOffsetX, nextOffsetY;
          
          if (nextImgAspect > canvasAspect) {
            nextDrawHeight = CANVAS_HEIGHT;
            nextDrawWidth = nextDrawHeight * nextImgAspect;
            nextOffsetX = (CANVAS_WIDTH - nextDrawWidth) / 2;
            nextOffsetY = 0;
          } else {
            nextDrawWidth = CANVAS_WIDTH;
            nextDrawHeight = nextDrawWidth / nextImgAspect;
            nextOffsetX = 0;
            nextOffsetY = (CANVAS_HEIGHT - nextDrawHeight) / 2;
          }

          try {
            ctx.drawImage(nextImg, nextOffsetX, nextOffsetY, nextDrawWidth, nextDrawHeight);
            console.log(`Drew next image ${nextSceneIndex} successfully`);
          } catch (imgError) {
            console.error('Error drawing next image:', imgError);
          }
        }

        ctx.globalAlpha = 1;
      } else {
        console.warn(`Image ${sceneIndex} not ready:`, {
          complete: currentImg?.complete,
          naturalWidth: currentImg?.naturalWidth,
          src: currentImg?.src
        });
        
        // Draw placeholder with scene info
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Loading Scene ${sceneIndex + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      // Add subtle vignette effect for cinematic feel
      const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT / 1.5
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (currentTime < VIDEO_DURATION) {
        requestAnimationFrame(() => animate(canvas, ctx, loadedImgs, startTime));
      } else {
        console.log('Animation completed');
        setIsAnimating(false);
        stopRecording();
      }
    } catch (error) {
      console.error('Animation error:', error);
      setIsAnimating(false);
      stopRecording();
    }
  };

  const startAnimation = async () => {
    if (loadedImages.length === 0) {
      alert('Images are still loading. Please wait...');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not available');
      return;
    }

    console.log('Starting animation with:', {
      canvasDimensions: `${canvas.width}x${canvas.height}`,
      loadedImages: loadedImages.length,
      imagesReady: loadedImages.filter(img => img.complete && img.naturalWidth > 0).length
    });
    
    setIsAnimating(true);
    setProgress(0);
    setVideoUrl(null);

    // Start recording
    startRecording(canvas);

    // Start animation
    const startTime = Date.now();
    console.log('Animation started at:', new Date(startTime));
    animate(canvas, ctx, loadedImages, startTime);
  };

  const startRecording = (canvas) => {
    recordedChunksRef.current = [];
    
    const stream = canvas.captureStream(FPS);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm'
      });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = 'scandinavian-roadtrip-story.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Scandinavian Roadtrip
        </h1>
        <h2 className="text-xl md:text-2xl text-blue-200 mb-2">Instagram Story Generator</h2>
        <p className="text-blue-300 max-w-2xl mx-auto">
          Create a stunning 15-second background video featuring beautiful Norwegian fjords, 
          dense forests, and serene lakes with smooth cinematic transitions.
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center space-y-6">
          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border-2 border-white/30 rounded-lg shadow-lg"
              style={{
                width: '216px',  // 1080/5 for preview
                height: '384px', // 1920/5 for preview
                backgroundColor: '#000'
              }}
            />
            
            {/* Progress bar */}
            {isAnimating && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-purple-400 h-full rounded-full transition-all duration-100"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="text-white text-xs mt-1 text-center">
                  {Math.round(progress * 100)}% • {(progress * VIDEO_DURATION).toFixed(1)}s / {VIDEO_DURATION}s
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center text-white">
              <p className="text-sm opacity-80 mb-2">
                Loaded {loadedImages.length} / {images.length} images
              </p>
              
              {loadedImages.length === images.length && (
                <p className="text-green-300 text-sm">✓ All images ready!</p>
              )}
            </div>

            <button
              onClick={startAnimation}
              disabled={isAnimating || loadedImages.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg 
                       hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {isAnimating ? 'Creating Video...' : 'Generate Instagram Story'}
            </button>

            {/* Debug test button */}
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Test canvas drawing
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 200, 200);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(200, 200, 200, 200);
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(400, 400, 200, 200);
                
                console.log('Canvas test completed');
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg"
            >
              Test Canvas
            </button>

            {videoUrl && (
              <div className="text-center space-y-3">
                <p className="text-green-300 font-semibold">✓ Video generated successfully!</p>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadVideo}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg
                             transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Download Video
                  </button>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg
                             transform hover:scale-105 transition-all duration-200 shadow-lg inline-block"
                  >
                    Preview Video
                  </a>
                </div>
                <p className="text-blue-200 text-xs max-w-md">
                  The video is generated in WebM format. For Instagram, you may need to convert it to MP4 
                  using an online converter or video editing software.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-blue-300 text-sm max-w-2xl">
        <p>
          🎬 This generator creates a cinematic 15-second video with smooth transitions between 
          stunning Scandinavian landscapes • Perfect for Instagram Stories (1080×1920) • 
          Features Norwegian fjords, dense forests, and serene lakes
        </p>
      </div>
    </div>
  );
}

export default App;