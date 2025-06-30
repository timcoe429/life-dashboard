import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log('Tasks parse API called');
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
    }, { status: 500 });
  }
  
  try {
    const { input } = await request.json();
    
    if (!input || input.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Input too short. Please provide a meaningful brain dump.',
      }, { status: 400 });
    }

    console.log('Parsing brain dump with AI:', input.substring(0, 100) + '...');
    
    // Use AI to intelligently break down the brain dump into multiple tasks
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert task management assistant. Your job is to take a user's brain dump (their stream of consciousness about things they need to do) and break it down into clear, actionable tasks.

IMPORTANT RULES:
1. Extract MULTIPLE distinct tasks from the input - don't create one giant task
2. Each task should be a clear, actionable item 
3. Remove filler words, "ums", and conversational fluff
4. Make task titles concise but complete (10-50 characters ideal)
5. Auto-detect energy level: "high" (urgent/focused work), "creative" (brainstorming/writing), "low" (quick calls/errands), "medium" (default)
6. Auto-detect relevant tags from this list: work, personal, health, shopping, fitness, content, learning, finance, travel, household, urgent
7. Auto-detect context: "home", "office", "phone", "computer", "anywhere" (default)
8. If the user mentions timeframes, note them but don't make them part of the task title

Return a JSON array of tasks in this exact format:
[
  {
    "text": "Call mom about weekend plans",
    "energy": "low",
    "tags": ["personal"],
    "context": "phone",
    "priority": "medium"
  },
  {
    "text": "Review project proposal deadline Friday",
    "energy": "high", 
    "tags": ["work", "urgent"],
    "context": "office",
    "priority": "high"
  }
]

Priority should be: "high" (urgent/important), "medium" (normal), "low" (nice to have)

Be generous in extracting tasks - if someone mentions 5 different things, create 5 tasks!`
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0.3,
    });

    console.log('AI response received');
    let tasks;
    try {
      const responseText = aiResponse.choices[0].message.content;
      console.log('Raw AI response:', responseText);
      
      // Parse the JSON response
      tasks = JSON.parse(responseText);
      
      // Validate the response structure
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each task has required fields
      tasks.forEach((task, index) => {
        if (!task.text || typeof task.text !== 'string') {
          throw new Error(`Task ${index} missing valid text field`);
        }
        if (!task.energy) task.energy = 'medium';
        if (!task.tags) task.tags = [];
        if (!task.context) task.context = 'anywhere';
        if (!task.priority) task.priority = 'medium';
      });
      
    } catch (parseError) {
      console.error('AI Response parsing error:', parseError);
      console.error('Raw response:', aiResponse?.choices?.[0]?.message?.content);
      return NextResponse.json({
        success: false,
        error: 'AI response parsing failed. Please try rephrasing your brain dump.',
      }, { status: 500 });
    }

    console.log(`Successfully parsed ${tasks.length} tasks from brain dump`);
    
    return NextResponse.json({
      success: true,
      tasks: tasks,
      originalInput: input,
      message: `🧠 Parsed ${tasks.length} tasks from your brain dump!`
    });
    
  } catch (error) {
    console.error('Brain dump parsing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to parse brain dump: ' + error.message,
    }, { status: 500 });
  }
} 