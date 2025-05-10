import React, { useState, useEffect } from 'react';

// More comprehensive timezone data with abbreviations and wider regions
const TIMEZONE_REGIONS = [
  // North America
  {
    id: 'pacific',
    name: 'Pacific Time',
    abbreviation: 'PT',
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M 40,54 L 50,54 L 50,68 L 40,68 Z',
    labelX: 45,
    labelY: 61
  },
  {
    id: 'mountain',
    name: 'Mountain Time',
    abbreviation: 'MT',
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M 50,54 L 60,54 L 60,68 L 50,68 Z',
    labelX: 55,
    labelY: 61
  },
  {
    id: 'central',
    name: 'Central Time',
    abbreviation: 'CT',
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M 60,54 L 70,54 L 70,68 L 60,68 Z',
    labelX: 65,
    labelY: 61
  },
  {
    id: 'eastern',
    name: 'Eastern Time',
    abbreviation: 'ET',
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M 70,54 L 80,54 L 80,68 L 70,68 Z',
    labelX: 75,
    labelY: 61
  },
  {
    id: 'atlantic',
    name: 'Atlantic Time',
    abbreviation: 'AT',
    timezones: ['America/Halifax', 'America/Puerto_Rico', 'America/Caracas'],
    path: 'M 80,54 L 90,54 L 90,68 L 80,68 Z',
    labelX: 85,
    labelY: 61
  },
  {
    id: 'alaska',
    name: 'Alaska',
    abbreviation: 'AKT',
    timezones: ['America/Anchorage'],
    path: 'M 30,54 L 40,54 L 40,62 L 30,62 Z',
    labelX: 35,
    labelY: 58
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HST',
    timezones: ['Pacific/Honolulu'],
    path: 'M 20,68 L 30,68 L 30,74 L 20,74 Z',
    labelX: 25,
    labelY: 71
  },
  
  // Central and South America
  {
    id: 'mexico',
    name: 'Mexico',
    abbreviation: 'CST/MST',
    timezones: ['America/Mexico_City', 'America/Chihuahua', 'America/Cancun'],
    path: 'M 50,70 L 62,70 L 62,78 L 50,78 Z',
    labelX: 56,
    labelY: 74
  },
  {
    id: 'central_america',
    name: 'Central America',
    abbreviation: 'CST',
    timezones: ['America/Guatemala', 'America/Panama', 'America/Costa_Rica'],
    path: 'M 60,78 L 70,78 L 70,85 L 60,85 Z',
    labelX: 65,
    labelY: 82
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
    abbreviation: 'EST/AST',
    timezones: ['America/Havana', 'America/Santo_Domingo', 'America/Port_of_Spain'],
    path: 'M 70,70 L 82,70 L 82,78 L 70,78 Z',
    labelX: 76,
    labelY: 74
  },
  {
    id: 'brazil_east',
    name: 'Brazil East',
    abbreviation: 'BRT',
    timezones: ['America/Sao_Paulo', 'America/Rio_de_Janeiro', 'America/Belem'],
    path: 'M 75,85 L 90,85 L 90,100 L 75,100 Z',
    labelX: 82,
    labelY: 92
  },
  {
    id: 'brazil_west',
    name: 'Brazil West',
    abbreviation: 'AMT',
    timezones: ['America/Manaus', 'America/Campo_Grande'],
    path: 'M 65,85 L 75,85 L 75,100 L 65,100 Z',
    labelX: 70,
    labelY: 92
  },
  {
    id: 'argentina',
    name: 'Argentina',
    abbreviation: 'ART',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza'],
    path: 'M 70,100 L 80,105 L 70,110 Z',
    labelX: 75,
    labelY: 104
  },
  {
    id: 'chile',
    name: 'Chile',
    abbreviation: 'CLT',
    timezones: ['America/Santiago', 'America/Punta_Arenas'],
    path: 'M 65,100 L 70,100 L 70,110 L 65,110 Z',
    labelX: 67,
    labelY: 105
  },
  {
    id: 'andes',
    name: 'Andes',
    abbreviation: 'PET',
    timezones: ['America/Lima', 'America/Bogota', 'America/La_Paz'],
    path: 'M 55,85 L 65,85 L 65,100 L 55,100 Z',
    labelX: 60,
    labelY: 92
  },

  // Europe
  {
    id: 'western_europe',
    name: 'Western Europe',
    abbreviation: 'GMT/BST',
    timezones: ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'],
    path: 'M 95,54 L 105,54 L 105,64 L 95,64 Z',
    labelX: 100,
    labelY: 59
  },
  {
    id: 'central_europe',
    name: 'Central Europe',
    abbreviation: 'CET/CEST',
    timezones: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
    path: 'M 105,54 L 115,54 L 115,64 L 105,64 Z',
    labelX: 110,
    labelY: 59
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe',
    abbreviation: 'EET/EEST',
    timezones: ['Europe/Helsinki', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Sofia'],
    path: 'M 115,54 L 125,54 L 125,64 L 115,64 Z',
    labelX: 120,
    labelY: 59
  },
  {
    id: 'russia_west',
    name: 'Russia West',
    abbreviation: 'MSK',
    timezones: ['Europe/Moscow', 'Europe/Kaliningrad'],
    path: 'M 125,45 L 140,45 L 140,60 L 125,60 Z',
    labelX: 132,
    labelY: 52
  },
  
  // Africa
  {
    id: 'north_africa',
    name: 'North Africa',
    abbreviation: 'CET/EET',
    timezones: ['Africa/Cairo', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca'],
    path: 'M 100,64 L 115,64 L 115,74 L 100,74 Z',
    labelX: 107,
    labelY: 69
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    abbreviation: 'WAT',
    timezones: ['Africa/Lagos', 'Africa/Accra', 'Africa/Dakar'],
    path: 'M 90,74 L 100,74 L 100,84 L 90,84 Z',
    labelX: 95,
    labelY: 79
  },
  {
    id: 'central_africa',
    name: 'Central Africa',
    abbreviation: 'CAT',
    timezones: ['Africa/Kinshasa', 'Africa/Khartoum', 'Africa/Bangui'],
    path: 'M 100,74 L 110,74 L 110,84 L 100,84 Z',
    labelX: 105,
    labelY: 79
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    abbreviation: 'EAT',
    timezones: ['Africa/Nairobi', 'Africa/Addis_Ababa', 'Africa/Kampala'],
    path: 'M 110,74 L 120,74 L 120,84 L 110,84 Z',
    labelX: 115,
    labelY: 79
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    abbreviation: 'SAST',
    timezones: ['Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo'],
    path: 'M 105,84 L 115,84 L 115,94 L 105,94 Z',
    labelX: 110,
    labelY: 89
  },
  
  // Middle East & Central Asia
  {
    id: 'middle_east',
    name: 'Middle East',
    abbreviation: 'AST/GST',
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Jerusalem', 'Asia/Tehran'],
    path: 'M 125,60 L 140,60 L 140,74 L 125,74 Z',
    labelX: 132,
    labelY: 67
  },
  {
    id: 'central_asia',
    name: 'Central Asia',
    abbreviation: 'ALMT',
    timezones: ['Asia/Tashkent', 'Asia/Almaty', 'Asia/Yekaterinburg'],
    path: 'M 140,50 L 155,50 L 155,65 L 140,65 Z',
    labelX: 147,
    labelY: 57
  },
  
  // South Asia
  {
    id: 'india',
    name: 'India',
    abbreviation: 'IST',
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka'],
    path: 'M 145,65 L 160,65 L 160,77 L 145,77 Z',
    labelX: 152,
    labelY: 71
  },
  
  // East Asia
  {
    id: 'se_asia',
    name: 'Southeast Asia',
    abbreviation: 'ICT/WIB',
    timezones: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur'],
    path: 'M 160,65 L 172,65 L 172,82 L 160,82 Z',
    labelX: 166,
    labelY: 74
  },
  {
    id: 'china',
    name: 'China',
    abbreviation: 'CST',
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
    path: 'M 160,50 L 180,50 L 180,65 L 160,65 Z',
    labelX: 170,
    labelY: 57
  },
  {
    id: 'japan_korea',
    name: 'Japan & Korea',
    abbreviation: 'JST/KST',
    timezones: ['Asia/Tokyo', 'Asia/Seoul'],
    path: 'M 180,50 L 190,50 L 190,65 L 180,65 Z',
    labelX: 185,
    labelY: 57
  },
  
  // Oceania
  {
    id: 'australia_west',
    name: 'Australia West',
    abbreviation: 'AWST',
    timezones: ['Australia/Perth'],
    path: 'M 160,82 L 170,82 L 170,95 L 160,95 Z',
    labelX: 165,
    labelY: 88
  },
  {
    id: 'australia_central',
    name: 'Australia Central',
    abbreviation: 'ACST',
    timezones: ['Australia/Adelaide', 'Australia/Darwin'],
    path: 'M 170,82 L 180,82 L 180,95 L 170,95 Z',
    labelX: 175,
    labelY: 88
  },
  {
    id: 'australia_east',
    name: 'Australia East',
    abbreviation: 'AEST',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    path: 'M 180,82 L 190,82 L 190,95 L 180,95 Z',
    labelX: 185,
    labelY: 88
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    abbreviation: 'NZST',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    path: 'M 195,90 L 205,90 L 205,98 L 195,98 Z',
    labelX: 200,
    labelY: 94
  }
];

// Helper function to determine if daylight savings time is in effect
const isDaylightTime = (timeZone) => {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  
  try {
    const janOffset = new Date(jan).toLocaleString('en-US', { timeZone, timeZoneName: 'short' });
    const julOffset = new Date(jul).toLocaleString('en-US', { timeZone, timeZoneName: 'short' });
    
    // If January and July offsets are different, and we're in the summer, it's DST
    const isDst = janOffset !== julOffset && now.getMonth() > 2 && now.getMonth() < 10;
    return isDst;
  } catch (e) {
    return false; // Default if we can't determine
  }
};

// Helper to get time offset from GMT (e.g., GMT+8)
const getOffsetString = (timeZone) => {
  try {
    const now = new Date();
    const utcOffsetMinutes = new Date().getTimezoneOffset();
    const tzOffsetMinutes = new Date().toLocaleString('en-US', { timeZone, timeZoneName: 'short' }).getTimezoneOffset();
    const diffMinutes = tzOffsetMinutes - utcOffsetMinutes;
    
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    const sign = diffMinutes >= 0 ? '+' : '-';
    
    return `GMT${sign}${hours}`;
  } catch (e) {
    return ''; // Default empty if we can't determine
  }
};

function WorldTimezoneMap({ onRegionSelect, selectedTimezone }) {
  const [hoveredRegion, setHoveredRegion] = useState(null);

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
  
  // Get abbreviation with daylight indication (e.g., PST or PDT)
  const getAbbreviationWithDaylight = (region) => {
    if (!region) return '';
    
    // If abbreviation has a DST version (like PST/PDT)
    if (region.abbreviation.includes('/')) {
      const [standard, daylight] = region.abbreviation.split('/');
      // Check if daylight time is in effect for the first timezone
      const isDst = isDaylightTime(region.timezones[0]);
      return isDst ? daylight : standard;
    }
    
    return region.abbreviation;
  };
  
  return (
    <div className="world-timezone-map">
      <svg viewBox="0 0 220 120" width="100%" height="450">
        {/* World map background */}
        <rect x="0" y="0" width="220" height="120" fill="#f9f9f9" />
        
        {/* Ocean background */}
        <rect x="15" y="40" width="195" height="70" fill="#e6f2ff" rx="2" ry="2" />
        
        {/* Map outline for reference */}
        <path
          d="M 15,40 L 210,40 L 210,110 L 15,110 Z"
          fill="none"
          stroke="#ccc"
          strokeWidth="0.2"
          strokeDasharray="1,1"
        />
        
        {/* Draw all regions */}
        {TIMEZONE_REGIONS.map(region => (
          <g 
            key={region.id} 
            onClick={() => handleRegionClick(region)}
            onMouseEnter={() => setHoveredRegion(region)}
            onMouseLeave={() => setHoveredRegion(null)}
          >
            <path
              d={region.path}
              fill={getSelectedRegion() === region.id ? '#90caf9' : hoveredRegion?.id === region.id ? '#b3d9ff' : '#d0e8ff'}
              stroke="#ffffff"
              strokeWidth={hoveredRegion?.id === region.id ? '1' : '0.5'}
              className="timezone-region"
            />
            
            {/* Add abbreviations to all regions */}
            <text 
              x={region.labelX} 
              y={region.labelY} 
              className="map-label" 
              fontSize="4.5" 
              textAnchor="middle"
              fill={getSelectedRegion() === region.id ? '#1976d2' : '#666'}
              fontWeight={getSelectedRegion() === region.id ? 'bold' : 'normal'}
              stroke="white"
              strokeWidth="0.3"
              paintOrder="stroke"
            >
              {getAbbreviationWithDaylight(region)}
            </text>
            
            <title>{region.name}: {region.abbreviation} - {region.timezones.join(', ')}</title>
          </g>
        ))}
        
        {/* Add equator line */}
        <line x1="15" y1="75" x2="210" y2="75" stroke="#ccc" strokeWidth="0.3" strokeDasharray="1,1" />
        
        {/* Compass indicator */}
        <g transform="translate(25, 50)" fontSize="3">
          <circle cx="0" cy="0" r="3" fill="white" stroke="#ccc" strokeWidth="0.2" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">N</text>
        </g>
        
        {/* Hover info panel */}
        {hoveredRegion && (
          <g transform="translate(110, 20)">
            <rect x="-45" y="-12" width="90" height="24" rx="2" ry="2" fill="white" opacity="0.9" stroke="#ccc" strokeWidth="0.5" />
            <text x="0" y="-5" textAnchor="middle" fontSize="4" fontWeight="bold">{hoveredRegion.name}</text>
            <text x="0" y="2" textAnchor="middle" fontSize="3.5">{hoveredRegion.abbreviation}</text>
            <text x="0" y="8" textAnchor="middle" fontSize="3">{hoveredRegion.timezones[0]}</text>
          </g>
        )}
      </svg>
      
      <div className="timezone-region-legend">
        <p className="legend-title">Click a region to select its timezone</p>
      </div>
    </div>
  );
}

export default WorldTimezoneMap;