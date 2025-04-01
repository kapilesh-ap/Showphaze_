import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock, 
  FaTimes, FaUser, FaChevronDown, FaFilter, FaThList, FaTable, FaPlus,FaTrash } from "react-icons/fa";
import "./App.css";

import { parseISO, format,isValid  } from 'date-fns';

const formatDate = (dateString) => {
  if (!dateString) return "-";

  const parsedDate = parseISO(dateString);

  if (!isValid(parsedDate)) return "Invalid Date";

  return format(parsedDate, "EEEE, MMMM d, yyyy"); // Example: Monday, January 27, 2025
};

const formatLabel = (str) =>
  str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());


    const EventBookingApp = () => {
      // States
      const [query, setQuery] = useState("");
      const [response, setResponse] = useState("");
      const [loading, setLoading] = useState(false);
      const [events, setEvents] = useState([]);
      const [showFilters, setShowFilters] = useState(false);
      const [editableCards, setEditableCards] = useState([]);
      const [editableCardColumns, setEditableCardColumns] = useState(new Set());
      const [newColumnInput, setNewColumnInput] = useState("");
      const [activeView, setActiveView] = useState("grid");
      const [selectedEvent, setSelectedEvent] = useState(null);
      const [filters, setFilters] = useState({
        date: "",
        position: "",
        hours: ""
      });
      const [originalData, setOriginalData] = useState([]);
    
      // Handle query
const handleQuery = async () => {
        // Reset ALL states to their initial values
        setLoading(true);
        setResponse("");
        setEvents([]);
        setShowFilters(false);
        setEditableCards([]);
        setEditableCardColumns(new Set());
        setNewColumnInput("");
        setActiveView("grid");
        setSelectedEvent(null);
        setFilters({
          date: "",
          position: "",
          hours: ""
        });
        setOriginalData([]);
    
        try {

          const res = await axios.post("http://localhost:8000/query", { query });
          
          console.log("API Response:", res.data.data);
          setResponse(res.data.data);
    
          // Create editable cards
          const newEditableCards = [];
          const newColumns = new Set();
    
          // Determine number of cards and collect all unique keys
          const count = Array.isArray(res.data.data.positionName) 
            ? res.data.data.positionName.length 
            : Object.keys(res.data.data.quantity || {}).length;
          
          for (let i = 0; i < count; i++) {
            const card = {};
            Object.entries(res.data.data).forEach(([key, val]) => {
              // Collect all keys
              newColumns.add(key);
    
              // Populate card data
              if (Array.isArray(val)) card[key] = val[i];
              else if (typeof val === "object" && val !== null) {
                card[key] = val[Object.keys(val)[i]];
              } else {
                card[key] = val;
              }
            });
            newEditableCards.push(card);
          }
    
          // Set states with new data
          setEditableCards(newEditableCards);
          setEditableCardColumns(newColumns);
          setOriginalData(res.data.data);
          
          // Fetch events based on query
          await fetchEvents(query);
        } catch (error) {
          console.error("Error in handleQuery:", error);
          setResponse("Error fetching data.");
          
          // Reset all states in case of error
          setEditableCards([]);
          setEditableCardColumns(new Set());
          setEvents([]);
        } finally {
          setLoading(false);
        }
      };
    
      // Add new position card
const addNewPositionCard = () => {
        const newCard = {};
        editableCardColumns.forEach(column => {
          newCard[column] = '';
        });
        setEditableCards([...editableCards, newCard]);
      };
    
// Add new column

// Add new column
const addNewColumn = () => {
  if (!newColumnInput) return;

// Sanitize column name
const sanitizedColumnName = newColumnInput
  .trim()
  .replace(/[^a-zA-Z0-9]/g, '')
  .replace(/^./, char => char.toLowerCase());

  // Validate column name
  if (!sanitizedColumnName) {
    alert("Invalid column name. Please use alphanumeric characters.");
    setNewColumnInput("");
    return;
  }

  // Check if column already exists
  if (editableCardColumns.has(sanitizedColumnName)) {
    alert(`Column "${sanitizedColumnName}" already exists.`);
    setNewColumnInput("");
    return;
  }

  // Update columns for all existing cards
  const updatedColumns = new Set(editableCardColumns);
  updatedColumns.add(sanitizedColumnName);
  setEditableCardColumns(updatedColumns);

  // Add the new column to existing cards
  const updatedCards = editableCards.map(card => ({
    ...card,
    [sanitizedColumnName]: ''
  }));
  setEditableCards(updatedCards);

  // Clear the input
  setNewColumnInput("");
  };
    
      // Remove a column
const removeColumn = (columnToRemove) => {
        // Update columns
        const updatedColumns = new Set(editableCardColumns);
        updatedColumns.delete(columnToRemove);
        setEditableCardColumns(updatedColumns);
    
        // Remove column from all cards
        const updatedCards = editableCards.map(card => {
          const { [columnToRemove]: removedColumn, ...rest } = card;
          return rest;
        });
        setEditableCards(updatedCards);
      };
  
const processResponse = async (apiResponse, transcription) => {
        // Reset ALL states to their initial values
        setLoading(true);
        setResponse("");
        setEvents([]);
        setShowFilters(false);
        setEditableCards([]);
        setEditableCardColumns(new Set());
        setNewColumnInput("");
        setActiveView("grid");
        setSelectedEvent(null);
        setFilters({
          date: "",
          position: "",
          hours: ""
        });
        setOriginalData([]);
      
        try {
          // Wrap response under `.data` if missing
          const wrappedData = apiResponse?.data ?? apiResponse;
          if (wrappedData.position_name) {
            wrappedData.positionName = wrappedData.position_name;
            delete wrappedData.position_name;
          }
      
          console.log("API Response:", wrappedData);
          setResponse(wrappedData);
      
          // Create editable cards
          const newEditableCards = [];
          const newColumns = new Set();
      
          // Determine number of cards and collect all unique keys
          const count = Array.isArray(wrappedData.positionName)
            ? wrappedData.positionName.length
            : Object.keys(wrappedData.quantity || {}).length;
          console.log(count)
          for (let i = 0; i < count; i++) {
            const card = {};
            Object.entries(wrappedData).forEach(([key, val]) => {
              // Collect all keys
              newColumns.add(key);
      
              // Populate card data
              if (Array.isArray(val)) card[key] = val[i];
              else if (typeof val === "object" && val !== null) {
                card[key] = val[Object.keys(val)[i]];
              } else {
                card[key] = val;
              }
            });
            newEditableCards.push(card);
          }
      
          // Set states with new data
          setEditableCards(newEditableCards);
          setEditableCardColumns(newColumns);
          setOriginalData(wrappedData);
      
          // Fetch events based on the transcription (voice query)
          await fetchEvents(transcription);
        } catch (error) {
          console.error("Error in processResponse:", error);
          setResponse("Error fetching data.");
      
          // Reset all states in case of error
          setEditableCards([]);
          setEditableCardColumns(new Set());
          setEvents([]);
        } finally {
          setLoading(false);
        }
      };
      
      

      const fetchEvents = async (searchTerm) => {
        try {
          const res = await axios.post("http://localhost:8000/get_event_details", {
            query: `Fetch all positions related to "${searchTerm}"`
          });
      
          console.log("API Response:", res.data);
      
          if (
            res.data &&
            Array.isArray(res.data.data) &&
            res.data.data.length === 1 &&
            res.data.data[0].error
          ) {
            // If there's an error message like "No match found"
            setResponse(res.data.data[0].error);
            setEvents([]);
            setOriginalData([]);
            return; // stop further processing
          }
      
          if (res.data && res.data.data && res.data.data.length > 0) {
            setOriginalData(res.data.data);
      
            const formattedEvents = res.data.data.map((event, idx) => ({
              Id: event.positionId || idx,
              positionName: event.positionName || "Unknown Position",
              startDate: event.startDate,
              timeIn: event.timeIn,
              timeOut: event.timeOut,
              location: event.location || "Location not provided",
              quantity: event.quantity || 0,
              
              positionDescription:
                event.additionalComments && event.additionalComments.length > 0
                  ? event.additionalComments
                  : `${event.positionName || "Position"} - ${
                      event.numberOfHours || "N/A"
                    } hour shift.`,
              attire: event.attire || "Not specified",
              defaultRate: "15.00",
              contractorRate: "18.00",
              numberOfHours: event.numberOfHours,
              complexity: event.complexity
            }));
      
            setEvents(formattedEvents);
          } else {
            setResponse("No data available.");
            setEvents([]);
            setOriginalData([]);
          }
        } catch (error) {
          console.error("Error fetching positions:", error);
          setResponse("Failed to fetch events.");
          setEvents([]);
          setOriginalData([]);
        }
      };
      
  // Get table headers dynamically from the first object's keys
  const getTableHeaders = () => {
    if (originalData.length === 0) return [];
    
    // Get all keys from the first object
    return Object.keys(originalData[0]).filter(key => 
      // Exclude prototype or internal properties
      key !== "__proto__" && !key.startsWith("[[")
    );
  };

  // Format cell data based on key type
  const formatCellData = (item, key) => {
    if (!item[key]) return "-";
    
    // Format dates and times
    if (key === "startDate") return formatDate(item[key]);
    if (key === "timeIn" || key === "timeOut") return formatTime(item[key]);
    
    // Format booleans
    if (typeof item[key] === "boolean") return item[key] ? "Yes" : "No";
    
    // Return other values as is
    return item[key];
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters({...filters, [field]: value});
  };

  // Handle event selection
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  // Close event details
  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  // Format time to human-readable
  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };


  const [recording, setRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState(null);
const [audioChunks, setAudioChunks] = useState([]);

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    setRecording(true);

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });

      // Prepare form data
      const formData = new FormData();
      formData.append("file", blob, "voice_input.webm");

      try {
        const res = await fetch("http://localhost:8000/voice-command", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        const { transcription, response } = result;

          setQuery(transcription);
          processResponse(response, transcription); // ✅ now passing transcription too


      } catch (error) {
        console.error("Upload failed", error);
      }
    };

    setAudioChunks(chunks);
    recorder.start();
  } catch (error) {
    console.error("Microphone error", error);
  }
};

const stopRecording = () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    setRecording(false);
  }
};


  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="logo">
          <FaCalendarAlt className="logo-icon" />
          <span className="logo-text">AI Search</span>
        </h1>
        
        <nav className="main-nav">
          <a href="#" className="nav-link">Dashboard</a>
          <a href="#" className="nav-link">Browse Events</a>
          <a href="#" className="nav-link">Calendar</a>
          <a href="#" className="nav-link">Saved</a>
        </nav>
        
        <div className="user-menu">
          <button className="user-button">
            <FaUser />
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="hero-section">
         
          
          <div className="search-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search for events, positions, or locations..."
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
              />
              <button 
                onClick={handleQuery} 
                className="search-button"
              >
                Search
              </button>
            </div>
            <div style={{ margin: "1rem 0" }}>
            <div className="voice-command-container">
              <button 
                onClick={recording ? stopRecording : startRecording} 
                className={`record-button ${recording ? 'recording' : ''}`}
              >
                {recording ? "🛑 Stop Listening" : "🎙️ Speak Your Request"}
              </button>
            </div>

          </div>
          {recording && (
            <div className="waveform-animation">
              {[...Array(20)].map((_, i) => (
                <span key={i} className="bar" style={{ animationDelay: `${i * 0.1}s` }}></span>
              ))}
            </div>
          )}



            
      {!loading && response && typeof response === 'object' && response.positionName && editableCards.length > 0 ? (
        <div className="scorecards-container">
          {editableCards.map((card, index) => (
            <div className="scorecard" key={`edit-${index}`}>
              {Array.from(editableCardColumns).map((key) => (
                <div key={`${key}-${index}`} className="scorecard-column-wrapper" style={{ marginBottom: '0.5rem' }}>
                  <label className="scorecard-column-label" style={{ fontWeight: 600, display: 'block' }}>
                    {formatLabel(key)}
                    <button 
                      onClick={() => removeColumn(key)}
                      className="remove-column-btn"
                      title="Remove Column"
                    >
                      <FaTrash />
                    </button>
                  </label>
                  <input
                    type="text"
                    value={card[key] || ''}
                    onChange={(e) => {
                      const updatedCards = [...editableCards];
                      updatedCards[index][key] = e.target.value;
                      setEditableCards(updatedCards);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.4rem",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                      background: "#1e2131",
                      color: "white"
                    }}
                  />
                </div>
              ))}

              <button
                className="scorecard-save-button"
                onClick={() => {
                  const newQuery = editableCards
                    .flatMap((card, cardIndex) =>
                      Object.entries(card).map(
                        ([k, v]) => `${formatLabel(k)} (Card ${cardIndex + 1}): ${v}`
                      )
                    )
                    .join(", ");
                  
                  setQuery(newQuery);
                  handleQuery(); // Resend the updated request
                }}
              >
                Send Again
              </button>
            </div>
          ))}

          {/* Add Column / Add Position actions */}
          <div className="scorecard-actions">
            <div className="new-column-input-wrapper" style={{ marginBottom: '1rem' }}>
              <input 
                type="text"
                value={newColumnInput}
                onChange={(e) => setNewColumnInput(e.target.value)}
                placeholder="Enter new column name"
                className="new-column-input"
                style={{
                  padding: "0.4rem",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  marginRight: "0.5rem",
                  background: "#1e2131",
                  color: "white"
                }}
              />
              <button 
                onClick={addNewColumn} 
                className="add-column-button"
                disabled={!newColumnInput}
              >
                <FaPlus /> Add Column
              </button>
            </div>

            <button 
              onClick={() => {
                const newCard = {};
                editableCardColumns.forEach(column => {
                  newCard[column] = '';
                });
                setEditableCards([...editableCards, newCard]);
              }} 
              className="add-position-button"
            >
              <FaPlus /> Add Position
            </button>
          </div>
        </div>
      ) : (
        response && !loading && (
          <div className="response-box">
            <p>
              {typeof response === 'string'
                ? response
                : response[0]?.error || 'No results found.'}
            </p>
          </div>
        )
      )}

          </div>
          
          <div className="events-controls">
            <h3 className="section-title">Available Positions</h3>
            <div className="control-buttons">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="filter-button"
              >
                <FaFilter />
                <span>Filters</span>
                <FaChevronDown className={showFilters ? 'rotate-icon' : ''} />
              </button>
              
              <div className="view-toggle">
                <button 
                  onClick={() => setActiveView("grid")}
                  className={`view-button ${activeView === "grid" ? 'active' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                  </svg>
                </button>
                <button 
                  onClick={() => setActiveView("list")}
                  className={`view-button ${activeView === "list" ? 'active' : ''}`}
                >
                  <FaThList />
                </button>
                <button 
                  onClick={() => setActiveView("table")}
                  className={`view-button ${activeView === "table" ? 'active' : ''}`}
                >
                  <FaTable />
                </button>
              </div>
            </div>
          </div>
          
          {showFilters && (
            <div className="filters-panel">
              <div className="filters-grid">
                <div className="filter-item">
                  <label className="filter-label">Date</label>
                  <input 
                    type="date" 
                    className="filter-input"
                    value={filters.date}
                    onChange={(e) => handleFilterChange("date", e.target.value)}
                  />
                </div>
                <div className="filter-item">
                  <label className="filter-label">Position Type</label>
                  <select 
                    className="filter-input"
                    value={filters.position}
                    onChange={(e) => handleFilterChange("position", e.target.value)}
                  >
                    <option value="">All Positions</option>
                    <option value="coordinator">Event Coordinator</option>
                    <option value="technical">Technical Staff</option>
                    <option value="service">Service Staff</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label className="filter-label">Hours</label>
                  <select 
                    className="filter-input"
                    value={filters.hours}
                    onChange={(e) => handleFilterChange("hours", e.target.value)}
                  >
                    <option value="">Any Hours</option>
                    <option value="morning">Morning (6AM-12PM)</option>
                    <option value="afternoon">Afternoon (12PM-6PM)</option>
                    <option value="evening">Evening (6PM-12AM)</option>
                    <option value="overnight">Overnight (12AM-6AM)</option>
                  </select>
                </div>
              </div>
              <div className="filters-actions">
                <button className="apply-filters-button">
                  Apply Filters
                </button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="loader-container">
              <div className="loader"></div>
            </div>
          ) : (
            <>
              {activeView === "table" ? (
                <div className="table-container">
                  {originalData.length > 0 ? (
                    <table className="events-table">
                      <thead>
                        <tr>
                          {getTableHeaders().map(header => (
                            <th key={header}>
                              {header.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, str => str.toUpperCase())}
                            </th>
                          ))}
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {originalData.map((item, index) => (
                          <tr key={index} onClick={() => {
                            // Find corresponding formatted event to show in modal
                            const formattedEvent = events.find(e => e.Id === item.positionId);
                            handleEventSelect(formattedEvent || item);
                          }}>
                            {getTableHeaders().map(key => (
                              <td key={`${index}-${key}`}>
                                {formatCellData(item, key)}
                              </td>
                            ))}
                            <td>
                              <button className="view-details-btn">View</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="no-data-message">No data available</div>
                  )}
                </div>
              ) : (
                <div className={`events-grid ${activeView === "list" ? 'list-view' : ''}`}>
                  {events.map((event) => (
                    <div
                      key={event.Id}
                      className={`event-card ${activeView === "list" ? 'list-card' : ''}`}
                      onClick={() => handleEventSelect(event)}
                    >
                      {activeView === "grid" ? (
                        <>
                          
                          <div className="event-details">
                            <h4 className="event-title">{event.positionName}</h4>
                            <p>{event.positionDescription || "No description available."}</p>
                            <div>
                              <strong>Default Rate:</strong> {event.defaultRate === "Not specified" ? event.defaultRate : `$${event.defaultRate}`} | 
                              <strong>Contractor Rate:</strong> {event.contractorRate === "Not specified" ? event.contractorRate : `$${event.contractorRate}`}
                            </div>

                            <div className="event-info">
                              <FaCalendarAlt className="event-icon" />
                              <span>{formatDate(event.startDate)}</span>
                            </div>
                            <div className="event-info">
                              <FaClock className="event-icon" />
                              <span>{formatTime(event.timeIn)} - {formatTime(event.timeOut)}</span>
                            </div>
                            <div className="event-info">
                              <FaMapMarkerAlt className="event-icon" />
                              <span>{event.location}</span>
                            </div>
                            <div className="event-badge">
                              {event.quantity} positions available
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <img src={event.image} alt={event.positionName} className="event-image-list" />
                          <div className="event-details-list">
                            <h4 className="event-title">{event.positionName}</h4>
                            <div className="event-info">
                              <FaCalendarAlt className="event-icon" />
                              <span>{formatDate(event.startDate)}</span>
                            </div>
                            <div className="event-info-group">
                              <div className="event-info">
                                <FaClock className="event-icon" />
                                <span>{formatTime(event.timeIn)} - {formatTime(event.timeOut)}</span>
                              </div>
                              <div className="event-info">
                                <FaMapMarkerAlt className="event-icon" />
                                <span>{event.location}</span>
                              </div>
                              <div className="event-badge">
                                {event.quantity} positions
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selectedEvent && (
        <div className="modal-overlay" onClick={closeEventDetails}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <img src={selectedEvent.image} alt={selectedEvent.positionName} className="modal-image" />
              <button
                onClick={closeEventDetails}
                className="close-button"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-content">
            <h3 className="modal-title">{selectedEvent.positionName}</h3>
                  <p>{selectedEvent.positionDescription || "No description available."}</p>
                  <ul className="details-list">
                      <li><strong>Default Rate:</strong> ${selectedEvent.defaultRate}</li>
                      <li><strong>Contractor Rate:</strong> ${selectedEvent.contractorRate}</li>
                  </ul>
              
              <div className="modal-columns">
                <div className="modal-column">
                  <h4 className="column-title">Details</h4>
                  <ul className="details-list">
                    <li className="detail-item">
                      <FaCalendarAlt className="detail-icon" />
                      <div>
                        <span className="detail-label">Date</span>
                        <span className="detail-value">{formatDate(selectedEvent.startDate)}</span>
                      </div>
                    </li>
                    <li className="detail-item">
                      <FaClock className="detail-icon" />
                      <div>
                        <span className="detail-label">Time</span>
                        <span className="detail-value">{formatTime(selectedEvent.timeIn)} - {formatTime(selectedEvent.timeOut)}</span>
                      </div>
                    </li>
                    <li className="detail-item">
                      <FaMapMarkerAlt className="detail-icon" />
                      <div>
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{selectedEvent.location}</span>
                      </div>
                    </li>
                    <li className="detail-item">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="detail-icon">
                        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"></path>
                      </svg>
                      <div>
                        <span className="detail-label">Attire</span>
                        <span className="detail-value">{selectedEvent.attire}</span>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="modal-column">
                  <h4 className="column-title">Job Description</h4>
                  <p className="job-description">
                    We're looking for {selectedEvent.quantity} {selectedEvent.positionName.toLowerCase()}(s) for this exciting event. The ideal candidate will have previous experience in similar roles and excellent communication skills.
                  </p>
                  
                  <h4 className="column-title requirements-title">Requirements</h4>
                  <ul className="requirements-list">
                    <li>Previous experience in similar role</li>
                    <li>Excellent communication skills</li>
                    <li>Ability to work in a fast-paced environment</li>
                    <li>Professional appearance and attitude</li>
                  </ul>
                  
                  <div className="apply-container">
                    <button className="apply-button">
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="similar-section">
                <h4 className="similar-title">Similar Positions</h4>
                <div className="similar-grid">
                  {events.filter(e => e.id !== selectedEvent.id).slice(0, 3).map(event => (
                    <div 
                      key={event.id}
                      className="similar-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventSelect(event);
                      }}
                    >
                      <h5 className="similar-name">{event.positionName}</h5>
                      <div className="similar-date">{formatDate(event.startDate)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>© {new Date().getFullYear()} EventFinder AI. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default EventBookingApp;