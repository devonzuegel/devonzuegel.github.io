import React, { useState, useEffect } from 'react';

// More comprehensive timezone data with abbreviations and wider regions
const TIMEZONE_REGIONS = [
  // North America
  {
    id: 'pacific',
    name: 'Pacific Time',
    abbreviation: 'PT',
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M 45,47 L 50,47 L 51,54 L 50,62 L 48,68 L 40,68 L 39,60 L 40,54 L 45,47',
    labelX: 45,
    labelY: 61
  },
  {
    id: 'mountain',
    name: 'Mountain Time',
    abbreviation: 'MT',
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M 50,47 L 56,47 L 58,54 L 60,62 L 60,68 L 50,68 L 48,62 L 50,54 L 50,47',
    labelX: 55,
    labelY: 61
  },
  {
    id: 'central',
    name: 'Central Time',
    abbreviation: 'CT',
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M 56,47 L 63,47 L 67,54 L 70,60 L 70,68 L 60,68 L 60,62 L 58,54 L 56,47',
    labelX: 65,
    labelY: 61
  },
  {
    id: 'eastern',
    name: 'Eastern Time',
    abbreviation: 'ET',
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M 63,47 L 70,47 L 75,54 L 78,62 L 80,68 L 70,68 L 70,60 L 67,54 L 63,47',
    labelX: 75,
    labelY: 61
  },
  {
    id: 'atlantic',
    name: 'Atlantic Time',
    abbreviation: 'AT',
    timezones: ['America/Halifax', 'America/Puerto_Rico', 'America/Caracas'],
    path: 'M 70,47 L 77,47 L 84,54 L 88,60 L 90,68 L 80,68 L 78,62 L 75,54 L 70,47',
    labelX: 85,
    labelY: 61
  },
  {
    id: 'alaska',
    name: 'Alaska',
    abbreviation: 'AKT',
    timezones: ['America/Anchorage'],
    path: 'M 30,50 L 39,50 L 40,54 L 39,60 L 35,62 L 32,61 L 30,56 L 30,50',
    labelX: 35,
    labelY: 56
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HST',
    timezones: ['Pacific/Honolulu'],
    path: 'M 20,68 L 25,66 L 28,68 L 30,72 L 28,74 L 22,74 L 20,72 L 20,68',
    labelX: 25,
    labelY: 71
  },
  
  // Central and South America
  {
    id: 'mexico',
    name: 'Mexico',
    abbreviation: 'CST/MST',
    timezones: ['America/Mexico_City', 'America/Chihuahua', 'America/Cancun'],
    path: 'M 50,68 L 54,68 L 60,70 L 62,72 L 58,76 L 54,78 L 50,76 L 48,72 L 50,68',
    labelX: 56,
    labelY: 74
  },
  {
    id: 'central_america',
    name: 'Central America',
    abbreviation: 'CST',
    timezones: ['America/Guatemala', 'America/Panama', 'America/Costa_Rica'],
    path: 'M 58,76 L 62,76 L 65,78 L 69,80 L 70,84 L 66,85 L 62,83 L 60,80 L 58,76',
    labelX: 65,
    labelY: 80
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
    abbreviation: 'EST/AST',
    timezones: ['America/Havana', 'America/Santo_Domingo', 'America/Port_of_Spain'],
    path: 'M 65,70 L 74,70 L 80,72 L 82,74 L 80,76 L 72,78 L 65,76 L 62,72 L 65,70',
    labelX: 74,
    labelY: 74
  },
  {
    id: 'brazil_east',
    name: 'Brazil East',
    abbreviation: 'BRT',
    timezones: ['America/Sao_Paulo', 'America/Rio_de_Janeiro', 'America/Belem'],
    path: 'M 75,85 L 84,85 L 90,92 L 88,98 L 82,100 L 76,95 L 75,89 L 75,85',
    labelX: 82,
    labelY: 92
  },
  {
    id: 'brazil_west',
    name: 'Brazil West',
    abbreviation: 'AMT',
    timezones: ['America/Manaus', 'America/Campo_Grande'],
    path: 'M 65,85 L 75,85 L 75,89 L 76,95 L 72,98 L 68,96 L 65,90 L 65,85',
    labelX: 70,
    labelY: 92
  },
  {
    id: 'argentina',
    name: 'Argentina',
    abbreviation: 'ART',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza'],
    path: 'M 72,98 L 76,95 L 82,100 L 78,105 L 70,110 L 68,105 L 70,100 L 72,98',
    labelX: 75,
    labelY: 104
  },
  {
    id: 'chile',
    name: 'Chile',
    abbreviation: 'CLT',
    timezones: ['America/Santiago', 'America/Punta_Arenas'],
    path: 'M 65,100 L 70,100 L 68,105 L 70,110 L 65,112 L 63,108 L 65,100',
    labelX: 67,
    labelY: 105
  },
  {
    id: 'andes',
    name: 'Andes',
    abbreviation: 'PET',
    timezones: ['America/Lima', 'America/Bogota', 'America/La_Paz'],
    path: 'M 55,85 L 65,85 L 65,90 L 68,96 L 65,100 L 63,108 L 57,100 L 55,90 L 55,85',
    labelX: 60,
    labelY: 92
  },

  // Europe
  {
    id: 'western_europe',
    name: 'Western Europe',
    abbreviation: 'GMT/BST',
    timezones: ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'],
    path: 'M 95,50 L 100,48 L 105,50 L 106,54 L 104,58 L 102,62 L 98,64 L 94,62 L 93,58 L 95,54 L 95,50',
    labelX: 100,
    labelY: 55
  },
  {
    id: 'central_europe',
    name: 'Central Europe',
    abbreviation: 'CET/CEST',
    timezones: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
    path: 'M 105,50 L 110,48 L 115,50 L 116,54 L 115,60 L 112,64 L 106,63 L 104,58 L 106,54 L 105,50',
    labelX: 110,
    labelY: 55
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe',
    abbreviation: 'EET/EEST',
    timezones: ['Europe/Helsinki', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Sofia'],
    path: 'M 115,50 L 120,48 L 125,50 L 125,56 L 123,62 L 119,64 L 115,60 L 116,54 L 115,50',
    labelX: 120,
    labelY: 55
  },
  {
    id: 'russia_west',
    name: 'Russia West',
    abbreviation: 'MSK',
    timezones: ['Europe/Moscow', 'Europe/Kaliningrad'],
    path: 'M 125,43 L 135,40 L 140,45 L 138,55 L 135,60 L 125,56 L 125,50 L 125,43',
    labelX: 132,
    labelY: 48
  },

  // Africa
  {
    id: 'north_africa',
    name: 'North Africa',
    abbreviation: 'CET/EET',
    timezones: ['Africa/Cairo', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca'],
    path: 'M 98,64 L 105,64 L 112,64 L 119,64 L 122,68 L 118,72 L 112,74 L 102,74 L 98,72 L 96,68 L 98,64',
    labelX: 107,
    labelY: 69
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    abbreviation: 'WAT',
    timezones: ['Africa/Lagos', 'Africa/Accra', 'Africa/Dakar'],
    path: 'M 90,74 L 98,72 L 102,74 L 100,79 L 95,84 L 90,80 L 88,76 L 90,74',
    labelX: 95,
    labelY: 78
  },
  {
    id: 'central_africa',
    name: 'Central Africa',
    abbreviation: 'CAT',
    timezones: ['Africa/Kinshasa', 'Africa/Khartoum', 'Africa/Bangui'],
    path: 'M 102,74 L 112,74 L 110,80 L 108,84 L 100,84 L 100,79 L 102,74',
    labelX: 105,
    labelY: 79
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    abbreviation: 'EAT',
    timezones: ['Africa/Nairobi', 'Africa/Addis_Ababa', 'Africa/Kampala'],
    path: 'M 112,74 L 118,72 L 122,74 L 120,80 L 116,84 L 110,82 L 108,84 L 110,80 L 112,74',
    labelX: 115,
    labelY: 78
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    abbreviation: 'SAST',
    timezones: ['Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo'],
    path: 'M 100,84 L 108,84 L 110,82 L 116,84 L 115,90 L 110,94 L 105,92 L 100,88 L 100,84',
    labelX: 110,
    labelY: 89
  },
  
  // Middle East & Central Asia
  {
    id: 'middle_east',
    name: 'Middle East',
    abbreviation: 'AST/GST',
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Jerusalem', 'Asia/Tehran'],
    path: 'M 122,68 L 125,64 L 135,60 L 138,65 L 140,70 L 136,74 L 127,74 L 122,72 L 122,68',
    labelX: 132,
    labelY: 67
  },
  {
    id: 'central_asia',
    name: 'Central Asia',
    abbreviation: 'ALMT',
    timezones: ['Asia/Tashkent', 'Asia/Almaty', 'Asia/Yekaterinburg'],
    path: 'M 140,45 L 145,42 L 155,45 L 158,55 L 155,60 L 145,63 L 140,60 L 138,55 L 140,45',
    labelX: 147,
    labelY: 52
  },

  // South Asia
  {
    id: 'india',
    name: 'India',
    abbreviation: 'IST',
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka'],
    path: 'M 140,60 L 145,63 L 155,60 L 158,68 L 155,73 L 150,77 L 142,75 L 136,74 L 138,65 L 140,60',
    labelX: 148,
    labelY: 68
  },

  // East Asia
  {
    id: 'se_asia',
    name: 'Southeast Asia',
    abbreviation: 'ICT/WIB',
    timezones: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur'],
    path: 'M 150,77 L 155,73 L 160,75 L 166,73 L 170,76 L 168,80 L 162,82 L 155,83 L 150,80 L 150,77',
    labelX: 160,
    labelY: 79
  },
  {
    id: 'china',
    name: 'China',
    abbreviation: 'CST',
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
    path: 'M 155,45 L 165,42 L 175,45 L 180,50 L 178,60 L 171,65 L 160,65 L 155,60 L 158,55 L 155,45',
    labelX: 168,
    labelY: 53
  },
  {
    id: 'japan_korea',
    name: 'Japan & Korea',
    abbreviation: 'JST/KST',
    timezones: ['Asia/Tokyo', 'Asia/Seoul'],
    path: 'M 178,60 L 180,50 L 182,45 L 188,48 L 190,53 L 187,58 L 182,63 L 178,60',
    labelX: 185,
    labelY: 53
  },

  // Oceania
  {
    id: 'australia_west',
    name: 'Australia West',
    abbreviation: 'AWST',
    timezones: ['Australia/Perth'],
    path: 'M 155,83 L 162,82 L 165,85 L 167,90 L 165,95 L 160,93 L 158,89 L 155,86 L 155,83',
    labelX: 162,
    labelY: 89
  },
  {
    id: 'australia_central',
    name: 'Australia Central',
    abbreviation: 'ACST',
    timezones: ['Australia/Adelaide', 'Australia/Darwin'],
    path: 'M 165,85 L 172,83 L 175,85 L 177,90 L 175,95 L 170,96 L 165,95 L 167,90 L 165,85',
    labelX: 171,
    labelY: 90
  },
  {
    id: 'australia_east',
    name: 'Australia East',
    abbreviation: 'AEST',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    path: 'M 175,85 L 180,83 L 185,87 L 185,92 L 182,95 L 175,95 L 177,90 L 175,85',
    labelX: 180,
    labelY: 90
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    abbreviation: 'NZST',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    path: 'M 195,88 L 198,86 L 203,88 L 205,92 L 202,96 L 198,98 L 195,96 L 193,92 L 195,88',
    labelX: 199,
    labelY: 92
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
      <svg viewBox="15 35 195 80" width="100%" height="450">
        {/* World map background */}
        <rect x="15" y="35" width="195" height="80" fill="#e6f2ff" />

        {/* Ocean background */}
        <rect x="15" y="35" width="195" height="80" fill="#e6f2ff" rx="2" ry="2" />

        {/* Continental outlines for geographic context */}
        <path
          d="M 40,45 L 80,45 L 90,50 L 125,40 L 155,40 L 180,45 L 190,45 L 180,65 L 170,70 L 155,70 L 155,80 L 150,85 L 165,100 L 182,95
          M 95,50 L 90,70 L 85,75 L 90,80 L 115,95
          M 125,60 L 135,55 L 145,60 L 150,75
          M 45,47 L 50,70 L 60,85 L 70,110"
          fill="none"
          stroke="#ddd"
          strokeWidth="0.4"
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
              fontSize="3.8"
              textAnchor="middle"
              fill={getSelectedRegion() === region.id ? '#1976d2' : '#666'}
              fontWeight={getSelectedRegion() === region.id ? 'bold' : 'normal'}
              stroke="white"
              strokeWidth="0.2"
              paintOrder="stroke"
            >
              {getAbbreviationWithDaylight(region)}
            </text>

            <title>{region.name}: {region.abbreviation} - {region.timezones.join(', ')}</title>
          </g>
        ))}

        {/* Add equator line */}
        <line x1="15" y1="75" x2="210" y2="75" stroke="#ccc" strokeWidth="0.4" strokeDasharray="1,1" />

        {/* Prime meridian (0° longitude) line */}
        <line x1="100" y1="35" x2="100" y2="115" stroke="#ccc" strokeWidth="0.3" strokeDasharray="1,2" />

        {/* Compass indicator */}
        <g transform="translate(25, 50)" fontSize="3">
          <circle cx="0" cy="0" r="3" fill="white" stroke="#ccc" strokeWidth="0.2" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle">N</text>
        </g>
        
        {/* Hover info panel */}
        {hoveredRegion && (
          <g transform="translate(110, 45)">
            <rect x="-48" y="-12" width="96" height="28" rx="3" ry="3" fill="white" opacity="0.95" stroke="#ccc" strokeWidth="0.5" />
            <text x="0" y="-5" textAnchor="middle" fontSize="4" fontWeight="bold">{hoveredRegion.name}</text>
            <text x="0" y="2" textAnchor="middle" fontSize="3.5">{hoveredRegion.abbreviation}</text>
            <text x="0" y="8" textAnchor="middle" fontSize="3">{hoveredRegion.timezones[0]}</text>
            <text x="0" y="13" textAnchor="middle" fontSize="2.5" fill="#666">Click to select this timezone</text>
          </g>
        )}
      </svg>
      
      <div className="timezone-region-legend">
        <p className="legend-title">Hover over a region to see details • Click to select timezone</p>
      </div>
    </div>
  );
}

export default WorldTimezoneMap;