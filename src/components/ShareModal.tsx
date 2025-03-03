"use client";

import { useState } from "react";
import { useScreenCapture } from "@/hooks/use-screen-capture";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Camera, StopCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ShareOption = "tab" | "window" | "screen";

export default function ShareModal({ 
  open,
  onOpenChange,
  onAnalysisComplete,
  onStreamCapture,
  onFrameCapture
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalysisComplete: (analysis: string) => void;
  onStreamCapture?: (stream: MediaStream) => void;
  onFrameCapture?: (count: number) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<ShareOption>("tab");
  
  // Use the custom hook for screen capture
  const {
    startCapture,
    stopCapture,
    isCapturing,
    isRecording,
    isProcessing,
    error,
    captureCount,
    videoRef,
    canvasRef,
  } = useScreenCapture({
    onStreamCapture,
    onFrameCapture,
    onAnalysisComplete: (analysis) => {
      onOpenChange(false);
      onAnalysisComplete(analysis);
    },
  });

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
          
          {isCapturing ? (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {isRecording ? 'Recording in progress...' : 'Preparing capture...'}
                  </span>
                  {isRecording && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <span className="animate-pulse h-2 w-2 rounded-full bg-red-500"></span>
                      {captureCount} frames captured
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={stopCapture}
                  variant="destructive"
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop Sharing
                </Button>
              </div>
            </div>
          ) : (
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
                    <Button 
                      onClick={() => startCapture("tab")}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Share Tab
                    </Button>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="window" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    When you click &quot;Share&quot;, you&apos;ll be prompted to select which window you want to share.
                  </p>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => startCapture("window")}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Share Window
                    </Button>
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="screen" className="mt-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    When you click &quot;Share&quot;, you&apos;ll be prompted to share your entire screen.
                  </p>
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => startCapture("screen")}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Share Screen
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
          
          {isProcessing && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Processing captured frames...</span>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Analyzing {captureCount} frames with OpenAI
                </p>
              </div>
            </div>
          )}
          
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
