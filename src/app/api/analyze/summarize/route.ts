import { OpenAI } from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    // Get the analyses from the request
    const { analyses } = await req.json();

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      console.error('No analyses provided in request');
      return NextResponse.json(
        { error: 'Analyses array is required' },
        { status: 400 }
      );
    }

    console.log(`Received ${analyses.length} analyses to summarize`);

    // Call the OpenAI API to summarize the analyses
    console.log('Calling OpenAI API for summary...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that summarizes multiple analyses of screen recordings. Provide a comprehensive summary that captures the key information from all the individual frame analyses. Focus on the main content, activities, and changes observed across the frames.',
        },
        {
          role: 'user',
          content: `I have ${analyses.length} analyses of frames from a screen recording. Please provide a comprehensive summary:\n\n${analyses.join('\n\n')}`,
        },
      ],
      max_tokens: 1000,
    });

    console.log('OpenAI API summary response received');
    
    // Return the summary
    return NextResponse.json({
      summary: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Error summarizing analyses:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to summarize analyses';
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
