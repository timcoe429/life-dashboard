'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Brain, ExternalLink, Plus, Mic, MicOff, Zap, Coffee, Lightbulb, Clock, MapPin, Hash, X, Edit3, MoreVertical } from 'lucide-react';

const LifeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [accessToken, setAccessToken] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [selectedEnergyFilter, setSelectedEnergyFilter] = useState("all");
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [bulkTasks, setBulkTasks] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  
  // Project-related state
  const [projects, setProjects] = useState([]);
  const [projectInput, setProjectInput] = useState("");
  const [projectProcessing, setProjectProcessing] = useState(false);
  const [showProjectMode, setShowProjectMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  
  // AI Project Manager state
  const [showProjectChat, setShowProjectChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Unified smart input
  const [smartInput, setSmartInput] = useState('');
  const [smartProcessing, setSmartProcessing] = useState(false);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved access token, tasks, and projects
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
    
    const savedTasks = localStorage.getItem('dashboard_tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      // Filter out the old dummy "Order groceries online" task
      const cleanTasks = parsedTasks.filter(task => task.text !== "Order groceries online" && task.text !== "Order groceries from amazon");
      setTasks(cleanTasks);
      if (cleanTasks.length !== parsedTasks.length) {
        localStorage.setItem('dashboard_tasks', JSON.stringify(cleanTasks));
      }
    }
    
    const savedProjects = localStorage.getItem('dashboard_projects');
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      setProjects(parsedProjects);
    }
    
    // Check OAuth callback
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const accessTokenFromUrl = params.get('access_token');
    
    if (authSuccess && accessTokenFromUrl) {
      setAccessToken(accessTokenFromUrl);
      localStorage.setItem('google_access_token', accessTokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        fetchCalendarEvents();
      }, 100);
    }
  }, []);

  // Save tasks whenever they change and handle daily reset
  useEffect(() => {
    localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
    
    // Check if it's a new day and reset completed tasks
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('last_reset_date');
    
    if (lastResetDate !== today) {
      // It's a new day! Clean up completed tasks
      console.log('New day detected, resetting completed tasks...');
      
      const cleanedTasks = tasks.map(task => {
        if (task.completed) {
          // If task was completed yesterday or has no completion date, remove it completely if it's a sample/old task
          if (!task.completedAt || new Date(task.completedAt).toDateString() !== today) {
            // For old/sample tasks, just remove them entirely if completed
            return null;
          } else {
            // If completed today, keep as completed
            return task;
          }
        }
        return task;
      }).filter(Boolean); // Remove null entries
      
      // Update tasks if anything changed
      if (tasks.length !== cleanedTasks.length || JSON.stringify(tasks) !== JSON.stringify(cleanedTasks)) {
        setTasks(cleanedTasks);
        localStorage.setItem('dashboard_tasks', JSON.stringify(cleanedTasks));
      }
      
      localStorage.setItem('last_reset_date', today);
      
      // Count only tasks completed today
      const completedTodayCount = cleanedTasks.filter(task => 
        task.completed && task.completedAt && new Date(task.completedAt).toDateString() === today
      ).length;
      setCompletedToday(completedTodayCount);
      
      console.log('Daily reset complete. Cleaned tasks:', cleanedTasks.length, 'Completed today:', completedTodayCount);
    } else {
      // Same day, count completed tasks
      const completed = tasks.filter(task => task.completed).length;
      setCompletedToday(completed);
    }
  }, [tasks]);

  // Save projects whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
      // Auto-refresh calendar every 5 minutes
      const interval = setInterval(fetchCalendarEvents, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [accessToken]);

  // Initialize speech recognition with shorter listening time
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true; // Keep listening
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        let finalTranscript = '';
        let silenceTimer = null;
        
        recognitionInstance.onresult = (event) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          const currentText = finalTranscript + interimTranscript;
          console.log('Speech recognition result:', currentText);
          
          // Use a function to get current mode dynamically
          const getCurrentMode = () => {
            // Check DOM elements to determine current mode since state might be stale
            const projectChatVisible = document.querySelector('[data-project-chat="true"]') !== null;
            
            console.log('DOM check - projectChatVisible:', projectChatVisible);
            
            if (projectChatVisible) {
              return 'chat';
            } else {
              return 'smart';
            }
          };
          
          const currentMode = getCurrentMode();
          console.log('Current mode detected:', currentMode);
          
          // Update the appropriate input based on current mode
          if (currentMode === 'chat') {
            console.log('Updating chat input');
            setChatInput(currentText);
          } else {
            console.log('Updating smart input');
            setSmartInput(currentText);
          }
          
          // Reset silence timer with shorter timeout
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (finalTranscript.trim()) {
              console.log('Auto-stopping due to silence');
              recognitionInstance.stop();
            }
          }, 3000); // 3 seconds of silence before stopping
        };
        
        recognitionInstance.onend = () => {
          console.log('Speech recognition ended. Final transcript:', finalTranscript);
          setIsRecording(false);
          if (finalTranscript.trim()) {
            // Use the same dynamic mode detection
            const getCurrentMode = () => {
              const projectChatVisible = document.querySelector('[data-project-chat="true"]') !== null;
              const projectModeVisible = document.querySelector('[data-project-mode="true"]') !== null;
              
              if (projectChatVisible) {
                return 'chat';
              } else if (projectModeVisible) {
                return 'project';
              } else {
                return 'task';
              }
            };
            
            const currentMode = getCurrentMode();
            console.log('Saving final transcript to mode:', currentMode);
            
            if (currentMode === 'chat') {
              console.log('Saving to chat input');
              setChatInput(finalTranscript.trim());
            } else if (currentMode === 'project') {
              console.log('Saving to project input');
              setProjectInput(finalTranscript.trim());
            } else {
              console.log('Saving to task input');
              setTaskInput(finalTranscript.trim());
            }
          }
          finalTranscript = '';
          if (silenceTimer) clearTimeout(silenceTimer);
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error !== 'no-speech') {
            alert('Speech recognition failed: ' + event.error);
          }
        };
        
        setRecognition(recognitionInstance);
        setSpeechSupported(true);
      }
    }
  }, []);

  const addTask = (taskText, energy = "medium", tags = [], context = "anywhere") => {
    if (!taskText.trim()) return;
    
    const newTask = {
      id: Date.now() + Math.random(), // Ensure unique IDs even for rapid creation
      text: taskText.trim(),
      completed: false,
      energy: energy,
      tags: tags,
      context: context,
      createdAt: new Date().toISOString()
    };
    
    setTasks(prev => [newTask, ...prev]);
  };

  const analyzeTaskWithAI = (taskText) => {
    // AI-powered task analysis - no manual tagging needed!
    const text = taskText.toLowerCase();
    let energy = "medium";
    let tags = [];
    let context = "anywhere";
    
    // Smart energy detection
    if (/(urgent|asap|deadline|important|critical|rush|emergency|focus|deep work|concentrate)/i.test(text)) {
      energy = "high";
    } else if (/(creative|brainstorm|idea|design|write|plan|think|research|explore|invent)/i.test(text)) {
      energy = "creative";
    } else if (/(call|email|text|message|quick|easy|simple|order|buy|check|read)/i.test(text)) {
      energy = "low";
    }
    
    // Smart tag detection - no hashtags needed!
    if (/(work|project|meeting|client|boss|colleague|office|business|proposal|report|presentation|deadline)/i.test(text)) {
      tags.push("work");
    }
    
    if (/(mom|dad|family|friend|personal|home|house|relationship|call|visit)/i.test(text)) {
      tags.push("personal");
    }
    
    if (/(doctor|appointment|health|medicine|pharmacy|dentist|checkup|hospital)/i.test(text)) {
      tags.push("health");
    }
    
    if (/(grocery|shop|buy|order|store|amazon|purchase|errands)/i.test(text)) {
      tags.push("shopping");
    }
    
    if (/(gym|workout|exercise|run|fitness|yoga|sports)/i.test(text)) {
      tags.push("fitness");
    }
    
    if (/(write|blog|content|article|post|social media|twitter|instagram)/i.test(text)) {
      tags.push("content");
    }
    
    if (/(learn|study|course|tutorial|read|book|skill|training)/i.test(text)) {
      tags.push("learning");
    }
    
    if (/(money|finance|budget|bank|bills|pay|tax|investment)/i.test(text)) {
      tags.push("finance");
    }
    
    if (/(travel|trip|vacation|flight|hotel|booking)/i.test(text)) {
      tags.push("travel");
    }
    
    if (/(clean|organize|declutter|tidy|chores|laundry|dishes)/i.test(text)) {
      tags.push("household");
    }
    
    // Urgency detection
    if (/(today|now|asap|urgent|deadline|due)/i.test(text)) {
      tags.push("urgent");
    }
    
    // Context detection
    if (/(home|house)/i.test(text)) {
      context = "home";
    } else if (/(office|work|desk)/i.test(text)) {
      context = "office";
    } else if (/(phone|call)/i.test(text)) {
      context = "phone";
    } else if (/(computer|online|email|website)/i.test(text)) {
      context = "computer";
    }
    
    return { energy, tags: [...new Set(tags)], context };
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    
    const text = taskInput.trim();
    
    // Check if this looks like a project (complex multi-step description)
    const isProject = text.length > 80 && (
      text.includes('project') || 
      text.includes('launch') || 
      text.includes('build') || 
      text.includes('create') ||
      text.includes('develop') ||
      text.includes('implement') ||
      text.includes('organize') ||
      text.includes('plan') ||
      (text.split(/[.!?]+/).filter(s => s.trim()).length > 2)
    );
    
    if (isProject && !text.match(/#\w+/)) {
      // Suggest creating a project instead
      const shouldCreateProject = confirm(
        `This sounds like a project! Would you like to create a project instead?\n\n` +
        `Click "OK" to create a project with organized tasks, or "Cancel" to create individual tasks.`
      );
      
      if (shouldCreateProject) {
        setProjectInput(text);
        setShowProjectMode(true);
        setTaskInput("");
        return;
      }
    }
    
    // Check if this looks like a brain dump (longer input or multiple sentences)
    const isBrainDump = text.length > 50 || text.split(/[.!?]+/).filter(s => s.trim()).length > 1;
    
    if (isBrainDump && !text.match(/#\w+/)) {
      // Use AI to parse brain dump into multiple tasks
      setVoiceProcessing(true);
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: text }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Add all parsed tasks with a small delay for better UX
          data.tasks.forEach((taskData, index) => {
            setTimeout(() => {
              addTask(taskData.text, taskData.energy, taskData.tags, taskData.context);
            }, index * 100); // 100ms delay between each task
          });
          
          // Show success message after all tasks are added
          setTimeout(() => {
            alert(data.message);
          }, data.tasks.length * 100 + 200);
          
          setTaskInput("");
        } else {
          // Fallback to simple task creation
          console.error('Brain dump parsing failed:', data.error);
          const aiAnalysis = analyzeTaskWithAI(text);
          addTask(text, aiAnalysis.energy, aiAnalysis.tags, aiAnalysis.context);
          setTaskInput("");
        }
      } catch (error) {
        // Fallback to simple task creation
        console.error('Brain dump API error:', error);
        const aiAnalysis = analyzeTaskWithAI(text);
        addTask(text, aiAnalysis.energy, aiAnalysis.tags, aiAnalysis.context);
        setTaskInput("");
      } finally {
        setVoiceProcessing(false);
      }
    } else {
      // Simple single task creation (with manual hashtags support)
      let cleanText = text;
      let manualTags = [];
      
      // Still allow manual hashtags if user wants to override AI
      const hashtagMatches = text.match(/#\w+/g);
      if (hashtagMatches) {
        manualTags = hashtagMatches.map(tag => tag.slice(1));
        cleanText = text.replace(/#\w+/g, '').trim();
      }
      
      // Use AI to analyze the task
      const aiAnalysis = analyzeTaskWithAI(cleanText);
      
      // Combine AI tags with manual tags (manual takes priority)
      const finalTags = [...new Set([...aiAnalysis.tags, ...manualTags])];
      
      addTask(cleanText, aiAnalysis.energy, finalTags, aiAnalysis.context);
      setTaskInput("");
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkTasks.trim()) return;
    
    const text = bulkTasks.trim();
    
    // Check if this is a brain dump (free-form text) vs structured list
    const lines = text.split('\n').filter(line => line.trim());
    const isBrainDump = lines.length === 1 || text.includes(' and ') || text.includes(', ');
    
    if (isBrainDump && text.length > 50 && !text.match(/#\w+/)) {
      // Use AI to parse brain dump into multiple tasks
      setVoiceProcessing(true);
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: text }),
        });
        
        const data = await response.json();
        
                 if (data.success) {
           // Add all parsed tasks with a small delay for better UX
           data.tasks.forEach((taskData, index) => {
             setTimeout(() => {
               addTask(taskData.text, taskData.energy, taskData.tags, taskData.context);
             }, index * 100); // 100ms delay between each task
           });
           
           // Show success message after all tasks are added
           setTimeout(() => {
             alert(data.message);
           }, data.tasks.length * 100 + 200);
           
           setBulkTasks("");
           setQuickAddMode(false);
         } else {
          // Fallback to line-by-line processing
          console.error('Brain dump parsing failed:', data.error);
          processLinesIndividually(lines);
        }
      } catch (error) {
        // Fallback to line-by-line processing
        console.error('Brain dump API error:', error);
        processLinesIndividually(lines);
      } finally {
        setVoiceProcessing(false);
      }
    } else {
      // Process as individual lines
      processLinesIndividually(lines);
    }
  };
  
  const processLinesIndividually = (lines) => {
    lines.forEach((line, index) => {
      setTimeout(() => {
        let text = line.trim();
        let manualTags = [];
        
        // Extract manual hashtags
        const hashtagMatches = text.match(/#\w+/g);
        if (hashtagMatches) {
          manualTags = hashtagMatches.map(tag => tag.slice(1));
          text = text.replace(/#\w+/g, '').trim();
        }
        
        // Use AI to analyze each task
        const aiAnalysis = analyzeTaskWithAI(text);
        
        // Combine AI tags with manual tags
        const finalTags = [...new Set([...aiAnalysis.tags, ...manualTags])];
        
        addTask(text, aiAnalysis.energy, finalTags, aiAnalysis.context);
      }, index * 100); // 100ms delay between each task
    });
    
    setBulkTasks("");
    setQuickAddMode(false);
  };

  const toggleTask = (id) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : null }
          : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const updateTask = (id, updates) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, ...updates } : task
      )
    );
    setEditingTask(null);
  };

  // Project management functions
  const addProject = (project) => {
    if (!project.title?.trim()) return;
    
    const newProject = {
      id: Date.now() + Math.random(),
      ...project,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProjects(prev => [newProject, ...prev]);
    
    // Also add the project tasks to the main tasks list
    if (project.tasks && project.tasks.length > 0) {
      project.tasks.forEach((task, index) => {
        setTimeout(() => {
          const taskWithProject = {
            ...task,
            projectId: newProject.id,
            projectTitle: newProject.title
          };
          addTask(taskWithProject.text, taskWithProject.energy, taskWithProject.tags, taskWithProject.context);
        }, index * 50);
      });
    }
  };

  const updateProject = (id, updates) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === id ? { ...project, ...updates, updatedAt: new Date().toISOString() } : project
      )
    );
    setEditingProject(null);
  };

  const deleteProject = (id) => {
    setProjects(prev => prev.filter(project => project.id !== id));
    // Also remove tasks associated with this project
    setTasks(prev => prev.filter(task => task.projectId !== id));
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!projectInput.trim()) return;
    
    setProjectProcessing(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: projectInput }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add all parsed projects
        data.projects.forEach((project, index) => {
          setTimeout(() => {
            addProject(project);
          }, index * 100);
        });
        
        // Show success message
        setTimeout(() => {
          alert(data.message);
        }, data.projects.length * 100 + 200);
        
        setProjectInput("");
      } else {
        console.error('Project parsing failed:', data.error);
        alert('Failed to create project: ' + data.error);
      }
    } catch (error) {
      console.error('Project API error:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setProjectProcessing(false);
    }
  };

  // Smart unified handler that detects if input is a project or tasks
  const handleSmartAdd = async () => {
    if (!smartInput.trim()) return;
    
    const text = smartInput.trim().toLowerCase();
    
    // Check for manual override first
    let forceProject = false;
    let forceTask = false;
    let cleanText = smartInput.trim();
    
    if (cleanText.toLowerCase().startsWith('project:')) {
      forceProject = true;
      cleanText = cleanText.substring(8).trim();
    } else if (cleanText.toLowerCase().startsWith('task:')) {
      forceTask = true;
      cleanText = cleanText.substring(5).trim();
    }
    
    // Enhanced AI detection logic - be more aggressive about detecting projects
    const isProjectIndicator = forceProject || (!forceTask && (
      // Explicit project keywords
      text.includes('project') || 
      text.includes('launch') || 
      text.includes('build') || 
      text.includes('create') ||
      text.includes('develop') ||
      text.includes('implement') ||
      text.includes('organize') ||
      text.includes('plan') ||
      text.includes('website') ||
      text.includes('app') ||
      text.includes('business') ||
      text.includes('marketing') ||
      text.includes('campaign') ||
      text.includes('strategy') ||
      text.includes('system') ||
      text.includes('process') ||
      
      // Process/workflow indicators
      text.includes('steps') ||
      text.includes('phases') ||
      text.includes('workflow') ||
      text.includes('roadmap') ||
      text.includes('milestone') ||
      
      // Complex descriptions
      text.length > 80 || // Shorter threshold
      (text.split(/[.!?]+/).filter(s => s.trim()).length > 2) || // Lower threshold
      (text.split(' and ').length > 2) || // More sensitive
      
      // Multiple action words indicate complex project
      (text.match(/(create|build|develop|design|implement|launch|organize|plan|research|test|deploy|setup|configure)/g) || []).length > 2
    ));
    
    console.log('Smart detection:', { 
      text: text.substring(0, 100), 
      isProject: isProjectIndicator,
      forceProject,
      forceTask,
      textLength: text.length 
    });
    
    setSmartProcessing(true);
    
    try {
      if (isProjectIndicator) {
        // Route to projects API
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: cleanText }),
        });

        const data = await response.json();

        if (data.success) {
          // Add all parsed projects
          data.projects.forEach((project, index) => {
            setTimeout(() => {
              addProject(project);
            }, index * 100);
          });
          
          // Show success message
          setTimeout(() => {
            alert(`🎉 ${data.message || `Created project successfully!`}`);
          }, data.projects.length * 100 + 200);
          
          setSmartInput('');
        } else {
          alert(`Error creating project: ${data.error}`);
        }
      } else {
        // Route to tasks API
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: cleanText }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Add all parsed tasks with a small delay for better UX
          data.tasks.forEach((taskData, index) => {
            setTimeout(() => {
              addTask(taskData.text, taskData.energy, taskData.tags, taskData.context);
            }, index * 100); // 100ms delay between each task
          });
          
          // Show success message after all tasks are added
          setTimeout(() => {
            alert(`🎉 ${data.message || `Created ${data.tasks.length} tasks!`}`);
          }, data.tasks.length * 100 + 200);
          
          setSmartInput("");
        } else {
          // Fallback to simple task creation
          console.error('Task parsing failed:', data.error);
          const aiAnalysis = analyzeTaskWithAI(cleanText);
          addTask(cleanText, aiAnalysis.energy, aiAnalysis.tags, aiAnalysis.context);
          setSmartInput("");
        }
      }
    } catch (error) {
      console.error('Smart add error:', error);
      alert('Error processing request. Please try again.');
    } finally {
      setSmartProcessing(false);
    }
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-700';
      case 'in-progress': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'review': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'planning': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getProjectPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-700';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // AI Project Manager functions
  const handleProjectManagerChat = async (input, projectId = null) => {
    if (!input.trim()) return;
    
    setChatProcessing(true);
    
    // Add user message to chat history
    const userMessage = { type: 'user', content: input, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch('/api/project-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input,
          projectId: projectId,
          currentProjects: projects,
          currentTasks: tasks
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add AI response to chat history
        const aiMessage = { 
          type: 'ai', 
          content: data.message || 'Request processed successfully',
          data: data,
          timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, aiMessage]);
        
        // Handle different action types
        if (data.action === 'create_project' && data.projects) {
          data.projects.forEach((project, index) => {
            setTimeout(() => {
              addProject(project);
            }, index * 100);
          });
        }
        
        if (data.action === 'update_project' && data.updates) {
          handleProjectUpdate(data.projectId, data.updates);
        }
        
        setChatInput("");
      } else {
        console.error('Project manager failed:', data.error);
        const errorMessage = { 
          type: 'ai', 
          content: 'Sorry, I had trouble processing that request: ' + data.error,
          timestamp: new Date() 
        };
        setChatHistory(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Project manager API error:', error);
      const errorMessage = { 
        type: 'ai', 
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setChatProcessing(false);
    }
  };

  const handleProjectUpdate = (projectId, updates) => {
    setProjects(prev => 
      prev.map(project => {
        if (project.id.toString() === projectId.toString()) {
          let updatedProject = { ...project };
          
          // Apply updates
          if (updates.title) updatedProject.title = updates.title;
          if (updates.description) updatedProject.description = updates.description;
          if (updates.status) updatedProject.status = updates.status;
          
          // Handle task updates
          if (updates.addTasks) {
            updates.addTasks.forEach(task => {
              const taskWithProject = {
                ...task,
                projectId: updatedProject.id,
                projectTitle: updatedProject.title
              };
              addTask(taskWithProject.text, taskWithProject.energy, taskWithProject.tags, taskWithProject.context);
            });
          }
          
          if (updates.removeTasks) {
            updates.removeTasks.forEach(taskText => {
              const taskToRemove = tasks.find(task => 
                task.projectId === updatedProject.id && task.text.includes(taskText)
              );
              if (taskToRemove) {
                deleteTask(taskToRemove.id);
              }
            });
          }
          
          updatedProject.updatedAt = new Date().toISOString();
          return updatedProject;
        }
        return project;
      })
    );
  };

  const startVoiceRecording = () => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      // Clear the appropriate input based on current mode
      if (showProjectChat) {
        setChatInput("");
      } else {
        setSmartInput("");
      }
      recognition.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognition && isRecording) {
      console.log('Manually stopping voice recording');
      recognition.stop();
    }
  };

  const authenticateWithGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    setAccessToken(null);
    setCalendarEvents([]);
    setTodayEvents([]);
    console.log('Cleared all Google Calendar tokens');
  };

  const clearCompletedTasks = () => {
    // Keep only incomplete tasks - clear ALL completed tasks
    const cleanedTasks = tasks.filter(task => !task.completed);
    
    setTasks(cleanedTasks);
    localStorage.setItem('dashboard_tasks', JSON.stringify(cleanedTasks));
    
    // Reset completed count since we cleared all completed tasks
    setCompletedToday(0);
    
    console.log('Cleared all completed tasks');
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (!refreshToken) {
        console.log('No refresh token available');
        clearTokens();
        return false;
      }

      console.log('Attempting to refresh access token...');
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();
      console.log('Refresh token response:', data);
      
      if (data.success && data.access_token) {
        console.log('Successfully refreshed access token');
        setAccessToken(data.access_token);
        localStorage.setItem('google_access_token', data.access_token);
        
        // Update refresh token if provided
        if (data.refresh_token) {
          localStorage.setItem('google_refresh_token', data.refresh_token);
        }
        
        return true;
      } else {
        throw new Error(data.error || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      // Don't show alert immediately - let the user manually reconnect when they want to
      console.log('Google Calendar connection expired. User will need to reconnect when they want to use calendar features.');
      return false;
    }
  };

  const fetchCalendarEvents = async (retryCount = 0) => {
    if (!accessToken) return;
    
    try {
      console.log('Fetching calendar events...');
      const response = await fetch(`/api/calendar?accessToken=${encodeURIComponent(accessToken)}`);
      const result = await response.json();
      
      console.log('Calendar API response:', result);
      
      if (result.success) {
        setCalendarEvents(result.events);
        console.log('Total events found:', result.events.length);
        
        // Filter for today only
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        console.log('Filtering events for today:', today.toDateString());
        
        const todayEvents = result.events.filter(event => {
          const eventDate = new Date(event.start?.dateTime || event.start?.date);
          const isToday = eventDate >= today && eventDate < tomorrow;
          if (isToday) {
            console.log('Found today event:', event.summary, eventDate);
          }
          return isToday;
        }).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          time: formatEventTime(event),
          location: event.location
        }));
        
        console.log('Today events after filtering:', todayEvents);
        setTodayEvents(todayEvents);
      } else {
        console.error('Calendar API failed:', result.error);
        
        // If token is expired and we haven't tried refreshing yet
        if (result.error.includes('Invalid or expired') && retryCount === 0) {
          console.log('Token expired, attempting to refresh...');
          const refreshSuccess = await refreshAccessToken();
          if (refreshSuccess) {
            console.log('Token refreshed, retrying calendar fetch...');
            return fetchCalendarEvents(1); // Retry once
          }
        }
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const formatEventTime = (event) => {
    if (event.start?.dateTime) {
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime);
      return `${startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })} - ${endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return 'All Day';
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getEnergyIcon = (energy) => {
    switch (energy) {
      case 'high': return <Zap size={14} className="text-red-500" />;
      case 'creative': return <Lightbulb size={14} className="text-yellow-500" />;
      case 'low': return <Coffee size={14} className="text-blue-500" />;
      default: return <Circle size={14} className="text-gray-400" />;
    }
  };

  const getEnergyColor = (energy) => {
    switch (energy) {
      case 'high': return 'bg-red-50 border-red-200 text-red-700';
      case 'creative': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const filteredTasks = selectedEnergyFilter === "all" 
    ? tasks 
    : tasks.filter(task => task.energy === selectedEnergyFilter);

  const incompleteTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Tim</h1>
          <p className="text-gray-600">{currentTime.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric'
          })}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Circle size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{incompleteTasks.length}</p>
                <p className="text-sm text-gray-500">Tasks to do</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedToday}</p>
                <p className="text-sm text-gray-500">Completed today</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Brain size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                <p className="text-sm text-gray-500">Active projects</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
                <p className="text-sm text-gray-500">Meetings today</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Task Input & Today's Meetings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Smart AI Input */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🧠 Smart AI Assistant</h3>
                <p className="text-sm text-gray-600">Describe anything - AI will create tasks or projects automatically</p>
              </div>
              
              {/* Universal Smart Input */}
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={smartInput}
                    onChange={(e) => setSmartInput(e.target.value)}
                    placeholder={isRecording ? "🎤 LISTENING... Describe anything! Click mic to stop or 3 seconds of silence." : smartProcessing ? "🧠 AI is processing..." : "Describe anything! AI will automatically create tasks or projects...\n\nExamples:\n• \"I need to call mom and finish the report\" → 2 tasks\n• \"Launch a company blog with content strategy\" → Full project\n• \"PROJECT: Build a mobile app\" → Forces project mode\n• \"TASK: Just simple individual tasks\" → Forces task mode"}
                    className={`w-full px-4 py-3 pr-12 pb-12 border rounded-lg focus:outline-none focus:ring-2 text-sm h-32 resize-none ${
                      isRecording 
                        ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                        : 'border-gray-200 focus:ring-blue-500'
                    }`}
                    disabled={isRecording || smartProcessing}
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                        isRecording 
                          ? 'bg-red-500 text-white animate-pulse shadow-lg ring-2 ring-red-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={isRecording ? "Click to stop recording (or wait 3 seconds)" : "Click to start voice recording"}
                    >
                      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSmartAdd}
                  disabled={!smartInput.trim() || smartProcessing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {smartProcessing ? '🧠 AI Processing...' : '🧠 Smart Add'}
                </button>
              </div>
              

            </div>

            {/* Today's Meetings */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Today's Meetings</h3>
                <div className="flex gap-2">
                  {accessToken && (
                    <>
                      <button
                        onClick={fetchCalendarEvents}
                        className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                        title="Refresh calendar"
                      >
                        ↻ Refresh
                      </button>
                      <button
                        onClick={clearTokens}
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100"
                        title="Disconnect calendar"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                  {!accessToken && (
                    <button
                      onClick={authenticateWithGoogle}
                      className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                {todayEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {accessToken ? "No meetings scheduled for today" : "Connect calendar to see meetings"}
                    </p>
                    {accessToken && (
                      <p className="text-gray-400 text-xs mt-1">
                        Try refreshing if you expect to see meetings
                      </p>
                    )}
                  </div>
                ) : (
                  todayEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock size={16} className="text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-500">{event.time}</p>
                        {event.location && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-500 truncate">{event.location}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Task Management */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              {/* Energy Filter */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Your Tasks</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Energy:</span>
                    <div className="flex gap-1">
                      {[
                        { key: 'all', label: 'All', icon: Circle },
                        { key: 'high', label: 'High', icon: Zap },
                        { key: 'creative', label: 'Creative', icon: Lightbulb },
                        { key: 'low', label: 'Low', icon: Coffee },
                      ].map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setSelectedEnergyFilter(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            selectedEnergyFilter === key
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={12} className="inline mr-1" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {completedTasks.length > 0 && (
                    <button
                      onClick={clearCompletedTasks}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Remove all completed tasks from the list"
                    >
                      <X size={12} className="inline mr-1" />
                      Clear Completed
                    </button>
                  )}
                </div>
              </div>

              {/* Active Tasks */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Circle size={16} className="text-blue-500" />
                    To Do ({incompleteTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {incompleteTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No tasks in this energy level</p>
                        <p className="text-xs mt-1">Add some tasks above or try a different filter</p>
                      </div>
                    ) : (
                      incompleteTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
                        >
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="text-gray-300 hover:text-green-500 transition-colors"
                          >
                            <Circle size={18} />
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            {editingTask === task.id ? (
                              <input
                                type="text"
                                defaultValue={task.text}
                                onBlur={(e) => updateTask(task.id, { text: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
                                className="w-full text-sm bg-transparent border-none outline-none"
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-gray-900">{task.text}</p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1">
                              {getEnergyIcon(task.energy)}
                              <span className="text-xs text-gray-500 capitalize">{task.energy}</span>
                              {task.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  <Hash size={10} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button
                              onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" />
                      Completed ({completedTasks.length})
                    </h4>
                    <div className="space-y-2">
                      {completedTasks.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg opacity-60"
                        >
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="text-green-500 hover:text-gray-400 transition-colors"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-through">{task.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getEnergyIcon(task.energy)}
                              <span className="text-xs text-gray-500 capitalize">{task.energy}</span>
                              {task.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  <Hash size={10} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        {projects.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Your Projects</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowProjectChat(!showProjectChat)}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                      showProjectChat 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <Brain size={16} className="inline mr-2" />
                    AI Project Manager
                  </button>
                  <div className="text-sm text-gray-500">
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-medium text-gray-900 flex-1">{project.title}</h4>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => setEditingProject(editingProject === project.id ? null : project.id)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getProjectStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getProjectPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {project.estimatedDays} days
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          <Hash size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    {project.phases && project.phases.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Project Phases:</h5>
                        <div className="space-y-1">
                          {project.phases.map((phase, index) => (
                            <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                              <div className="w-4 h-1 bg-gradient-to-r from-purple-200 to-purple-400 rounded"></div>
                              {phase}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      <p>{project.tasks?.length || 0} task{(project.tasks?.length || 0) !== 1 ? 's' : ''}</p>
                      <p>Created {new Date(project.createdAt).toLocaleDateString()}</p>
                      {project.tasks && project.tasks.length > 0 && (
                        <p className="mt-1">
                          Est. {project.tasks.reduce((total, task) => total + (task.estimatedHours || 2), 0)} hours total
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* AI Project Manager Chat */}
              {showProjectChat && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Brain size={20} className="text-purple-600" />
                      AI Project Manager Chat
                    </h4>
                    
                    {/* Chat History */}
                    <div className="bg-white rounded-lg p-4 h-64 overflow-y-auto mb-4 border">
                      {chatHistory.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <Brain size={32} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">Start a conversation with your AI Project Manager!</p>
                          <p className="text-xs mt-1">Ask me to reorganize projects, add tasks, change priorities, or analyze dependencies.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {chatHistory.map((message, index) => (
                            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.type === 'user' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {message.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="flex gap-3" data-project-chat="true">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !chatProcessing && handleProjectManagerChat(chatInput)}
                                                     placeholder={isRecording ? "🎤 LISTENING... Click mic to stop or 3 seconds of silence." : chatProcessing ? "🧠 AI is thinking..." : "Ask me to reorganize projects, add tasks, change priorities..."}
                          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                            isRecording 
                              ? 'border-red-300 bg-red-50 focus:ring-red-500' 
                              : 'border-gray-200 focus:ring-purple-500'
                          }`}
                          disabled={isRecording || chatProcessing}
                        />
                        {speechSupported && (
                          <button
                            type="button"
                            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                                                         className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                               isRecording 
                                 ? 'bg-red-500 text-white animate-pulse shadow-lg ring-2 ring-red-300' 
                                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                             }`}
                             title={isRecording ? "Click to stop recording (or wait 3 seconds)" : "Click to start voice recording"}
                          >
                            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleProjectManagerChat(chatInput)}
                        disabled={!chatInput.trim() || chatProcessing}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {chatProcessing ? "🧠 Thinking..." : "Send"}
                      </button>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-600">
                      <p><strong>Examples:</strong> "Reorganize my blog project tasks by priority" • "Add SEO optimization tasks to the blog project" • "Change the company blog project to high priority" • "What's the best order to complete my tasks?"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projects Card */}
            <a
              href="https://onetask.today"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Projects</h4>
                <p className="text-blue-100 text-sm opacity-90">Manage your active projects</p>
              </div>
            </a>

            {/* Fitness Card */}
            <a
              href="https://dohardshit.today"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Zap className="w-6 h-6" />
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Fitness</h4>
                <p className="text-orange-100 text-sm opacity-90">Track workouts and health</p>
              </div>
            </a>

            {/* Calendar Card */}
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Calendar size={24} />
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Calendar</h4>
                <p className="text-green-100 text-sm opacity-90">View full calendar</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifeDashboard;
