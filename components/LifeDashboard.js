'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Timer, Brain, Sparkles, ExternalLink, TrendingUp } from 'lucide-react';

const LifeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentTask, setCurrentTask] = useState("Review project proposal");
  const [taskInput, setTaskInput] = useState("");
  const [todayTasks, setTodayTasks] = useState([
    { id: 1, time: "9:00 AM", title: "Team standup", completed: true },
    { id: 2, time: "10:30 AM", title: "Deep work: Project X", completed: true },
    { id: 3, time: "2:00 PM", title: "Gym workout", completed: false },
    { id: 4, time: "4:00 PM", title: "Client call", completed: false }
  ]);
  const [focusMode, setFocusMode] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [completedToday, setCompletedToday] = useState(2);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (timerActive && (timerMinutes > 0 || timerSeconds > 0)) {
      interval = setInterval(() => {
        if (timerSeconds === 0) {
          if (timerMinutes === 0) {
            setTimerActive(false);
            alert("Timer complete! Great work! 🎉");
          } else {
            setTimerMinutes(timerMinutes - 1);
            setTimerSeconds(59);
          }
        } else {
          setTimerSeconds(timerSeconds - 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerMinutes, timerSeconds]);

  const handleTaskComplete = () => {
    setCompletedToday(completedToday + 1);
    setCurrentTask("Select your next focus");
    setTimerActive(false);
    setTimerMinutes(25);
    setTimerSeconds(0);
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (taskInput.trim()) {
      const newTask = {
        id: todayTasks.length + 1,
        time: "Flexible",
        title: taskInput,
        completed: false
      };
      setTodayTasks([...todayTasks, newTask]);
      setTaskInput("");
    }
  };

  const toggleTask = (id) => {
    setTodayTasks(todayTasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    if (!todayTasks.find(t => t.id === id).completed) {
      setCompletedToday(completedToday + 1);
    } else {
      setCompletedToday(completedToday - 1);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const completionRate = Math.round((completedToday / todayTasks.length) * 100) || 0;

  return (
    <div className={`min-h-screen ${focusMode ? 'bg-gray-900' : 'bg-gray-50'} transition-all duration-500`}>
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        {/* Header */}
        <div className={`mb-4 ${focusMode ? 'opacity-20' : ''} transition-opacity`}>
          <h1 className="text-xl font-semibold text-gray-900">{getGreeting()}, Tim</h1>
          <p className="text-gray-500 text-sm">{currentTime.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Stats Cards with Colored Borders */}
        <div className={`grid grid-cols-4 gap-3 mb-6 ${focusMode ? 'opacity-20' : ''} transition-opacity`}>
          <div className={`bg-white rounded-lg p-4 shadow-sm border-2 ${todayTasks.length > 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Tasks Today</p>
              <div className={`text-xs font-medium px-2 py-1 rounded ${todayTasks.length > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {todayTasks.length > 0 ? 'Active' : 'Empty'}
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">{todayTasks.length}</p>
            <p className="text-xs text-gray-400">Total scheduled</p>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm border-2 ${completedToday >= 2 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Completed</p>
              <div className={`text-xs font-medium flex items-center gap-1 ${completedToday >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={10} />
                +{completedToday}
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">{completedToday}</p>
            <p className="text-xs text-gray-400">Tasks done today</p>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm border-2 ${completionRate >= 50 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Completion Rate</p>
              <div className={`text-xs font-medium ${completionRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {completionRate >= 50 ? 'On track' : 'Behind'}
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">{completionRate}%</p>
            <p className="text-xs text-gray-400">Daily progress</p>
          </div>
          
          <div className={`bg-white rounded-lg p-4 shadow-sm border-2 ${completedToday >= 2 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Focus Time</p>
              <div className={`text-xs font-medium ${completedToday >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                {completedToday >= 2 ? 'Good' : 'Low'}
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">{Math.floor(completedToday * 25 / 60)}h {(completedToday * 25) % 60}m</p>
            <p className="text-xs text-gray-400">Time in focus</p>
          </div>
        </div>

        {/* Today's Schedule - Moved Higher */}
        <div className={`grid md:grid-cols-3 gap-4 mb-6 ${focusMode ? 'opacity-20' : ''} transition-opacity`}>
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calendar className="text-purple-500" size={16} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
                <p className="text-xs text-gray-500">Click any task to focus</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                    task.completed ? 'opacity-50' : ''
                  }`}
                  onClick={() => !task.completed && setCurrentTask(task.title)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task.id);
                    }}
                    className={`transition-colors ${
                      task.completed ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
                    }`}
                  >
                    {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-gray-500">{task.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add - Smaller */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <Brain className="text-orange-500" size={16} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Add</h3>
                <p className="text-xs text-gray-500">AI organizes it</p>
              </div>
            </div>
            
            <div>
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTaskSubmit(e)}
                placeholder="Add task..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleTaskSubmit}
                className="mt-2 w-full px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>

        {/* Current Focus - Compact */}
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4 ${focusMode ? 'scale-105 shadow-xl border-blue-200' : ''} transition-all duration-300`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Sparkles className="text-blue-500" size={16} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Current Focus</h2>
                <p className="text-xs text-gray-500">Your active task</p>
              </div>
            </div>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                focusMode 
                  ? 'bg-gray-900 text-white hover:bg-gray-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
          </div>
          
          <div className="text-center py-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">{currentTask}</h3>
            
            <div className="inline-flex items-center justify-center bg-gray-50 rounded-xl px-8 py-4 mb-4">
              <div className="text-3xl font-mono font-medium text-gray-700">
                {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
              </div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setTimerActive(!timerActive)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  timerActive 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                <Timer className="inline mr-1" size={14} />
                {timerActive ? 'Pause' : 'Start'}
              </button>
              
              <button
                onClick={handleTaskComplete}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all"
              >
                <CheckCircle2 className="inline mr-1" size={14} />
                Complete
              </button>
              
              <button
                onClick={() => setCurrentTask("Select your next focus")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className={`${focusMode ? 'opacity-20' : ''} transition-opacity`}>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Access</h3>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="https://onetask.today"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-700">Projects</span>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
              </a>
              
              <a
                href="https://dohardshit.today"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-700">Fitness</span>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
              </a>
              
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm font-medium text-gray-700">G-Cal</span>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-gray-600" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifeDashboard;
