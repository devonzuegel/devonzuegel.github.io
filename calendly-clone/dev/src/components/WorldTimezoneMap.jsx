import React from 'react';

// More comprehensive timezone data
const TIMEZONE_REGIONS = [
  // North America
  {
    id: 'pacific',
    name: 'Pacific Time',
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M 51,54 L 55,54 L 55,68 L 51,68 Z',
    labelX: 52,
    labelY: 61
  },
  {
    id: 'mountain',
    name: 'Mountain Time',
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M 55,54 L 59,54 L 59,68 L 55,68 Z',
    labelX: 56,
    labelY: 61
  },
  {
    id: 'central',
    name: 'Central Time',
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M 59,54 L 63,54 L 63,68 L 59,68 Z',
    labelX: 60,
    labelY: 61
  },
  {
    id: 'eastern',
    name: 'Eastern Time',
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M 63,54 L 67,54 L 67,68 L 63,68 Z',
    labelX: 64,
    labelY: 61
  },
  {
    id: 'atlantic',
    name: 'Atlantic Time',
    timezones: ['America/Halifax', 'America/Puerto_Rico', 'America/Caracas'],
    path: 'M 67,54 L 71,54 L 71,68 L 67,68 Z',
    labelX: 68,
    labelY: 61
  },
  {
    id: 'alaska',
    name: 'Alaska',
    timezones: ['America/Anchorage'],
    path: 'M 43,54 L 51,54 L 51,60 L 43,60 Z',
    labelX: 47,
    labelY: 57
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    timezones: ['Pacific/Honolulu'],
    path: 'M 35,68 L 42,68 L 42,72 L 35,72 Z',
    labelX: 38,
    labelY: 70
  },
  
  // Central and South America
  {
    id: 'mexico',
    name: 'Mexico',
    timezones: ['America/Mexico_City', 'America/Chihuahua', 'America/Cancun'],
    path: 'M 55,70 L 62,70 L 62,77 L 55,77 Z',
    labelX: 58,
    labelY: 74
  },
  {
    id: 'central_america',
    name: 'Central America',
    timezones: ['America/Guatemala', 'America/Panama', 'America/Costa_Rica'],
    path: 'M 60,77 L 65,77 L 65,82 L 60,82 Z',
    labelX: 62,
    labelY: 79
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
    timezones: ['America/Havana', 'America/Santo_Domingo', 'America/Port_of_Spain'],
    path: 'M 65,72 L 71,72 L 71,77 L 65,77 Z',
    labelX: 68,
    labelY: 74
  },
  {
    id: 'brazil_east',
    name: 'Brazil East',
    timezones: ['America/Sao_Paulo', 'America/Rio_de_Janeiro', 'America/Belem'],
    path: 'M 75,82 L 82,82 L 82,95 L 75,95 Z',
    labelX: 78,
    labelY: 88
  },
  {
    id: 'brazil_west',
    name: 'Brazil West',
    timezones: ['America/Manaus', 'America/Campo_Grande'],
    path: 'M 68,82 L 75,82 L 75,95 L 68,95 Z',
    labelX: 71,
    labelY: 88
  },
  {
    id: 'argentina',
    name: 'Argentina',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza'],
    path: 'M 68,95 L 75,100 L 68,105 Z',
    labelX: 71,
    labelY: 100
  },
  {
    id: 'chile',
    name: 'Chile',
    timezones: ['America/Santiago', 'America/Punta_Arenas'],
    path: 'M 65,95 L 68,95 L 68,105 L 65,105 Z',
    labelX: 66,
    labelY: 100
  },
  {
    id: 'andes',
    name: 'Andes',
    timezones: ['America/Lima', 'America/Bogota', 'America/La_Paz'],
    path: 'M 63,82 L 68,82 L 68,95 L 63,95 Z',
    labelX: 65,
    labelY: 88
  },

  // Europe
  {
    id: 'western_europe',
    name: 'Western Europe',
    timezones: ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'],
    path: 'M 82,54 L 87,54 L 87,64 L 82,64 Z',
    labelX: 84,
    labelY: 58
  },
  {
    id: 'central_europe',
    name: 'Central Europe',
    timezones: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
    path: 'M 87,54 L 92,54 L 92,64 L 87,64 Z',
    labelX: 89,
    labelY: 58
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe',
    timezones: ['Europe/Helsinki', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Sofia'],
    path: 'M 92,54 L 97,54 L 97,64 L 92,64 Z',
    labelX: 94,
    labelY: 58
  },
  {
    id: 'russia_west',
    name: 'Russia West',
    timezones: ['Europe/Moscow', 'Europe/Kaliningrad'],
    path: 'M 97,45 L 107,45 L 107,60 L 97,60 Z',
    labelX: 102,
    labelY: 52
  },
  
  // Africa
  {
    id: 'north_africa',
    name: 'North Africa',
    timezones: ['Africa/Cairo', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca'],
    path: 'M 84,64 L 92,64 L 92,74 L 84,74 Z',
    labelX: 88,
    labelY: 69
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    timezones: ['Africa/Lagos', 'Africa/Accra', 'Africa/Dakar'],
    path: 'M 80,74 L 84,74 L 84,84 L 80,84 Z',
    labelX: 81,
    labelY: 78
  },
  {
    id: 'central_africa',
    name: 'Central Africa',
    timezones: ['Africa/Kinshasa', 'Africa/Khartoum', 'Africa/Bangui'],
    path: 'M 84,74 L 92,74 L 92,84 L 84,84 Z',
    labelX: 88,
    labelY: 78
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    timezones: ['Africa/Nairobi', 'Africa/Addis_Ababa', 'Africa/Kampala'],
    path: 'M 92,74 L 97,74 L 97,84 L 92,84 Z',
    labelX: 94,
    labelY: 78
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    timezones: ['Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo'],
    path: 'M 88,84 L 94,84 L 94,94 L 88,94 Z',
    labelX: 90,
    labelY: 89
  },
  
  // Middle East & Central Asia
  {
    id: 'middle_east',
    name: 'Middle East',
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Jerusalem', 'Asia/Tehran'],
    path: 'M 97,60 L 107,60 L 107,74 L 97,74 Z',
    labelX: 102,
    labelY: 67
  },
  {
    id: 'central_asia',
    name: 'Central Asia',
    timezones: ['Asia/Tashkent', 'Asia/Almaty', 'Asia/Yekaterinburg'],
    path: 'M 107,50 L 117,50 L 117,65 L 107,65 Z',
    labelX: 112,
    labelY: 57
  },
  
  // South Asia
  {
    id: 'india',
    name: 'India',
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka'],
    path: 'M 110,65 L 120,65 L 120,77 L 110,77 Z',
    labelX: 115,
    labelY: 71
  },
  
  // East Asia
  {
    id: 'se_asia',
    name: 'Southeast Asia',
    timezones: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur'],
    path: 'M 120,65 L 128,65 L 128,82 L 120,82 Z',
    labelX: 124,
    labelY: 74
  },
  {
    id: 'china',
    name: 'China',
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
    path: 'M 120,55 L 135,55 L 135,65 L 120,65 Z',
    labelX: 127,
    labelY: 60
  },
  {
    id: 'japan_korea',
    name: 'Japan & Korea',
    timezones: ['Asia/Tokyo', 'Asia/Seoul'],
    path: 'M 135,55 L 142,55 L 142,65 L 135,65 Z',
    labelX: 138,
    labelY: 60
  },
  
  // Oceania
  {
    id: 'australia_west',
    name: 'Australia West',
    timezones: ['Australia/Perth'],
    path: 'M 120,82 L 128,82 L 128,95 L 120,95 Z',
    labelX: 124,
    labelY: 88
  },
  {
    id: 'australia_central',
    name: 'Australia Central',
    timezones: ['Australia/Adelaide', 'Australia/Darwin'],
    path: 'M 128,82 L 135,82 L 135,95 L 128,95 Z',
    labelX: 131,
    labelY: 88
  },
  {
    id: 'australia_east',
    name: 'Australia East',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    path: 'M 135,82 L 142,82 L 142,95 L 135,95 Z',
    labelX: 138,
    labelY: 88
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    path: 'M 145,90 L 150,90 L 150,98 L 145,98 Z',
    labelX: 147,
    labelY: 94
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
      <svg viewBox="0 0 180 120" width="100%" height="280">
        {/* World map background */}
        <rect x="0" y="0" width="180" height="120" fill="#f9f9f9" />
        
        {/* Ocean background */}
        <rect x="30" y="40" width="125" height="70" fill="#e6f2ff" rx="2" ry="2" />
        
        {/* Map outline for reference */}
        <path 
          d="M 35,40 L 150,40 L 150,95 L 35,95 Z" 
          fill="none" 
          stroke="#ccc" 
          strokeWidth="0.2" 
          strokeDasharray="1,1"
        />
        
        {/* Draw all regions */}
        {TIMEZONE_REGIONS.map(region => (
          <g key={region.id} onClick={() => handleRegionClick(region)}>
            <path
              d={region.path}
              fill={getSelectedRegion() === region.id ? '#90caf9' : '#d0e8ff'}
              stroke="#ffffff"
              strokeWidth="0.5"
              className="timezone-region"
            />
            <title>{region.name}: {region.timezones.join(', ')}</title>
          </g>
        ))}
        
        {/* Add equator line */}
        <line x1="30" y1="75" x2="155" y2="75" stroke="#ccc" strokeWidth="0.3" strokeDasharray="1,1" />
        
        {/* Region labels - only show some for readability */}
        <g className="map-labels" fontSize="2" textAnchor="middle">
          <text x="52" y="61" className="map-label">Pacific</text>
          <text x="64" y="61" className="map-label">Eastern</text>
          <text x="78" y="88" className="map-label">Brazil</text>
          <text x="71" y="100" className="map-label">Argentina</text>
          <text x="84" y="58" className="map-label">W. Europe</text>
          <text x="102" y="67" className="map-label">Middle East</text>
          <text x="115" y="71" className="map-label">India</text>
          <text x="127" y="60" className="map-label">China</text>
          <text x="138" y="60" className="map-label">Japan</text>
          <text x="131" y="88" className="map-label">Australia</text>
        </g>
        
        {/* Compass indicator */}
        <g transform="translate(40, 50)" fontSize="3">
          <circle cx="0" cy="0" r="3" fill="white" stroke="#ccc" strokeWidth="0.2" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">N</text>
        </g>
      </svg>
      
      <div className="timezone-region-legend">
        <p className="legend-title">Click a region to select its timezone</p>
      </div>
    </div>
  );
}

export default WorldTimezoneMap;