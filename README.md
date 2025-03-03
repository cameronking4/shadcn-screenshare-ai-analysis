# Tab Activity Analyzer

A Next.js application that captures and analyzes activity in browser tabs, windows, or entire screens using OpenAI's GPT-4o mini model.

[![YouTube Video vPWOnqzGBnE](https://utfs.io/f/nGnSqDveMsqxsX10H2Vzcn2ZISXo7uLb4sxJiMEfrV5gDThd)](https://www.youtube.com/watch?v=vPWOnqzGBnE)

## Overview

Tab Activity Analyzer allows users to:

1. Select a capture source (browser tab, application window, or entire screen)
2. View the captured video stream in real-time
3. Receive an AI-generated summary of the activity that occurred during the capture session

The application uses the Screen Capture API to record frames from the selected source, processes them with OpenAI's vision capabilities, and provides a comprehensive analysis of the content.

## Features

- **Multiple Capture Sources**: Capture from browser tabs, application windows, or your entire screen
- **Real-time Preview**: Watch the captured content in a live preview window
- **Adaptive Frame Capture**: Intelligently adjusts capture rate based on content changes
- **Batch Processing**: Efficiently processes frames in batches to reduce API calls
- **Comprehensive Analysis**: Provides detailed summaries of captured content using OpenAI

## Technical Implementation

### Core Technologies

- **Next.js**: React framework for the frontend and API routes
- **Screen Capture API**: Browser API for capturing screen content
- **OpenAI API**: GPT-4o mini for analyzing visual content
- **TypeScript**: Type-safe code throughout the application

### Key Components

- **Custom Hook**: `useScreenCapture` manages the screen capture logic
- **API Routes**: Process and analyze captured frames
- **UI Components**: Provide an intuitive interface for capturing and viewing content

### Performance Optimizations

- **Adaptive Capture Rate**: Captures more frames during activity, fewer during idle periods
- **Frame Buffering**: Collects frames in a buffer before sending to the API
- **Change Detection**: Only processes frames that show significant changes
- **Batch Processing**: Analyzes multiple frames in a single API call

## Getting Started

### Prerequisites

- Node.js 18.x or later
- An OpenAI API key with access to GPT-4o mini

### Environment Setup

Create a `.env.local` file in the root directory with:

```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Click on one of the capture options (Tab, Window, Screen) or the "Start Capturing" button
2. Select the content you want to capture from the browser dialog
3. Watch the live preview as the content is captured
4. When finished, click "Stop Sharing" or close the browser's sharing dialog
5. Wait for the AI to analyze the captured frames
6. View the comprehensive summary of the captured activity

## How It Works

1. **Capture**: The application uses the browser's Screen Capture API to record frames from the selected source
2. **Processing**: Frames are captured at an adaptive rate, buffered, and sent in batches to the OpenAI API
3. **Analysis**: Each frame is analyzed by OpenAI's GPT-4o mini model to identify content and activity
4. **Summary**: The individual frame analyses are combined into a comprehensive summary of the activity

## License

This project is licensed under the MIT License - see the LICENSE file for details.
