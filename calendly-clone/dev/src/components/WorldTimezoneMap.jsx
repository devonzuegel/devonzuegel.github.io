import React from 'react';

// Map regions roughly corresponding to common timezone areas
const TIMEZONE_REGIONS = [
  { 
    id: 'pacific', 
    name: 'Pacific',
    timezones: ['Pacific/Honolulu', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Midway'],
    path: 'M10,80 L60,80 L60,130 L10,130 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'us_west', 
    name: 'US West Coast', 
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M60,70 L90,70 L90,110 L60,110 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'us_mountain', 
    name: 'US Mountain', 
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M90,70 L110,70 L110,110 L90,110 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'us_central', 
    name: 'US Central', 
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M110,70 L125,70 L125,110 L110,110 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'us_east', 
    name: 'US East Coast', 
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M125,70 L145,70 L145,110 L125,110 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'south_america', 
    name: 'South America', 
    timezones: ['America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Santiago'],
    path: 'M125,115 L145,115 L145,160 L105,160 L105,130 L125,130 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'western_europe', 
    name: 'Western Europe', 
    timezones: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid'],
    path: 'M150,60 L170,60 L170,100 L150,100 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'eastern_europe', 
    name: 'Eastern Europe', 
    timezones: ['Europe/Moscow', 'Europe/Helsinki', 'Europe/Athens', 'Europe/Istanbul'],
    path: 'M170,60 L190,60 L190,100 L170,100 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'middle_east', 
    name: 'Middle East', 
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Tehran', 'Asia/Jerusalem'],
    path: 'M190,60 L210,60 L210,100 L190,100 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'india', 
    name: 'India', 
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Karachi', 'Asia/Dhaka'],
    path: 'M210,60 L230,60 L230,100 L210,100 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'asia', 
    name: 'Asia', 
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul'],
    path: 'M230,40 L260,40 L260,100 L230,100 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'japan', 
    name: 'Japan', 
    timezones: ['Asia/Tokyo'],
    path: 'M260,50 L275,50 L275,80 L260,80 Z', 
    transform: 'translate(0, 0)' 
  },
  { 
    id: 'australia', 
    name: 'Australia', 
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Australia/Brisbane'],
    path: 'M240,110 L270,110 L270,150 L240,150 Z', 
    transform: 'translate(0, 0)' 
  }
];

function WorldTimezoneMap({ onRegionSelect, selectedTimezone }) {
  // Find which region contains the selected timezone
  const getSelectedRegion = () => {
    if (!selectedTimezone) return null;
    
    return TIMEZONE_REGIONS.find(region => 
      region.timezones.some(tz => tz === selectedTimezone)
    )?.id || null;
  };

  const handleRegionClick = (region) => {
    // Default to first timezone in the region
    onRegionSelect(region.timezones[0]);
  };

  return (
    <div className="world-timezone-map">
      <svg width="300" height="170" viewBox="0 0 300 170">
        <rect x="0" y="0" width="300" height="170" fill="#f0f0f0" />
        
        {/* World map regions */}
        {TIMEZONE_REGIONS.map(region => (
          <g key={region.id} onClick={() => handleRegionClick(region)}>
            <path
              d={region.path}
              transform={region.transform}
              fill={getSelectedRegion() === region.id ? '#90caf9' : '#e0e0e0'}
              stroke="#fff"
              strokeWidth="1"
              className="timezone-region"
            />
            <title>{region.name}</title>
          </g>
        ))}
        
        {/* Region labels */}
        <text x="35" y="105" className="map-label" fontSize="6">Pacific</text>
        <text x="75" y="90" className="map-label" fontSize="6">West</text>
        <text x="100" y="90" className="map-label" fontSize="6">MTN</text>
        <text x="117" y="90" className="map-label" fontSize="6">CTL</text>
        <text x="135" y="90" className="map-label" fontSize="6">East</text>
        <text x="125" y="140" className="map-label" fontSize="6">S. America</text>
        <text x="160" y="80" className="map-label" fontSize="6">W. Europe</text>
        <text x="180" y="80" className="map-label" fontSize="6">E. Europe</text>
        <text x="200" y="80" className="map-label" fontSize="6">Middle East</text>
        <text x="220" y="80" className="map-label" fontSize="6">India</text>
        <text x="245" y="70" className="map-label" fontSize="6">Asia</text>
        <text x="267" y="65" className="map-label" fontSize="6">JP</text>
        <text x="255" y="130" className="map-label" fontSize="6">Australia</text>
      </svg>
      
      <div className="timezone-region-legend">
        <p className="legend-title">Click a region to select its timezone</p>
      </div>
    </div>
  );
}

export default WorldTimezoneMap;