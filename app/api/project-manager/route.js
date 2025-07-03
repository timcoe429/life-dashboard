import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log('Project Manager API called');
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
    }, { status: 500 });
  }
  
  try {
    const { input, action, projectId, currentProjects, currentTasks } = await request.json();
    
    if (!input || input.trim().length < 5) {
      return NextResponse.json({
        success: false,
        error: 'Input too short. Please provide a meaningful request.',
      }, { status: 400 });
    }

    console.log('Processing project management request:', input.substring(0, 100) + '...');
    
    // Enhanced AI system for project management
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert AI Project Manager. You can create projects, analyze dependencies, reorganize tasks, and have conversations about project management.

CURRENT CONTEXT:
- Current Projects: ${JSON.stringify(currentProjects || [], null, 2)}
- Current Tasks: ${JSON.stringify(currentTasks || [], null, 2)}
- Action Type: ${action || 'general'}
- Target Project ID: ${projectId || 'none'}

CAPABILITIES:
1. CREATE PROJECTS: Break down complex ideas into structured projects with sequenced tasks
2. UPDATE PROJECTS: Modify existing projects based on new requirements or direction changes
3. ANALYZE DEPENDENCIES: Understand task relationships and create optimal sequences
4. REORGANIZE: Restructure projects for better workflow and efficiency
5. CONVERSATION: Discuss project strategies and provide recommendations

TASK DEPENDENCY RULES:
- Research/Planning tasks usually come first
- Setup/Infrastructure tasks come before content creation
- Testing/Review tasks come after implementation
- Launch/Deployment tasks come last
- Mark dependencies with "dependsOn" field containing task IDs or descriptions

SEQUENCING LOGIC:
- Phase 1: Research, Planning, Setup
- Phase 2: Content Creation, Development, Implementation
- Phase 3: Testing, Review, Optimization
- Phase 4: Launch, Deployment, Follow-up

RESPONSE FORMATS:

For PROJECT CREATION:
{
  "action": "create_project",
  "projects": [{
    "title": "Project Title",
    "description": "Clear project goal and outcome",
    "status": "planning|in-progress|review|completed",
    "priority": "high|medium|low",
    "tags": ["relevant", "tags"],
    "estimatedDays": 14,
    "deadline": null,
    "phases": ["Phase 1: Research", "Phase 2: Build", "Phase 3: Launch"],
    "tasks": [{
      "text": "Task description",
      "energy": "high|creative|medium|low",
      "tags": ["tags"],
      "context": "home|office|phone|computer|anywhere",
      "priority": "high|medium|low",
      "phase": 1,
      "dependsOn": ["previous task description"],
      "estimatedHours": 2
    }]
  }],
  "message": "Created comprehensive project with sequenced tasks"
}

For PROJECT UPDATES:
{
  "action": "update_project",
  "projectId": "target_project_id",
  "updates": {
    "title": "new title",
    "description": "updated description",
    "status": "new status",
    "addTasks": [/* new tasks */],
    "removeTasks": ["task descriptions to remove"],
    "updateTasks": [{"oldText": "old", "newText": "new"}],
    "resequence": true
  },
  "message": "Updated project based on new requirements"
}

For CONVERSATIONS:
{
  "action": "conversation",
  "analysis": "Detailed analysis of the request",
  "recommendations": ["List of recommendations"],
  "questions": ["Clarifying questions if needed"],
  "message": "Conversational response"
}

IMPORTANT: Always provide task sequencing with dependencies, realistic time estimates, and clear phases. Be conversational and helpful - you're a project management assistant, not just a task creator.`
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0.3,
    });

    console.log('AI response received');
    let response;
    try {
      const responseText = aiResponse.choices[0].message.content;
      console.log('Raw AI response:', responseText);
      
      // Parse the JSON response
      response = JSON.parse(responseText);
      
      // Validate response structure based on action
      if (response.action === 'create_project' && !response.projects) {
        throw new Error('Create project response missing projects array');
      }
      
      if (response.action === 'update_project' && !response.updates) {
        throw new Error('Update project response missing updates object');
      }
      
    } catch (parseError) {
      console.error('AI Response parsing error:', parseError);
      console.error('Raw response:', aiResponse?.choices?.[0]?.message?.content);
      
      // Fallback to conversation mode
      response = {
        action: 'conversation',
        analysis: 'I understood your request but had trouble formatting the response.',
        recommendations: ['Please try rephrasing your request'],
        message: 'I\'m having trouble processing that request. Could you try rephrasing it?'
      };
    }

    console.log('Successfully processed project management request');
    
    return NextResponse.json({
      success: true,
      ...response,
      originalInput: input
    });
    
  } catch (error) {
    console.error('Project management error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request: ' + error.message,
    }, { status: 500 });
  }
} 