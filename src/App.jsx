import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { gsap } from 'gsap'
import Squares from './components/Squares'
import './App.css'

// Coding quotes for inspiration
const quotes = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Robert C. Martin" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine" },
  { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
  { text: "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.", author: "Dan Salomon" },
  { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
]

// Create notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()

  const playTone = (frequency, startTime, duration, type = 'sine') => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.3, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  const now = audioContext.currentTime
  // Pleasant chime melody
  playTone(523.25, now, 0.15) // C5
  playTone(659.25, now + 0.15, 0.15) // E5
  playTone(783.99, now + 0.3, 0.15) // G5
  playTone(1046.50, now + 0.45, 0.3) // C6

  return audioContext
}

function App() {
  // Timer states
  const [time, setTime] = useState(new Date())
  const [breakTime, setBreakTime] = useState(0)
  const [isBreakActive, setIsBreakActive] = useState(false)
  const [breakDuration, setBreakDuration] = useState(5)
  const [customDuration, setCustomDuration] = useState('')
  const [linkedTaskId, setLinkedTaskId] = useState(null)
  const [showNotification, setShowNotification] = useState(false)
  const [completedTaskName, setCompletedTaskName] = useState('')

  // Todo states
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('devbreak-todos')
    return saved ? JSON.parse(saved) : []
  })
  const [newTodo, setNewTodo] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  // Quote state
  const [currentQuote, setCurrentQuote] = useState(quotes[0])

  // Refs for GSAP animations
  const appRef = useRef(null)
  const clockRef = useRef(null)
  const breakCardRef = useRef(null)
  const quoteRef = useRef(null)
  const todoCardRef = useRef(null)
  const headerRef = useRef(null)
  const breakIntervalRef = useRef(null)
  const notificationRef = useRef(null)

  // GSAP Entrance Animations
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Initial setup - hide elements
      gsap.set([clockRef.current, breakCardRef.current, quoteRef.current, todoCardRef.current], {
        opacity: 0,
        y: 50
      })
      gsap.set(headerRef.current, { opacity: 0, y: -30 })
      gsap.set('.squares-background', { opacity: 0 })

      // Timeline for entrance animations
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.to(headerRef.current, { opacity: 1, y: 0, duration: 0.8 })
        .to('.squares-background', { opacity: 0.4, duration: 2 }, '-=0.5')
        .to(clockRef.current, { opacity: 1, y: 0, duration: 0.8 }, '-=1')
        .to(breakCardRef.current, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .to(quoteRef.current, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .to(todoCardRef.current, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')

    }, appRef)

    return () => ctx.revert()
  }, [])

  // Animate time digits on change
  useEffect(() => {
    const digits = document.querySelectorAll('.time-value')
    digits.forEach(digit => {
      gsap.fromTo(digit,
        { scale: 1.1, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }
      )
    })
  }, [time.getSeconds()])

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem('devbreak-todos', JSON.stringify(todos))
  }, [todos])

  // Rotate quotes every 30 seconds with animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (quoteRef.current) {
        gsap.to(quoteRef.current.querySelector('.quote-content'), {
          opacity: 0,
          x: -20,
          duration: 0.3,
          onComplete: () => {
            setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)])
            gsap.to(quoteRef.current.querySelector('.quote-content'), {
              opacity: 1,
              x: 0,
              duration: 0.3
            })
          }
        })
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Break timer logic
  useEffect(() => {
    if (isBreakActive) {
      breakIntervalRef.current = setInterval(() => {
        setBreakTime(prev => {
          if (prev <= 1) {
            setIsBreakActive(false)
            // Get task name before completing
            let taskName = ''
            if (linkedTaskId) {
              const task = todos.find(t => t.id === linkedTaskId)
              taskName = task ? task.text : ''
              setTodos(prevTodos => prevTodos.map(todo =>
                todo.id === linkedTaskId ? { ...todo, completed: true } : todo
              ))
              setLinkedTaskId(null)
            }

            // Play notification sound
            try {
              createNotificationSound()
            } catch (e) {
              console.log('Audio not supported')
            }

            // Show notification popup
            setCompletedTaskName(taskName)
            setShowNotification(true)

            // Animate notification entrance
            setTimeout(() => {
              if (notificationRef.current) {
                gsap.fromTo(notificationRef.current,
                  { scale: 0.5, opacity: 0, y: 50 },
                  { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }
                )
              }
            }, 10)

            // Celebration animation
            gsap.to(breakCardRef.current, {
              scale: 1.05,
              duration: 0.2,
              yoyo: true,
              repeat: 3,
              ease: 'power2.inOut'
            })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current)
    }
    return () => {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current)
    }
  }, [isBreakActive, linkedTaskId, todos])

  const startBreak = (taskId = null) => {
    setBreakTime(breakDuration * 60)
    setIsBreakActive(true)
    setLinkedTaskId(taskId)
    // Animation on start
    gsap.fromTo(breakCardRef.current,
      { scale: 0.95 },
      { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
    )
  }

  const stopBreak = () => {
    setIsBreakActive(false)
    setBreakTime(0)
    setLinkedTaskId(null)
  }

  const handleCustomDuration = (e) => {
    e.preventDefault()
    const mins = parseInt(customDuration)
    if (mins > 0 && mins <= 120) {
      setBreakDuration(mins)
      setCustomDuration('')
    }
  }

  const closeNotification = () => {
    if (notificationRef.current) {
      gsap.to(notificationRef.current, {
        scale: 0.5,
        opacity: 0,
        y: 50,
        duration: 0.3,
        onComplete: () => setShowNotification(false)
      })
    } else {
      setShowNotification(false)
    }
  }

  const formatBreakTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Todo functions
  const addTodo = (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    const todo = {
      id: Date.now(),
      text: newTodo.trim(),
      completed: false,
      priority: newPriority,
      createdAt: new Date().toISOString(),
      timeSpent: 0,
    }

    setTodos(prev => [todo, ...prev])
    setNewTodo('')

    // Animate new todo
    setTimeout(() => {
      const newItem = document.querySelector('.todo-item:first-child')
      if (newItem) {
        gsap.fromTo(newItem,
          { opacity: 0, x: -30, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'back.out(2)' }
        )
      }
    }, 10)
  }

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
    // Animate checkbox
    const item = document.querySelector(`[data-todo-id="${id}"]`)
    if (item) {
      gsap.to(item, { scale: 1.02, duration: 0.15, yoyo: true, repeat: 1 })
    }
  }

  const deleteTodo = (id) => {
    const item = document.querySelector(`[data-todo-id="${id}"]`)
    if (item) {
      gsap.to(item, {
        opacity: 0,
        x: 50,
        scale: 0.9,
        duration: 0.3,
        onComplete: () => {
          setTodos(prev => prev.filter(todo => todo.id !== id))
        }
      })
    } else {
      setTodos(prev => prev.filter(todo => todo.id !== id))
    }
  }

  const startEdit = (todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }

  const saveEdit = (id) => {
    if (!editText.trim()) return
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, text: editText.trim() } : todo
    ))
    setEditingId(null)
    setEditText('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const clearCompleted = () => {
    const completedItems = document.querySelectorAll('.todo-item.completed')
    gsap.to(completedItems, {
      opacity: 0,
      x: 30,
      stagger: 0.1,
      duration: 0.3,
      onComplete: () => {
        setTodos(prev => prev.filter(todo => !todo.completed))
      }
    })
  }

  const startBreakForTask = (taskId) => {
    startBreak(taskId)
  }

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  const completedCount = todos.filter(t => t.completed).length
  const activeCount = todos.filter(t => !t.completed).length

  // Format time - 12 hour format
  const hours24 = time.getHours()
  const hours12 = hours24 % 12 || 12
  const hours = hours12.toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const ampm = hours24 >= 12 ? 'PM' : 'AM'
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#6366f1'
    }
  }

  const getLinkedTaskName = () => {
    if (!linkedTaskId) return null
    const task = todos.find(t => t.id === linkedTaskId)
    return task ? task.text : null
  }

  return (
    <div className="app-container" ref={appRef}>
      {/* Animated Squares Background */}
      <div className="squares-background">
        <Squares
          direction="diagonal"
          speed={0.5}
          borderColor="rgba(99, 102, 241, 0.15)"
          squareSize={50}
          hoverFillColor="rgba(99, 102, 241, 0.1)"
        />
      </div>

      {/* Header */}
      <header className="header" ref={headerRef}>
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <span className="logo-emoji">⌨️</span>
            </div>
            <div className="logo-info">
              <h1 className="logo-text">DevBreak</h1>
              <span className="logo-tagline">Focus • Break • Repeat</span>
            </div>
          </div>
          <div className="header-right">
            <div className="stats-pill">
              <span className="stat-item">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{completedCount}</span>
              </span>
              <span className="stat-divider"></span>
              <span className="stat-item">
                <span className="stat-icon">📋</span>
                <span className="stat-value">{activeCount}</span>
              </span>
            </div>
            <div className="date-display">{dateStr}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-grid">

          {/* Left Column - Clock & Break Timer */}
          <div className="left-column">
            {/* Main Clock */}
            <div className="glass-card clock-card" ref={clockRef}>
              <div className="clock-header">
                <p className="section-label">Current Time</p>
                <span className="ampm-badge">{ampm}</span>
              </div>
              <div className="clock-display">
                <div className="time-digit">
                  <span className="time-value">{hours}</span>
                  <span className="time-label">Hours</span>
                </div>
                <span className="time-separator">:</span>
                <div className="time-digit">
                  <span className="time-value">{minutes}</span>
                  <span className="time-label">Minutes</span>
                </div>
                <span className="time-separator">:</span>
                <div className="time-digit">
                  <span className="time-value seconds">{seconds}</span>
                  <span className="time-label">Seconds</span>
                </div>
              </div>
            </div>

            {/* Break Timer */}
            <div className={`glass-card break-card ${isBreakActive ? 'timer-active' : ''}`} ref={breakCardRef}>
              <div className="break-header">
                <div>
                  <p className="section-label">Break Timer</p>
                  <p className="section-subtitle">
                    {linkedTaskId ? (
                      <span className="linked-task">
                        🔗 Working on: <strong>{getLinkedTaskName()}</strong>
                      </span>
                    ) : (
                      'Take regular breaks to stay productive'
                    )}
                  </p>
                </div>
                {isBreakActive && <span className="active-badge">● Active</span>}
              </div>

              {!isBreakActive ? (
                <div className="break-controls">
                  <div className="duration-section">
                    <label className="duration-label">Break Duration</label>
                    <div className="duration-buttons">
                      {[5, 10, 15, 20, 30].map(min => (
                        <button
                          key={min}
                          onClick={() => setBreakDuration(min)}
                          className={`duration-btn ${breakDuration === min ? 'active' : ''}`}
                        >
                          {min}m
                        </button>
                      ))}
                    </div>
                    <form onSubmit={handleCustomDuration} className="custom-duration-form">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Custom min"
                        value={customDuration}
                        onChange={(e) => setCustomDuration(e.target.value)}
                        className="custom-duration-input"
                      />
                      <button type="submit" className="custom-duration-btn">Set</button>
                    </form>
                    {breakDuration !== 5 && breakDuration !== 10 && breakDuration !== 15 && breakDuration !== 20 && breakDuration !== 30 && (
                      <p className="custom-duration-label">Custom: {breakDuration} minutes</p>
                    )}
                  </div>
                  <button onClick={() => startBreak()} className="btn-primary start-btn">
                    <span className="btn-icon">☕</span>
                    Start {breakDuration}min Break
                  </button>
                  {activeCount > 0 && (
                    <div className="link-task-section">
                      <p className="link-label">Or start break for a task:</p>
                      <div className="linkable-tasks">
                        {todos.filter(t => !t.completed).slice(0, 3).map(todo => (
                          <button
                            key={todo.id}
                            onClick={() => startBreakForTask(todo.id)}
                            className="link-task-btn"
                          >
                            <span className="link-dot" style={{ background: getPriorityColor(todo.priority) }}></span>
                            <span className="link-text">{todo.text.substring(0, 25)}{todo.text.length > 25 ? '...' : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="break-active">
                  <div className="break-timer-display">
                    <div className="break-progress-ring">
                      <svg className="progress-svg" viewBox="0 0 120 120">
                        <circle className="progress-bg" cx="60" cy="60" r="54" />
                        <circle
                          className="progress-bar"
                          cx="60"
                          cy="60"
                          r="54"
                          style={{
                            strokeDasharray: 339.292,
                            strokeDashoffset: 339.292 * (1 - breakTime / (breakDuration * 60))
                          }}
                        />
                      </svg>
                      <div className="break-time-inner">
                        <span className="break-time">{formatBreakTime(breakTime)}</span>
                        <span className="remaining-text">remaining</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={stopBreak} className="btn-danger">
                    <span className="btn-icon">✕</span>
                    End Break Early
                  </button>
                </div>
              )}
            </div>

            {/* Quote Card */}
            <div className="glass-card quote-card" ref={quoteRef}>
              <div className="quote-content">
                <span className="quote-icon">💡</span>
                <div className="quote-body">
                  <p className="quote-text">"{currentQuote.text}"</p>
                  <p className="quote-author">— {currentQuote.author}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Todo List */}
          <div className="glass-card todo-card" ref={todoCardRef}>
            <div className="todo-header">
              <div>
                <h2 className="todo-title">
                  <span className="todo-title-icon">📝</span>
                  Tasks
                </h2>
                <p className="todo-stats">{activeCount} active • {completedCount} completed</p>
              </div>
              {completedCount > 0 && (
                <button onClick={clearCompleted} className="clear-btn">
                  <span>🗑️</span> Clear done
                </button>
              )}
            </div>

            {/* Add Todo Form */}
            <form onSubmit={addTodo} className="todo-form">
              <div className="form-row">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="What needs to be done?"
                  className="todo-input"
                />
                <button type="submit" className="btn-primary add-btn">
                  <span className="btn-icon">+</span>
                  Add
                </button>
              </div>
              <div className="priority-section">
                <span className="priority-label">Priority:</span>
                <div className="priority-buttons">
                  {['low', 'medium', 'high'].map(priority => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setNewPriority(priority)}
                      className={`priority-btn ${newPriority === priority ? 'active' : ''}`}
                      style={newPriority === priority ? { background: getPriorityColor(priority) } : {}}
                    >
                      {priority === 'high' && '🔴'}
                      {priority === 'medium' && '🟡'}
                      {priority === 'low' && '🟢'}
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Filter Tabs */}
            <div className="filter-tabs">
              {['all', 'active', 'completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                >
                  {f === 'all' && '📋'}
                  {f === 'active' && '⏳'}
                  {f === 'completed' && '✅'}
                  {f}
                  <span className="filter-count">
                    {f === 'all' && todos.length}
                    {f === 'active' && activeCount}
                    {f === 'completed' && completedCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Todo Items */}
            <div className="todo-list">
              {filteredTodos.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">
                    {filter === 'completed' ? '🎉' : '📝'}
                  </span>
                  <p className="empty-text">
                    {filter === 'all' ? 'No tasks yet. Add one above!' :
                      filter === 'active' ? 'All tasks completed! 🎉' :
                        'No completed tasks yet'}
                  </p>
                </div>
              ) : (
                filteredTodos.map(todo => (
                  <div
                    key={todo.id}
                    data-todo-id={todo.id}
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${linkedTaskId === todo.id ? 'linked' : ''}`}
                  >
                    <div className="todo-item-content">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="todo-checkbox"
                      />
                      <div className="todo-details">
                        {editingId === todo.id ? (
                          <div className="edit-form">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="edit-input"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(todo.id)
                                if (e.key === 'Escape') cancelEdit()
                              }}
                            />
                            <div className="edit-actions">
                              <button onClick={() => saveEdit(todo.id)} className="save-btn">Save</button>
                              <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                              {todo.text}
                            </p>
                            <div className="todo-meta">
                              <span
                                className="priority-badge"
                                style={{ background: getPriorityColor(todo.priority) }}
                              >
                                {todo.priority}
                              </span>
                              <span className="todo-date">
                                {new Date(todo.createdAt).toLocaleDateString()}
                              </span>
                              {linkedTaskId === todo.id && (
                                <span className="timer-badge">⏱️ Timer Active</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {editingId !== todo.id && (
                        <div className="todo-actions">
                          {!todo.completed && !isBreakActive && (
                            <button
                              onClick={() => startBreakForTask(todo.id)}
                              className="action-btn timer-btn"
                              title="Start break for this task"
                            >
                              ⏱️
                            </button>
                          )}
                          <button onClick={() => startEdit(todo)} className="action-btn edit-btn" title="Edit">
                            ✏️
                          </button>
                          <button onClick={() => deleteTodo(todo.id)} className="action-btn delete-btn" title="Delete">
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">
          <span className="footer-brand">DevBreak</span> — Take breaks. Stay productive. Write great code. 🚀
        </p>
      </footer>

      {/* Notification Popup */}
      {showNotification && (
        <div className="notification-overlay">
          <div className="notification-popup" ref={notificationRef}>
            <div className="notification-confetti">
              <span>🎉</span>
              <span>✨</span>
              <span>🚀</span>
              <span>💪</span>
              <span>⭐</span>
            </div>
            <div className="notification-icon">🎊</div>
            <h2 className="notification-title">Break Complete!</h2>
            <p className="notification-message">
              {completedTaskName
                ? `Great job! You completed "${completedTaskName}"`
                : 'Time to get back to coding refreshed!'}
            </p>
            <div className="notification-stats">
              <div className="notification-stat">
                <span className="stat-number">{breakDuration}</span>
                <span className="stat-label">min break</span>
              </div>
              <div className="notification-stat">
                <span className="stat-number">{completedCount}</span>
                <span className="stat-label">tasks done</span>
              </div>
            </div>
            <button onClick={closeNotification} className="notification-btn">
              Continue Coding 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
