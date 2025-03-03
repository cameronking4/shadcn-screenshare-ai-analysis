import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Get the image data array from the request
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    // Process images in parallel with a concurrency limit
    const concurrencyLimit = 3; // Adjust based on API rate limits
    const analyses: string[] = [];
    
    // Process images in batches to respect concurrency limits
    for (let i = 0; i < images.length; i += concurrencyLimit) {
      const batch = images.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (imageData, index) => {
        try {
          // Validate image data
          if (!imageData || !imageData.startsWith('data:image/')) {
            return `Image ${i + index} has invalid format`;
          }
          
          // Extract the base64 data
          const base64Image = imageData.split(',')[1];
          if (!base64Image) {
            return `Failed to extract base64 data from image ${i + index}`;
          }
          
          // Call the OpenAI API to analyze the image
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant that analyzes screenshots of web pages. Provide a concise summary of what you see in the image, focusing on the main content, layout, and any notable elements. If you cannot see any content or the image appears blank, explicitly state this.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze this screenshot of a web page:' },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 500,
          });
          
          return response.choices[0].message.content || 'No analysis available';
        } catch (error) {
          return `Error analyzing image ${i + index}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      });
      
      // Wait for all promises in this batch to resolve
      const batchResults = await Promise.all(batchPromises);
      analyses.push(...batchResults);
    }

    // Return all analyses
    return NextResponse.json({
      analyses,
    });
  } catch (error) {
    // Provide more detailed error information
    let errorMessage = 'Failed to analyze images';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
