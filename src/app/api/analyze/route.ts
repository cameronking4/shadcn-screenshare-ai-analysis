import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Get the image data from the request
    const { imageData } = await req.json();

    if (!imageData) {
      console.error('No image data provided in request');
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Check if the image data is valid
    if (!imageData.startsWith('data:image/')) {
      console.error('Image data does not have a valid data URL prefix');
      return NextResponse.json(
        { error: 'Invalid image data - missing data URL prefix' },
        { status: 400 }
      );
    }
    
    if (imageData.length < 1000) {
      console.error('Image data is too small, likely invalid:', imageData.substring(0, 100));
      return NextResponse.json(
        { error: 'Invalid image data - content too small' },
        { status: 400 }
      );
    }

    console.log(`Received image data of length: ${imageData.length}`);

    // Extract the base64 data
    let base64Image = '';
    try {
      // Remove the data URL prefix
      base64Image = imageData.split(',')[1];
      
      if (!base64Image) {
        throw new Error('Failed to extract base64 data');
      }
      
      console.log(`Processed base64 image of length: ${base64Image.length}`);
    } catch (error) {
      console.error('Error processing image data:', error);
      return NextResponse.json(
        { error: 'Failed to process image data' },
        { status: 400 }
      );
    }

    // Call the OpenAI API to analyze the image
    console.log('Calling OpenAI API...');
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
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    console.log('OpenAI API response received');
    
    // Check if the response indicates no content was visible
    const content = response.choices[0].message.content || '';
    if (content.toLowerCase().includes('cannot see') || 
        content.toLowerCase().includes('no content') || 
        content.toLowerCase().includes('blank') || 
        content.toLowerCase().includes('empty')) {
      console.warn('OpenAI reported not seeing content in the image');
    }

    // Return the analysis
    return NextResponse.json({
      analysis: content,
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to analyze image';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      console.error(error.stack);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
