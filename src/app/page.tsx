"use client";

import { useState, useRef, useEffect } from "react";
import ShareModal from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Share2, RefreshCw } from "lucide-react";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAnalysisComplete = (analysisResult: string) => {
    setIsAnalyzing(false);
    setAnalysis(analysisResult);
  };

  const handleStreamCapture = (capturedStream: MediaStream) => {
    console.log("Stream captured in parent component:", capturedStream);
    setStream(capturedStream);
    
    // Connect the stream to the video element
    if (videoRef.current) {
      videoRef.current.srcObject = capturedStream;
      videoRef.current.play()
        .then(() => console.log("Video playback started successfully"))
        .catch(err => console.error("Error playing video:", err));
    } else {
      console.error("Video element reference is not available");
    }
  };

  const handleShareAnother = () => {
    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    setAnalysis(null);
    setIsModalOpen(true);
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
          <h1 className="text-4xl font-bold tracking-tight">Tab Sharing App</h1>
          <p className="text-muted-foreground">
            Share your screen and get AI analysis of your content
          </p>
        </div>

        {!analysis && !isAnalyzing && (
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleOpenModal}
              className="gap-2"
            >
              <Share2 className="h-5 w-5" />
              View Other Tabs
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle className="text-center">Analyzing your screen</CardTitle>
              <CardDescription className="text-center">
                Please wait while we analyze your screen with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-10">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                Processing your screenshot...
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
                    <strong>Note:</strong> This analysis is based on multiple frames captured during your screen sharing session.
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
      <div className={`fixed bottom-4 right-4 z-10 shadow-lg rounded-lg overflow-hidden border-2 border-primary ${stream ? 'block' : 'hidden'}`}>
        <video 
          ref={videoRef} 
          className="w-64 h-auto" 
          autoPlay 
          playsInline
          muted 
        />
        <div className="absolute top-0 left-0 bg-black/70 text-white text-xs px-2 py-1">
          Live Preview
        </div>
      </div>
      
      {/* Hidden video element that's always in the DOM to help with initialization */}
      <video 
        style={{ 
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          opacity: 0,
          pointerEvents: 'none'
        }} 
        muted 
      />

      <ShareModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onAnalysisComplete={(result) => {
          handleCloseModal();
          setIsAnalyzing(true);
          // Simulate a delay for the analysis
          setTimeout(() => handleAnalysisComplete(result), 2000);
        }}
        onStreamCapture={handleStreamCapture}
      />
    </div>
  );
}
