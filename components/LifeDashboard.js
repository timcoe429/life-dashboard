'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Brain, ExternalLink, Plus, Mic, MicOff, Zap, Coffee, Lightbulb, Clock, MapPin, Hash, X, Edit3, MoreVertical } from 'lucide-react';

const LifeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState([
    // Sample tasks showing AI auto-tagging in action
    { id: 1, text: "Review the new project specs for deadline", completed: false, energy: "high", tags: ["work", "urgent"], context: "office" },
    { id: 2, text: "Call mom about weekend plans", completed: false, energy: "low", tags: ["personal"], context: "phone" },
    { id: 3, text: "Brainstorm blog post ideas for content strategy", completed: false, energy: "creative", tags: ["content"], context: "anywhere" },
    { id: 4, text: "Order groceries from amazon", completed: true, energy: "low", tags: ["shopping"], context: "computer" },
    { id: 5, text: "Schedule dentist appointment", completed: false, energy: "low", tags: ["health"], context: "phone" },
    { id: 6, text: "Plan workout routine for next week", completed: false, energy: "creative", tags: ["fitness"], context: "anywhere" },
  ]);
  const [completedToday, setCompletedToday] = useState(1);
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

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved access token and tasks
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
    
    const savedTasks = localStorage.getItem('dashboard_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
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

  // Save tasks whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard_tasks', JSON.stringify(tasks));
    const completed = tasks.filter(task => task.completed).length;
    setCompletedToday(completed);
  }, [tasks]);

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
    }
  }, [accessToken]);

  // Initialize speech recognition with longer listening time
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
          
          setTaskInput(finalTranscript + interimTranscript);
          
          // Reset silence timer
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (finalTranscript.trim()) {
              recognitionInstance.stop();
            }
          }, 3000); // 3 seconds of silence before stopping
        };
        
        recognitionInstance.onend = () => {
          setIsRecording(false);
          if (finalTranscript.trim()) {
            setTaskInput(finalTranscript.trim());
            finalTranscript = '';
          }
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
      id: Date.now(),
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

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    
    let text = taskInput.trim();
    let manualTags = [];
    
    // Still allow manual hashtags if user wants to override AI
    const hashtagMatches = text.match(/#\w+/g);
    if (hashtagMatches) {
      manualTags = hashtagMatches.map(tag => tag.slice(1));
      text = text.replace(/#\w+/g, '').trim();
    }
    
    // Use AI to analyze the task
    const aiAnalysis = analyzeTaskWithAI(text);
    
    // Combine AI tags with manual tags (manual takes priority)
    const finalTags = [...new Set([...aiAnalysis.tags, ...manualTags])];
    
    addTask(text, aiAnalysis.energy, finalTags, aiAnalysis.context);
    setTaskInput("");
  };

  const handleBulkAdd = () => {
    if (!bulkTasks.trim()) return;
    
    const taskLines = bulkTasks.split('\n').filter(line => line.trim());
    
    taskLines.forEach(line => {
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

  const startVoiceRecording = () => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      setTaskInput(""); // Clear existing text
      recognition.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognition && isRecording) {
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

  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch(`/api/calendar?accessToken=${encodeURIComponent(accessToken)}`);
      const result = await response.json();
      
      if (result.success) {
        setCalendarEvents(result.events);
        
        // Filter for today only
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        
        const todayEvents = result.events.filter(event => {
          const eventDate = new Date(event.start?.dateTime || event.start?.date);
          return eventDate >= today && eventDate < tomorrow;
        }).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          time: formatEventTime(event),
          location: event.location
        }));
        
        setTodayEvents(todayEvents);
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
                <Calendar size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
                <p className="text-sm text-gray-500">Meetings today</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Brain size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{new Set(tasks.flatMap(task => task.tags)).size}</p>
                <p className="text-sm text-gray-500">Active tags</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Task Input & Today's Meetings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Add */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Brain Dump</h3>
                <button
                  onClick={() => setQuickAddMode(!quickAddMode)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {quickAddMode ? 'Single' : 'Bulk'}
                </button>
              </div>
              
              {!quickAddMode ? (
                <form onSubmit={handleTaskSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      placeholder={isRecording ? "Listening... keep talking!" : "What's on your mind? (AI will auto-tag it!)"}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={isRecording}
                    />
                    {speechSupported && (
                      <button
                        type="button"
                        onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                        className={`absolute right-3 top-3 p-1.5 rounded-full transition-all ${
                          isRecording 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!taskInput.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Add Task
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={bulkTasks}
                    onChange={(e) => setBulkTasks(e.target.value)}
                    placeholder="One task per line - AI auto-tags everything!&#10;Call mom about weekend plans&#10;Review project docs for deadline&#10;Brainstorm blog post ideas&#10;Buy groceries online"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-32 resize-none"
                  />
                  <button
                    onClick={handleBulkAdd}
                    disabled={!bulkTasks.trim()}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Add All Tasks
                  </button>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p><strong>✨ AI Auto-Tags Everything!</strong></p>
                <p>• Just type naturally - no hashtags needed</p>
                <p>• "Call mom" → auto-tagged #personal</p>
                <p>• "Project deadline" → auto-tagged #work #urgent</p>
                <p>• Voice mode listens longer now!</p>
              </div>
            </div>

            {/* Today's Meetings */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Today's Meetings</h3>
                {!accessToken && (
                  <button
                    onClick={authenticateWithGoogle}
                    className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    Connect
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {todayEvents.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {accessToken ? "No meetings today" : "Connect calendar to see meetings"}
                    </p>
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
