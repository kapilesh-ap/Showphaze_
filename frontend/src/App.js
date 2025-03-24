import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock, 
  FaTimes, FaUser, FaChevronDown, FaFilter, FaThList, FaTable } from "react-icons/fa";
  import "./App.css";

const EventBookingApp = () => {
  // States
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
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
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/query", { query });
      setResponse(res.data.data);
      
      // Simulate fetching events based on query
      fetchEvents(query);
    } catch (error) {
      setResponse("Error fetching data.");
    }
    setLoading(false);
  };

  const fetchEvents = async (searchTerm) => {
    try {
        // Fetch positions related to the search term
        const res = await axios.post("http://localhost:8000/get_event_details", { 
            query: `Fetch all positions related to "${searchTerm}"` 
        });

        console.log("API Response:", res.data);

        // Store the original data for table view
        if (res.data && res.data.data) {
            setOriginalData(res.data.data);
            
            // Map the data for grid/list views
            const formattedEvents = res.data.data.map(event => ({
                Id: event.positionId,
                positionName: event.positionName,
                startDate: event.startDate,
                timeIn: event.timeIn,
                timeOut: event.timeOut,
                location: event.location || "Location not provided",
                quantity: event.quantity,
                image: `/images/${event.positionName?.toLowerCase()}.jpg` || "/images/default.jpg",
                positionDescription: event.additionalComments && event.additionalComments.length > 0 
                    ? event.additionalComments 
                    : `${event.positionName} position - ${event.numberOfHours} hour shift.`,
                attire: event.attire || "Not specified",
                defaultRate: "15.00", // Default placeholder rate
                contractorRate: "18.00", // Default placeholder rate
                numberOfHours: event.numberOfHours,
                complexity: event.complexity
            }));
            setEvents(formattedEvents);
        } else {
            console.warn("No positions found for the given search term.");
            setEvents([]);
            setOriginalData([]);
        }
        
    } catch (error) {
        console.error("Error fetching positions:", error);
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

  // Format date to human-readable
  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format time to human-readable
  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
            
            {response && !loading && (
              <div className="response-box">
                <p>{response}</p>
              </div>
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
                          <img src={event.image} alt={event.positionName} className="event-image" />
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