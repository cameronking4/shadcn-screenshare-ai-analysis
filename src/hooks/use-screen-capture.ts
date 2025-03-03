import { useState, useRef, useEffect } from 'react';

type CaptureOption = 'tab' | 'window' | 'screen';

interface UseScreenCaptureProps {
  onStreamCapture?: (stream: MediaStream) => void;
  onFrameCapture?: (count: number) => void;
  onAnalysisComplete?: (analysis: string) => void;
}

export function useScreenCapture({
  onStreamCapture,
  onFrameCapture,
  onAnalysisComplete,
}: UseScreenCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [analyses, setAnalyses] = useState<string[]>([]);
  const [captureRate, setCaptureRate] = useState(1000); // ms between captures, adaptive
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameBufferRef = useRef<string[]>([]);
  const lastFrameHashRef = useRef<string>('');
  
  // Simple hash function for comparing frames
  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  };
  
  // Function to capture a screenshot from the stream
  const captureScreenshot = async (mediaStream: MediaStream): Promise<string | null> => {
    if (!mediaStream.active || mediaStream.getVideoTracks().length === 0) {
      setError("Stream is not active or has no video tracks");
      return null;
    }
    
    if (!canvasRef.current) {
      setError("Canvas element not available");
      return null;
    }
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    
    if (!context) {
      setError("Could not get canvas context");
      return null;
    }
    
    return new Promise((resolve) => {
      // Use the video element to capture the frame
      if (videoRef.current && videoRef.current.srcObject === mediaStream) {
        const video = videoRef.current;
        
        // If video is already playing and has dimensions, capture immediately
        if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const screenshot = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality for better performance
          resolve(screenshot);
        } else {
          // Wait for video to be ready
          const handleVideoReady = () => {
            if (video.videoWidth && video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const screenshot = canvas.toDataURL('image/jpeg', 0.8);
              video.removeEventListener('loadeddata', handleVideoReady);
              resolve(screenshot);
            }
          };
          
          video.addEventListener('loadeddata', handleVideoReady, { once: true });
          
          // Set a timeout in case video never loads
          setTimeout(() => {
            video.removeEventListener('loadeddata', handleVideoReady);
            setError("Timeout waiting for video to load");
            resolve(null);
          }, 3000);
        }
      } else {
        setError("Video element not properly set up");
        resolve(null);
      }
    });
  };
  
  // Function to analyze a batch of screenshots
  const analyzeScreenshots = async (screenshots: string[]): Promise<void> => {
    if (screenshots.length === 0) return;
    
    try {
      // Send the batch of screenshots for analysis
      const response = await fetch('/api/analyze/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: screenshots }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add the analyses to our collection
      if (data.analyses && Array.isArray(data.analyses)) {
        setAnalyses(prev => [...prev, ...data.analyses]);
      }
    } catch (error) {
      setError(`Failed to analyze batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Function to process the frame buffer
  const processFrameBuffer = async () => {
    const buffer = frameBufferRef.current;
    if (buffer.length === 0) return;
    
    // Clear the buffer
    frameBufferRef.current = [];
    
    // Analyze the batch
    await analyzeScreenshots(buffer);
  };
  
  // Function to start periodic screen capture
  const startPeriodicCapture = (mediaStream: MediaStream) => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    setIsRecording(true);
    setCaptureCount(0);
    setAnalyses([]);
    frameBufferRef.current = [];
    lastFrameHashRef.current = '';
    
    // Capture frames at the current rate
    captureIntervalRef.current = setInterval(async () => {
      if (!mediaStream.active) {
        stopCapture();
        return;
      }
      
      const screenshot = await captureScreenshot(mediaStream);
      if (!screenshot) return;
      
      // Check if this frame is significantly different from the last one
      const frameHash = simpleHash(screenshot);
      const isDifferent = lastFrameHashRef.current !== frameHash;
      
      if (isDifferent || frameBufferRef.current.length === 0) {
        // Update frame count
        const newCount = captureCount + 1;
        setCaptureCount(newCount);
        
        // Add to buffer
        frameBufferRef.current.push(screenshot);
        lastFrameHashRef.current = frameHash;
        
        // Update parent component
        if (onFrameCapture) {
          onFrameCapture(newCount);
        }
        
        // Adapt capture rate based on change frequency
        if (isDifferent) {
          // If we detect changes, capture more frequently
          setCaptureRate(prev => Math.max(500, prev - 100));
        } else {
          // If no changes, slow down capture rate
          setCaptureRate(prev => Math.min(2000, prev + 100));
        }
        
        // Process buffer when it reaches threshold or after a time period
        if (frameBufferRef.current.length >= 5) {
          await processFrameBuffer();
        }
      }
    }, captureRate);
    
    // Also set up a timer to process any buffered frames periodically
    // even if they don't reach the threshold
    const bufferProcessInterval = setInterval(() => {
      if (frameBufferRef.current.length > 0) {
        processFrameBuffer();
      }
    }, 5000);
    
    // Clean up the buffer process interval when stopping
    return () => clearInterval(bufferProcessInterval);
  };
  
  // Function to stop capture
  const stopCapture = async () => {
    // Clear intervals
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setIsProcessing(true);
    
    // Process any remaining frames in buffer
    if (frameBufferRef.current.length > 0) {
      await processFrameBuffer();
    }
    
    // Stop all tracks in the stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // If we have analyses, summarize them
    if (analyses.length > 0) {
      try {
        const response = await fetch('/api/analyze/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ analyses }),
        });
        
        if (!response.ok) {
          throw new Error(`Summary API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Pass the summary back to the parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(data.summary || 'No summary available');
        }
      } catch (error) {
        setError(`Failed to summarize analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Even if summary fails, provide the individual analyses
        if (onAnalysisComplete) {
          onAnalysisComplete(`Failed to summarize analyses. Captured ${analyses.length} frames.`);
        }
      }
    } else {
      if (onAnalysisComplete) {
        onAnalysisComplete("No frames were captured for analysis. Please try again and ensure your screen is shared for at least a few seconds.");
      }
    }
    
    setIsProcessing(false);
    setIsCapturing(false);
  };
  
  // Function to start screen sharing
  const startCapture = async (option: CaptureOption) => {
    setError(null);
    setIsCapturing(true);
    setAnalyses([]);
    setCaptureCount(0);
    
    try {
      // Use the same simple options for all capture types
      // This ensures maximum compatibility across browsers
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: true,
        audio: false,
      };
      
      // Log the capture type for debugging
      console.log(`Attempting to capture ${option}`);
      
      // Request screen sharing
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      // Log what we actually got
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('Capture settings:', settings);
      
      setStream(mediaStream);
      
      // Pass the stream to the parent component
      if (onStreamCapture) {
        onStreamCapture(mediaStream);
      }
      
      // Connect the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      // Start periodic capture
      const cleanupBufferProcess = startPeriodicCapture(mediaStream);
      
      // Handle when user stops sharing
      videoTrack.onended = async () => {
        if (cleanupBufferProcess) cleanupBufferProcess();
        await stopCapture();
      };
    } catch (error) {
      setError(`Failed to start screen sharing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCapturing(false);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  return {
    startCapture,
    stopCapture,
    isCapturing,
    isRecording,
    isProcessing,
    error,
    captureCount,
    videoRef,
    canvasRef,
  };
}
