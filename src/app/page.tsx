"use client";

import { useState, useRef, useEffect } from "react";
import ShareModal from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Share2, RefreshCw, Maximize2, Minimize2 } from "lucide-react";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  // };

  const handleAnalysisComplete = (analysisResult: string) => {
    setIsAnalyzing(false);
    setAnalysis(analysisResult);
  };

  const handleStreamCapture = (capturedStream: MediaStream) => {
    setStream(capturedStream);
    
    // Connect the stream to the video element
    if (videoRef.current) {
      videoRef.current.srcObject = capturedStream;
      videoRef.current.play()
        .catch(err => console.error("Error playing video:", err));
    }
  };

  const handleShareAnother = () => {
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setAnalysis(null);
    setFrameCount(0);
    setIsModalOpen(true);
  };

  const togglePreviewSize = () => {
    setIsPreviewExpanded(!isPreviewExpanded);
  };

  // Clean up the stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="container mx-auto py-10 flex flex-col items-center min-h-screen">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Tab Activity Analyzer</h1>
          <p className="text-muted-foreground">
            Capture and analyze activity in other tabs with OpenAI
          </p>
        </div>

        {!analysis && !isAnalyzing && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Analyze Tab Activity</CardTitle>
              <CardDescription>
                Select a tab, window, or your entire screen to capture and analyze with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={handleOpenModal}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-primary/10">
                      <img src="/window.svg" alt="Tab" className="h-8 w-8" />
                    </div>
                    <h3 className="font-medium">Browser Tab</h3>
                    <p className="text-xs text-center text-muted-foreground">Capture a specific browser tab</p>
                  </div>
                </Card>
                
                <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={handleOpenModal}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-primary/10">
                      <img src="/file.svg" alt="Window" className="h-8 w-8" />
                    </div>
                    <h3 className="font-medium">Application Window</h3>
                    <p className="text-xs text-center text-muted-foreground">Capture a specific application window</p>
                  </div>
                </Card>
                
                <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={handleOpenModal}>
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-primary/10">
                      <img src="/globe.svg" alt="Screen" className="h-8 w-8" />
                    </div>
                    <h3 className="font-medium">Entire Screen</h3>
                    <p className="text-xs text-center text-muted-foreground">Capture your entire screen</p>
                  </div>
                </Card>
              </div>
              
              <Button 
                size="lg" 
                onClick={handleOpenModal}
                className="gap-2 mt-4"
              >
                <Share2 className="h-5 w-5" />
                Start Capturing
              </Button>
            </CardContent>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-center">Analyzing your screen recording</CardTitle>
              <CardDescription className="text-center">
                Please wait while we analyze your screen recording with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                Processing {frameCount} captured frames...
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You can continue watching the recording in the preview window
              </p>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Screen Recording Analysis</CardTitle>
              <CardDescription>
                AI analysis of your screen recording frames
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
                  <p className="text-sm">
                    <strong>Note:</strong> This analysis is based on {frameCount} frames captured during your screen sharing session.
                    Each frame was analyzed individually, and the results were summarized to provide a comprehensive overview.
                  </p>
                </div>
                
                <h3>Content Summary</h3>
                <div className="whitespace-pre-line">
                  {analysis}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Analysis powered by OpenAI GPT-4o mini
              </div>
              <Button 
                onClick={handleShareAnother}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Record Another Screen
              </Button>
            </CardFooter>
          </Card>
        )}

        <footer className="text-center text-sm text-muted-foreground">
          Built with Next.js, Screen Capture API, and GPT-4o mini
        </footer>
      </div>

      {/* Video element to display the stream - always render but only show when stream exists */}
      <div 
        className={`fixed ${isPreviewExpanded ? 'inset-0 z-50 bg-black/90' : 'bottom-4 right-4 z-10'} 
          shadow-lg rounded-lg overflow-hidden border-2 border-primary transition-all duration-300 
          ${stream ? 'block' : 'hidden'}`}
      >
        <video 
          ref={videoRef} 
          className={`${isPreviewExpanded ? 'w-full h-full object-contain' : 'w-80 h-auto'}`}
          autoPlay 
          playsInline
          muted 
        />
        <div className="absolute top-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 flex justify-between items-center">
          <span>Live Preview</span>
          <div className="flex items-center gap-2">
            {isAnalyzing && <span className="text-green-400 flex items-center gap-1">
              <span className="animate-pulse h-2 w-2 rounded-full bg-green-400"></span>
              Analyzing
            </span>}
            <button 
              onClick={togglePreviewSize}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isPreviewExpanded ? 
                <Minimize2 className="h-3 w-3" /> : 
                <Maximize2 className="h-3 w-3" />
              }
            </button>
          </div>
        </div>
      </div>

      <ShareModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onAnalysisComplete={handleAnalysisComplete}
        onStreamCapture={handleStreamCapture}
        onFrameCapture={(count) => setFrameCount(count)}
      />
    </div>
  );
}
