import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log('Projects parse API called');
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
    }, { status: 500 });
  }
  
  try {
    const { input } = await request.json();
    
    if (!input || input.trim().length < 15) {
      return NextResponse.json({
        success: false,
        error: 'Input too short. Please provide a meaningful project description.',
      }, { status: 400 });
    }

    console.log('Parsing project description with AI:', input.substring(0, 100) + '...');
    
    // Use AI to intelligently break down the input into projects with tasks
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert project management assistant. Your job is to take a user's project description and break it down into structured projects with associated tasks.

IMPORTANT RULES:
1. Extract MULTIPLE distinct projects from the input if mentioned, or create one comprehensive project
2. Each project should have a clear objective and outcome
3. Break down each project into actionable tasks (3-8 tasks per project typically) with PROPER SEQUENCING
4. Remove filler words and conversational fluff
5. Make project titles concise but descriptive (20-60 characters ideal)
6. Auto-detect project status: "planning" (just started), "in-progress" (actively working), "review" (needs feedback), "completed" (default: "planning")
7. Auto-detect priority: "high" (urgent/important), "medium" (normal), "low" (nice to have)
8. Auto-detect relevant tags from this list: work, personal, health, learning, finance, travel, household, creative, technical, business, marketing, content
9. Estimate timeline in days (be realistic: 1-7 days = small, 7-30 days = medium, 30+ days = large)
10. If deadlines are mentioned, note them
11. Create a brief description (1-2 sentences) explaining the project goal
12. SEQUENCE TASKS LOGICALLY: Research/Planning → Setup/Infrastructure → Content/Development → Testing/Review → Launch/Deployment
13. Add task dependencies and phases for better project management

Return a JSON array of projects in this exact format:
[
  {
    "title": "Launch company blog",
    "description": "Create and launch a professional company blog to improve content marketing and SEO",
    "status": "planning",
    "priority": "medium",
    "tags": ["work", "marketing", "content"],
    "estimatedDays": 14,
    "deadline": null,
    "phases": ["Research & Planning", "Setup & Development", "Content Creation", "Launch & Optimization"],
    "tasks": [
      {
        "text": "Research blog platform options",
        "energy": "medium",
        "tags": ["work", "research"],
        "context": "computer",
        "priority": "high",
        "phase": 1,
        "dependsOn": [],
        "estimatedHours": 3
      },
      {
        "text": "Set up chosen blog platform",
        "energy": "medium",
        "tags": ["work", "technical"],
        "context": "computer",
        "priority": "high",
        "phase": 2,
        "dependsOn": ["Research blog platform options"],
        "estimatedHours": 4
      },
      {
        "text": "Create content calendar for first month",
        "energy": "creative",
        "tags": ["work", "content"],
        "context": "computer",
        "priority": "medium",
        "phase": 3,
        "dependsOn": ["Set up chosen blog platform"],
        "estimatedHours": 2
      },
      {
        "text": "Write first 3 blog posts",
        "energy": "creative",
        "tags": ["work", "content"],
        "context": "computer",
        "priority": "medium",
        "phase": 3,
        "dependsOn": ["Create content calendar for first month"],
        "estimatedHours": 8
      },
      {
        "text": "Set up analytics and tracking",
        "energy": "medium",
        "tags": ["work", "technical"],
        "context": "computer",
        "priority": "medium",
        "phase": 4,
        "dependsOn": ["Write first 3 blog posts"],
        "estimatedHours": 2
      }
    ]
  }
]

Be generous but realistic - break down complex ideas into manageable projects with clear tasks!`
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0.3,
    });

    console.log('AI response received');
    let projects;
    try {
      const responseText = aiResponse.choices[0].message.content;
      console.log('Raw AI response:', responseText);
      
      // Parse the JSON response
      projects = JSON.parse(responseText);
      
      // Validate the response structure
      if (!Array.isArray(projects)) {
        throw new Error('Response is not an array');
      }
      
      // Validate each project has required fields
      projects.forEach((project, index) => {
        if (!project.title || typeof project.title !== 'string') {
          throw new Error(`Project ${index} missing valid title field`);
        }
        if (!project.description) project.description = '';
        if (!project.status) project.status = 'planning';
        if (!project.priority) project.priority = 'medium';
        if (!project.tags) project.tags = [];
        if (!project.estimatedDays) project.estimatedDays = 7;
        if (!project.phases) project.phases = ["Planning", "Implementation", "Review"];
        if (!project.tasks) project.tasks = [];
        
        // Validate tasks within each project
        project.tasks.forEach((task, taskIndex) => {
          if (!task.text || typeof task.text !== 'string') {
            throw new Error(`Project ${index}, Task ${taskIndex} missing valid text field`);
          }
          if (!task.energy) task.energy = 'medium';
          if (!task.tags) task.tags = [];
          if (!task.context) task.context = 'anywhere';
          if (!task.priority) task.priority = 'medium';
          if (!task.phase) task.phase = 1;
          if (!task.dependsOn) task.dependsOn = [];
          if (!task.estimatedHours) task.estimatedHours = 2;
        });
      });
      
    } catch (parseError) {
      console.error('AI Response parsing error:', parseError);
      console.error('Raw response:', aiResponse?.choices?.[0]?.message?.content);
      return NextResponse.json({
        success: false,
        error: 'AI response parsing failed. Please try rephrasing your project description.',
      }, { status: 500 });
    }

    console.log(`Successfully parsed ${projects.length} projects from input`);
    
    return NextResponse.json({
      success: true,
      projects: projects,
      originalInput: input,
      message: `🚀 Created ${projects.length} project(s) with ${projects.reduce((total, p) => total + p.tasks.length, 0)} tasks!`
    });
    
  } catch (error) {
    console.error('Project parsing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to parse project: ' + error.message,
    }, { status: 500 });
  }
} 