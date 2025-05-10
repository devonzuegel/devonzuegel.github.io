import React, { useEffect, useState, useRef } from 'react';
import WorldTimezoneMap from './WorldTimezoneMap';

function TimezoneSelector({ selectedTimezone, onTimezoneChange }) {
  const [timezones, setTimezones] = useState([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const dropdownRef = useRef(null);

  // Detect local timezone on initial load
  useEffect(() => {
    const localTimezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezones(getCommonTimezones());
    if (!selectedTimezone) {
      onTimezoneChange(localTimezoneName);
    }
  }, [selectedTimezone, onTimezoneChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getCommonTimezones = () => {
    return [
      'America/Los_Angeles', // Pacific Time (US & Canada)
      'America/Denver',      // Mountain Time (US & Canada)
      'America/Chicago',     // Central Time (US & Canada)
      'America/New_York',    // Eastern Time (US & Canada)
      'America/Anchorage',   // Alaska
      'Pacific/Honolulu',    // Hawaii
      'Europe/London',       // GMT/UTC
      'Europe/Paris',        // Central European Time
      'Europe/Helsinki',     // Eastern European Time
      'Asia/Tokyo',          // Japan
      'Asia/Shanghai',       // China
      'Asia/Kolkata',        // India
      'Australia/Sydney',    // Australia
      'Pacific/Auckland',    // New Zealand
    ];
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setViewMode('list'); // Switch to list view when searching
  };

  const handleMapSelection = (timezone) => {
    onTimezoneChange(timezone);
    setIsOpen(false);
  };

  const filteredTimezones = timezones.filter(tz => 
    tz.toLowerCase().includes(search.toLowerCase())
  );

  const formatTimezone = (timezone) => {
    // Format the timezone for display (e.g., "America/Los_Angeles" => "Los Angeles (GMT-7)")
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      });

      // Get GMT offset
      const gmtOffset = formatter.formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
      
      // Format city name
      const city = timezone.split('/').pop().replace(/_/g, ' ');
      
      return `${city} (${gmtOffset})`;
    } catch (error) {
      console.error('Error formatting timezone:', error);
      return timezone;
    }
  };

  return (
    <div className="timezone-selector" ref={dropdownRef}>
      <div
        className="timezone-dropdown-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Timezone: {formatTimezone(selectedTimezone)}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="timezone-dropdown-menu">
          <div className="timezone-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('map');
              }}
            >
              Map View
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setViewMode('list');
              }}
            >
              List View
            </button>
          </div>

          <input
            type="text"
            placeholder="Search timezones..."
            value={search}
            onChange={handleSearchChange}
            onClick={(e) => e.stopPropagation()}
            className="timezone-search"
          />

          {viewMode === 'map' && search === '' ? (
            <div className="timezone-map-container" onClick={(e) => e.stopPropagation()}>
              <WorldTimezoneMap
                selectedTimezone={selectedTimezone}
                onRegionSelect={handleMapSelection}
              />
            </div>
          ) : (
            <div className="timezone-list">
              {filteredTimezones.map((timezone) => (
                <div
                  key={timezone}
                  className={`timezone-option ${selectedTimezone === timezone ? 'selected' : ''}`}
                  onClick={() => {
                    onTimezoneChange(timezone);
                    setIsOpen(false);
                  }}
                >
                  {formatTimezone(timezone)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TimezoneSelector;