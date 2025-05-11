import React, { useEffect, useState, useRef } from 'react';
import WorldTimezoneMap from './WorldTimezoneMap';

function TimezoneSelector({ selectedTimezone, onTimezoneChange }) {
  const [timezones, setTimezones] = useState([]);
  const [timezoneAbbreviations, setTimezoneAbbreviations] = useState({});
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Detect local timezone on initial load and cache timezone abbreviations
  useEffect(() => {
    const localTimezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzList = getCommonTimezones();
    setTimezones(tzList);

    // Cache timezone abbreviations for more efficient searching
    const abbreviations = {};
    const now = new Date();

    tzList.forEach(tz => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'short',
        });

        const tzAbbreviation = formatter.formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || '';

        abbreviations[tz] = tzAbbreviation;
      } catch (error) {
        abbreviations[tz] = '';
      }
    });

    setTimezoneAbbreviations(abbreviations);

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

  // Focus the search input when dropdown is opened and manage body scroll
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small timeout to ensure the dropdown is rendered
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 50);

      // Prevent scrolling on the body when overlay is active
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling when dropdown is closed
      document.body.style.overflow = '';
    }

    // Cleanup function to ensure scrolling is restored if component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const filteredTimezones = timezones.filter(tz => {
    const searchText = search.toLowerCase();

    // Check if the timezone identifier includes the search text
    if (tz.toLowerCase().includes(searchText)) {
      return true;
    }

    // Check if the timezone name (city) includes the search text
    const cityName = tz.split('/').pop().replace(/_/g, ' ').toLowerCase();
    if (cityName.includes(searchText)) {
      return true;
    }

    // Check if the timezone abbreviation (PDT, EDT, etc.) includes the search text
    const tzAbbreviation = timezoneAbbreviations[tz] || '';
    return tzAbbreviation.toLowerCase().includes(searchText);
  });

  const formatTimezone = (timezone) => {
    // Format the timezone for display (e.g., "America/Los_Angeles" => "Los Angeles (PDT)")
    try {
      // Reuse cached timezone abbreviation if available
      const tzAbbreviation = timezoneAbbreviations[timezone] || '';

      // Format city name
      const city = timezone.split('/').pop().replace(/_/g, ' ');

      return `${city} (${tzAbbreviation})`;
    } catch (error) {
      console.error('Error formatting timezone:', error);
      return timezone;
    }
  };

  return (
    <>
      {isOpen && <div className="timezone-overlay" onClick={(e) => {
        e.stopPropagation();
        setIsOpen(false);
      }}></div>}
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
            placeholder="Search by timezone or city"
            value={search}
            onChange={handleSearchChange}
            onClick={(e) => e.stopPropagation()}
            className="timezone-search"
            ref={searchInputRef}
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
    </>
  );
}

export default TimezoneSelector;