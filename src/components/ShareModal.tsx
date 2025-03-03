"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

type ShareOption = "tab" | "window" | "screen";

export default function ShareModal({ 
  open,
  onOpenChange,
  onAnalysisComplete,
  onStreamCapture
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: (analysis: string) => void;
  onStreamCapture?: (stream: MediaStream) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<ShareOption>("tab");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const [analyses, setAnalyses] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to capture a screenshot from the stream
  const captureScreenshot = (stream: MediaStream): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a new video element specifically for this capture
        // This avoids issues with reusing the same video element
        const tempVideo = document.createElement('video');
        tempVideo.autoplay = true;
        tempVideo.playsInline = true;
        tempVideo.muted = true;
        
        // Make sure we have a canvas
        if (!canvasRef.current) {
          reject(new Error("Canvas element not available"));
          return;
        }
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
        
        if (!context) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Log the stream state
        const videoTracks = stream.getVideoTracks();
        console.log("Preparing to capture from stream:", {
          active: stream.active,
          videoTracks: videoTracks.length,
          trackEnabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
          trackReadyState: videoTracks.length > 0 ? videoTracks[0].readyState : 'No tracks',
          shareOption: selectedOption
        });
        
        // If stream is not active or has no tracks, create a fallback image
        if (!stream.active || videoTracks.length === 0 || 
            (videoTracks.length > 0 && videoTracks[0].readyState === 'ended')) {
          console.warn("Stream is not active or has no valid tracks");
          createFallbackImage(context, canvas, "Stream is not active");
          const fallbackScreenshot = canvas.toDataURL('image/png');
          resolve(fallbackScreenshot);
          return;
        }
        
        // Set up the video with the stream
        tempVideo.srcObject = stream;
        
        // Use the main video element as a backup
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Function to create a fallback image with text
        function createFallbackImage(ctx: CanvasRenderingContext2D, cnv: HTMLCanvasElement, message: string) {
          // Set canvas to a standard size
          cnv.width = 1280;
          cnv.height = 720;
          
          // Fill with a color
          ctx.fillStyle = 'rgb(30, 30, 30)';
          ctx.fillRect(0, 0, cnv.width, cnv.height);
          
          // Add text
          ctx.fillStyle = 'white';
          ctx.font = '30px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(message, cnv.width / 2, cnv.height / 2);
          ctx.font = '20px Arial';
          ctx.fillText('Please try again with a different tab or window', cnv.width / 2, cnv.height / 2 + 40);
          
          console.log("Created fallback image with message:", message);
        }
        
        // Function to attempt drawing the video frame to canvas
        const captureFrame = () => {
          try {
            // Get dimensions from the temp video or the main video ref as fallback
            let videoWidth = tempVideo.videoWidth;
            let videoHeight = tempVideo.videoHeight;
            
            // If temp video dimensions are not available, try the main video ref
            if ((!videoWidth || !videoHeight) && videoRef.current) {
              videoWidth = videoRef.current.videoWidth;
              videoHeight = videoRef.current.videoHeight;
            }
            
            // If we still don't have dimensions, use fallback
            if (!videoWidth || !videoHeight) {
              console.warn("Could not get video dimensions, using fallback");
              createFallbackImage(context, canvas, "Could not get video dimensions");
              const fallbackScreenshot = canvas.toDataURL('image/png');
              resolve(fallbackScreenshot);
              return;
            }
            
            // Set canvas dimensions to match video
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            console.log(`Canvas dimensions set to ${canvas.width}x${canvas.height}`);
            
            // Try to draw from temp video first
            if (tempVideo.videoWidth && tempVideo.videoHeight) {
              context.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
              console.log("Frame drawn from temp video successfully");
            } 
            // Fall back to main video ref if temp video failed
            else if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
              context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              console.log("Frame drawn from main video ref successfully");
            }
            // If both failed, create a fallback image
            else {
              console.warn("Failed to draw video to canvas");
              createFallbackImage(context, canvas, "Failed to capture screen content");
              const fallbackScreenshot = canvas.toDataURL('image/png');
              resolve(fallbackScreenshot);
              return;
            }
            
            // Convert canvas to data URL (base64 image)
            const screenshot = canvas.toDataURL('image/png');
            
            // Check if the screenshot is valid (not too small)
            if (screenshot.length < 5000) { // Increased threshold
              console.warn("Screenshot appears to be empty or invalid (too small)");
              createFallbackImage(context, canvas, "Screen capture produced empty image");
              const fallbackScreenshot = canvas.toDataURL('image/png');
              resolve(fallbackScreenshot);
            } else {
              // Log the screenshot size to help with debugging
              console.log("Screenshot captured successfully, size:", screenshot.length);
              resolve(screenshot);
            }
            
            // Clean up
            tempVideo.pause();
            tempVideo.srcObject = null;
          } catch (err) {
            console.error("Error in captureFrame:", err);
            createFallbackImage(context, canvas, "Error capturing frame");
            const fallbackScreenshot = canvas.toDataURL('image/png');
            resolve(fallbackScreenshot);
          }
        };
        
        // Set up event handlers for the temp video
        tempVideo.onloadedmetadata = () => {
          console.log("Temp video loaded metadata", {
            videoWidth: tempVideo.videoWidth,
            videoHeight: tempVideo.videoHeight,
            readyState: tempVideo.readyState
          });
          
          tempVideo.play()
            .then(() => {
              console.log("Temp video playback started");
              // Wait a bit longer to ensure the frame is rendered
              setTimeout(captureFrame, 500);
            })
            .catch(err => {
              console.error("Error playing temp video:", err);
              // Try with the main video ref as fallback
              if (videoRef.current && videoRef.current.srcObject) {
                console.log("Falling back to main video ref");
                setTimeout(captureFrame, 500);
              } else {
                createFallbackImage(context, canvas, "Failed to play video");
                const fallbackScreenshot = canvas.toDataURL('image/png');
                resolve(fallbackScreenshot);
              }
            });
        };
        
        tempVideo.onerror = (err) => {
          console.error("Temp video element error:", err);
          // Try with the main video ref as fallback
          if (videoRef.current && videoRef.current.srcObject) {
            console.log("Falling back to main video ref after error");
            setTimeout(captureFrame, 500);
          } else {
            createFallbackImage(context, canvas, "Video element error");
            const fallbackScreenshot = canvas.toDataURL('image/png');
            resolve(fallbackScreenshot);
          }
        };
        
        // Set a timeout in case the video never loads
        const timeoutId = setTimeout(() => {
          console.warn("Capture timed out");
          createFallbackImage(context, canvas, "Capture timed out");
          const fallbackScreenshot = canvas.toDataURL('image/png');
          resolve(fallbackScreenshot);
        }, 5000); // 5 second timeout
        
        // Add event listener to clear timeout when metadata is loaded
        tempVideo.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId);
        }, { once: true });
        
      } catch (err) {
        console.error("Unexpected error in captureScreenshot:", err);
        reject(err);
      }
    });
  };

  // Function to download the screenshot to a file
  const downloadScreenshot = (imageData: string, filename: string = 'screenshot.png') => {
    try {
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = imageData;
      downloadLink.download = filename;
      
      // Append to the document, click it, and remove it
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log(`Screenshot downloaded as ${filename}`);
    } catch (err) {
      console.error('Error downloading screenshot:', err);
    }
  };

  // Function to analyze the screenshot with AI
  const analyzeScreenshot = async (imageData: string, frameNumber: number): Promise<string> => {
    try {
      // Download the screenshot for testing purposes
      downloadScreenshot(imageData, `screenshot-frame-${frameNumber}-${Date.now()}.png`);
      
      console.log(`Sending frame ${frameNumber} to API, data length:`, imageData.length);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.analysis || 'No analysis available';
    } catch (error) {
      console.error(`Error analyzing frame ${frameNumber}:`, error);
      return `Failed to analyze frame ${frameNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };
  
  // Function to summarize all analyses
  const summarizeAnalyses = async (allAnalyses: string[]): Promise<string> => {
    try {
      if (allAnalyses.length === 0) {
        return "No frames were successfully analyzed.";
      }
      
      if (allAnalyses.length === 1) {
        return allAnalyses[0];
      }
      
      console.log(`Summarizing ${allAnalyses.length} frame analyses...`);
      
      // For more than one analysis, send to OpenAI to summarize
      const response = await fetch('/api/analyze/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analyses: allAnalyses }),
      });

      if (!response.ok) {
        throw new Error(`Summary API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.summary || 'No summary available';
    } catch (error) {
      console.error('Error summarizing analyses:', error);
      // Return a concatenation of all analyses as fallback
      return `Failed to generate summary. Individual frame analyses:\n\n${allAnalyses.join('\n\n')}`;
    }
  };

  // Function to start periodic screen capture
  const startPeriodicCapture = (stream: MediaStream) => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    setIsRecording(true);
    setCaptureCount(0);
    setAnalyses([]);
    
    // Capture a frame every second
    captureIntervalRef.current = setInterval(async () => {
      try {
        if (!stream.active) {
          console.log("Stream is no longer active, stopping periodic capture");
          stopPeriodicCapture();
          return;
        }
        
        const frameNumber = captureCount + 1;
        setCaptureCount(frameNumber);
        
        console.log(`Capturing frame ${frameNumber}...`);
        const screenshot = await captureScreenshot(stream);
        
        // Analyze the screenshot
        const analysis = await analyzeScreenshot(screenshot, frameNumber);
        
        // Add the analysis to our collection
        setAnalyses(prev => [...prev, analysis]);
        
      } catch (err) {
        console.error("Error during periodic capture:", err);
      }
    }, 1000); // Capture every 1 second
  };
  
  // Function to stop periodic screen capture
  const stopPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // Function to start screen sharing
  const startScreenShare = async (option: ShareOption) => {
    setIsLoading(true);
    setError(null);
    setIsCapturing(true);
    setAnalyses([]);
    setCaptureCount(0);

    try {
      // Define the display media options based on the selected option
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          displaySurface: option,
        },
        audio: false,
      };

      console.log(`Requesting screen sharing with options:`, JSON.stringify(displayMediaOptions));
      
      // Request screen sharing
      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      // Log detailed information about the stream
      const videoTracks = stream.getVideoTracks();
      console.log("Screen sharing started. Stream details:", {
        id: stream.id,
        active: stream.active,
        videoTracks: videoTracks.length,
        videoTrackSettings: videoTracks.length > 0 ? videoTracks[0].getSettings() : 'No video tracks'
      });
      
      // Pass the stream to the parent component if the callback is provided
      if (onStreamCapture) {
        console.log("Passing stream to parent component");
        onStreamCapture(stream);
      } else {
        console.warn("No onStreamCapture callback provided");
      }
      
      // Start periodic screen capture
      startPeriodicCapture(stream);
      
      // Wait for user to stop sharing (when they click the "Stop sharing" button in the browser UI)
      const videoTrack = stream.getVideoTracks()[0];
      
      videoTrack.onended = async () => {
        console.log("User stopped sharing");
        setIsLoading(true);
        
        try {
          // Stop periodic capture
          stopPeriodicCapture();
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          // If we have analyses, summarize them
          if (analyses.length > 0) {
            console.log(`Summarizing ${analyses.length} frame analyses...`);
            try {
              const summary = await summarizeAnalyses(analyses);
              console.log("Summary received:", summary.substring(0, 50) + "...");
              
              // Pass the summary back to the parent component
              onAnalysisComplete(summary);
            } catch (summaryErr) {
              console.error("Error during summary:", summaryErr);
              // Even if summary fails, provide the individual analyses
              onAnalysisComplete(`Failed to summarize analyses. Captured ${analyses.length} frames:\n\n${analyses.join('\n\n')}`);
            }
          } else {
            console.log("No frames were analyzed");
            onAnalysisComplete("No frames were captured for analysis. Please try again and ensure your screen is shared for at least a few seconds.");
          }
          
          // Close the modal
          onOpenChange(false);
        } catch (err) {
          console.error("Error processing screen capture:", err);
          setError("Failed to analyze screen capture. Please try again.");
          setIsLoading(false);
          setIsCapturing(false);
        }
      };
    } catch (err) {
      console.error("Error starting screen share:", err);
      setError("Failed to start screen sharing. Please try again.");
      setIsLoading(false);
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    if (!isCapturing) {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Choose what to share</DialogTitle>
            <DialogDescription>
              The site will be able to see the contents of your screen
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="tab" className="mt-4" onValueChange={(value) => setSelectedOption(value as ShareOption)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="tab">Chrome Tab</TabsTrigger>
              <TabsTrigger value="window">Window</TabsTrigger>
              <TabsTrigger value="screen">Entire Screen</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tab" className="mt-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  When you click &quot;Share&quot;, you&apos;ll be prompted to select which tab you want to share.
                </p>
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2">
                    {isRecording && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"></span>
                        Recording: {captureCount} frames captured
                      </div>
                    )}
                    <Button 
                      onClick={() => startScreenShare("tab")}
                      disabled={isLoading || isCapturing}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : isCapturing && !isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Capturing...
                        </>
                      ) : isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        "Share"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="window" className="mt-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  When you click &quot;Share&quot;, you&apos;ll be prompted to select which window you want to share.
                </p>
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2">
                    {isRecording && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"></span>
                        Recording: {captureCount} frames captured
                      </div>
                    )}
                    <Button 
                      onClick={() => startScreenShare("window")}
                      disabled={isLoading || isCapturing}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : isCapturing && !isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Capturing...
                        </>
                      ) : isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        "Share"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="screen" className="mt-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  When you click &quot;Share&quot;, you&apos;ll be prompted to share your entire screen.
                </p>
                <div className="flex justify-end">
                  <div className="flex flex-col items-end gap-2">
                    {isRecording && (
                      <div className="flex items-center gap-2 text-sm text-red-500">
                        <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"></span>
                        Recording: {captureCount} frames captured
                      </div>
                    )}
                    <Button 
                      onClick={() => startScreenShare("screen")}
                      disabled={isLoading || isCapturing}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Starting...
                        </>
                      ) : isCapturing && !isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Capturing...
                        </>
                      ) : isRecording ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        "Share"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Hidden video and canvas elements for capturing screenshots */}
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
}
