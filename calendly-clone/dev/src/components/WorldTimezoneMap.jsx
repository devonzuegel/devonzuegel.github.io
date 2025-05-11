import React, { useState, useEffect } from 'react';

// More comprehensive timezone data with abbreviations and wider regions
const TIMEZONE_REGIONS = [
  // North America
  {
    id: 'pacific',
    name: 'Pacific Time',
    abbreviation: 'PT',
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M 45,47 L 48,45 L 51,46 L 52,49 L 52,55 L 51,60 L 49,65 L 46,68 L 41,68 L 39,65 L 39,60 L 40,54 L 42,50 L 45,47',
    labelX: 45,
    labelY: 61
  },
  {
    id: 'mountain',
    name: 'Mountain Time',
    abbreviation: 'MT',
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M 51,46 L 55,45 L 58,46 L 59,49 L 60,55 L 60,62 L 60,68 L 55,68 L 51,68 L 46,68 L 49,65 L 51,60 L 52,55 L 52,49 L 51,46',
    labelX: 55,
    labelY: 61
  },
  {
    id: 'central',
    name: 'Central Time',
    abbreviation: 'CT',
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M 58,46 L 63,45 L 67,47 L 69,51 L 70,57 L 70,62 L 70,68 L 65,68 L 60,68 L 60,62 L 60,55 L 59,49 L 58,46',
    labelX: 65,
    labelY: 59
  },
  {
    id: 'eastern',
    name: 'Eastern Time',
    abbreviation: 'ET',
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M 67,47 L 71,45 L 74,46 L 77,49 L 78,54 L 79,59 L 80,65 L 80,68 L 75,68 L 70,68 L 70,62 L 70,57 L 69,51 L 67,47',
    labelX: 75,
    labelY: 59
  },
  {
    id: 'atlantic',
    name: 'Atlantic Time',
    abbreviation: 'AT',
    timezones: ['America/Halifax', 'America/Puerto_Rico', 'America/Caracas'],
    path: 'M 74,46 L 79,45 L 84,47 L 86,50 L 88,56 L 90,62 L 90,68 L 85,68 L 80,68 L 80,65 L 79,59 L 78,54 L 77,49 L 74,46',
    labelX: 85,
    labelY: 59
  },
  {
    id: 'alaska',
    name: 'Alaska',
    abbreviation: 'AKT',
    timezones: ['America/Anchorage'],
    path: 'M 30,50 L 33,48 L 36,48 L 39,50 L 40,54 L 39,58 L 37,60 L 34,62 L 32,61 L 30,58 L 30,54 L 30,50',
    labelX: 35,
    labelY: 56
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HST',
    timezones: ['Pacific/Honolulu'],
    path: 'M 20,68 L 22,66 L 25,65 L 28,66 L 30,68 L 31,71 L 28,74 L 24,74 L 20,73 L 20,70 L 20,68',
    labelX: 25,
    labelY: 70
  },

  // Central and South America
  {
    id: 'mexico',
    name: 'Mexico',
    abbreviation: 'CST/MST',
    timezones: ['America/Mexico_City', 'America/Chihuahua', 'America/Cancun'],
    path: 'M 52,68 L 55,68 L 58,69 L 60,70 L 63,71 L 62,73 L 60,75 L 58,76 L 55,78 L 52,77 L 50,76 L 49,73 L 50,70 L 52,68',
    labelX: 56,
    labelY: 73
  },
  {
    id: 'central_america',
    name: 'Central America',
    abbreviation: 'CST',
    timezones: ['America/Guatemala', 'America/Panama', 'America/Costa_Rica'],
    path: 'M 60,75 L 62,73 L 65,74 L 68,76 L 70,79 L 70,82 L 68,84 L 65,85 L 62,84 L 60,82 L 59,79 L 60,75',
    labelX: 65,
    labelY: 80
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
    abbreviation: 'EST/AST',
    timezones: ['America/Havana', 'America/Santo_Domingo', 'America/Port_of_Spain'],
    path: 'M 67,70 L 72,69 L 76,70 L 80,71 L 83,73 L 81,75 L 78,76 L 74,77 L 70,76 L 68,74 L 67,72 L 67,70',
    labelX: 74,
    labelY: 73
  },
  {
    id: 'brazil_east',
    name: 'Brazil East',
    abbreviation: 'BRT',
    timezones: ['America/Sao_Paulo', 'America/Rio_de_Janeiro', 'America/Belem'],
    path: 'M 76,85 L 80,84 L 85,85 L 89,88 L 90,92 L 89,95 L 86,98 L 82,100 L 77,97 L 76,93 L 75,89 L 76,85',
    labelX: 82,
    labelY: 92
  },
  {
    id: 'brazil_west',
    name: 'Brazil West',
    abbreviation: 'AMT',
    timezones: ['America/Manaus', 'America/Campo_Grande'],
    path: 'M 66,85 L 70,84 L 74,85 L 76,85 L 75,89 L 76,93 L 77,97 L 74,98 L 70,97 L 67,95 L 65,92 L 65,88 L 66,85',
    labelX: 70,
    labelY: 92
  },
  {
    id: 'argentina',
    name: 'Argentina',
    abbreviation: 'ART',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza'],
    path: 'M 73,98 L 77,97 L 82,100 L 80,103 L 77,106 L 73,108 L 70,110 L 68,108 L 69,105 L 70,102 L 72,100 L 73,98',
    labelX: 75,
    labelY: 104
  },
  {
    id: 'chile',
    name: 'Chile',
    abbreviation: 'CLT',
    timezones: ['America/Santiago', 'America/Punta_Arenas'],
    path: 'M 65,98 L 67,95 L 70,97 L 73,98 L 72,100 L 70,102 L 69,105 L 68,108 L 70,110 L 67,112 L 64,111 L 63,108 L 64,104 L 65,100 L 65,98',
    labelX: 67,
    labelY: 105
  },
  {
    id: 'andes',
    name: 'Andes',
    abbreviation: 'PET',
    timezones: ['America/Lima', 'America/Bogota', 'America/La_Paz'],
    path: 'M 55,85 L 58,83 L 62,84 L 65,85 L 65,88 L 65,92 L 65,98 L 65,100 L 64,104 L 63,108 L 60,104 L 58,100 L 56,94 L 55,90 L 55,85',
    labelX: 60,
    labelY: 95
  },

  // Europe
  {
    id: 'western_europe',
    name: 'Western Europe',
    abbreviation: 'GMT/BST',
    timezones: ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'],
    path: 'M 95,50 L 98,48 L 101,47 L 104,48 L 105,51 L 106,54 L 105,57 L 103,60 L 100,62 L 96,63 L 93,60 L 92,57 L 93,53 L 95,50',
    labelX: 99,
    labelY: 55
  },
  {
    id: 'central_europe',
    name: 'Central Europe',
    abbreviation: 'CET/CEST',
    timezones: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
    path: 'M 104,48 L 107,47 L 110,47 L 113,48 L 115,51 L 115,54 L 114,57 L 112,60 L 109,62 L 106,63 L 103,60 L 105,57 L 106,54 L 105,51 L 104,48',
    labelX: 110,
    labelY: 55
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe',
    abbreviation: 'EET/EEST',
    timezones: ['Europe/Helsinki', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Sofia'],
    path: 'M 113,48 L 116,47 L 119,47 L 122,49 L 123,52 L 123,56 L 122,59 L 120,62 L 116,63 L 112,60 L 114,57 L 115,54 L 115,51 L 113,48',
    labelX: 120,
    labelY: 55
  },
  {
    id: 'russia_west',
    name: 'Russia West',
    abbreviation: 'MSK',
    timezones: ['Europe/Moscow', 'Europe/Kaliningrad'],
    path: 'M 122,49 L 125,43 L 130,41 L 135,40 L 139,43 L 140,48 L 138,52 L 136,56 L 133,59 L 128,60 L 123,56 L 123,52 L 122,49',
    labelX: 132,
    labelY: 50
  },

  // Africa
  {
    id: 'north_africa',
    name: 'North Africa',
    abbreviation: 'CET/EET',
    timezones: ['Africa/Cairo', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca'],
    path: 'M 96,63 L 100,62 L 106,63 L 109,62 L 116,63 L 120,64 L 122,67 L 120,70 L 118,72 L 112,74 L 105,74 L 100,73 L 97,71 L 95,68 L 96,63',
    labelX: 109,
    labelY: 68
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    abbreviation: 'WAT',
    timezones: ['Africa/Lagos', 'Africa/Accra', 'Africa/Dakar'],
    path: 'M 90,70 L 93,68 L 95,68 L 97,71 L 100,73 L 101,76 L 101,79 L 98,82 L 95,84 L 92,82 L 90,78 L 89,73 L 90,70',
    labelX: 95,
    labelY: 76
  },
  {
    id: 'central_africa',
    name: 'Central Africa',
    abbreviation: 'CAT',
    timezones: ['Africa/Kinshasa', 'Africa/Khartoum', 'Africa/Bangui'],
    path: 'M 100,73 L 105,74 L 112,74 L 111,77 L 110,80 L 106,82 L 101,83 L 98,82 L 101,79 L 101,76 L 100,73',
    labelX: 105,
    labelY: 79
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    abbreviation: 'EAT',
    timezones: ['Africa/Nairobi', 'Africa/Addis_Ababa', 'Africa/Kampala'],
    path: 'M 112,74 L 118,72 L 120,70 L 122,72 L 121,75 L 120,78 L 118,81 L 116,83 L 112,82 L 110,80 L 111,77 L 112,74',
    labelX: 117,
    labelY: 78
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    abbreviation: 'SAST',
    timezones: ['Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo'],
    path: 'M 101,83 L 106,82 L 110,82 L 112,82 L 116,83 L 115,87 L 114,90 L 111,93 L 107,93 L 103,92 L 100,88 L 100,85 L 101,83',
    labelX: 108,
    labelY: 87
  },

  // Middle East & Central Asia
  {
    id: 'middle_east',
    name: 'Middle East',
    abbreviation: 'AST/GST',
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Jerusalem', 'Asia/Tehran'],
    path: 'M 120,64 L 122,62 L 125,60 L 130,60 L 134,60 L 137,63 L 139,67 L 139,70 L 136,73 L 132,74 L 127,73 L 123,70 L 122,67 L 120,64',
    labelX: 129,
    labelY: 67
  },
  {
    id: 'central_asia',
    name: 'Central Asia',
    abbreviation: 'ALMT',
    timezones: ['Asia/Tashkent', 'Asia/Almaty', 'Asia/Yekaterinburg'],
    path: 'M 139,43 L 142,42 L 146,42 L 150,44 L 154,45 L 157,48 L 157,53 L 156,57 L 153,60 L 148,61 L 142,60 L 139,57 L 138,52 L 140,48 L 139,43',
    labelX: 147,
    labelY: 52
  },

  // South Asia
  {
    id: 'india',
    name: 'India',
    abbreviation: 'IST',
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka'],
    path: 'M 137,63 L 142,60 L 148,61 L 153,63 L 156,66 L 157,70 L 154,73 L 150,75 L 145,75 L 139,74 L 136,73 L 139,70 L 139,67 L 137,63',
    labelX: 147,
    labelY: 67
  },

  // East Asia
  {
    id: 'se_asia',
    name: 'Southeast Asia',
    abbreviation: 'ICT/WIB',
    timezones: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur'],
    path: 'M 150,75 L 154,73 L 158,73 L 162,74 L 165,76 L 169,76 L 169,79 L 167,82 L 162,83 L 157,83 L 154,81 L 150,78 L 150,75',
    labelX: 160,
    labelY: 79
  },
  {
    id: 'china',
    name: 'China',
    abbreviation: 'CST',
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
    path: 'M 153,60 L 156,57 L 157,53 L 157,48 L 160,45 L 165,43 L 171,43 L 176,45 L 180,48 L 180,53 L 179,58 L 176,62 L 171,65 L 165,65 L 160,63 L 156,66 L 153,63 L 153,60',
    labelX: 168,
    labelY: 53
  },
  {
    id: 'japan_korea',
    name: 'Japan & Korea',
    abbreviation: 'JST/KST',
    timezones: ['Asia/Tokyo', 'Asia/Seoul'],
    path: 'M 179,58 L 180,53 L 180,48 L 183,45 L 187,45 L 190,49 L 190,53 L 189,58 L 185,60 L 180,60 L 179,58',
    labelX: 185,
    labelY: 52
  },

  // Oceania
  {
    id: 'australia_west',
    name: 'Australia West',
    abbreviation: 'AWST',
    timezones: ['Australia/Perth'],
    path: 'M 157,83 L 162,83 L 165,85 L 166,88 L 166,91 L 164,94 L 161,94 L 158,93 L 156,89 L 156,86 L 157,83',
    labelX: 161,
    labelY: 89
  },
  {
    id: 'australia_central',
    name: 'Australia Central',
    abbreviation: 'ACST',
    timezones: ['Australia/Adelaide', 'Australia/Darwin'],
    path: 'M 165,85 L 169,84 L 172,85 L 175,87 L 175,90 L 174,93 L 170,95 L 166,95 L 164,94 L 166,91 L 166,88 L 165,85',
    labelX: 170,
    labelY: 90
  },
  {
    id: 'australia_east',
    name: 'Australia East',
    abbreviation: 'AEST',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    path: 'M 175,87 L 179,85 L 183,86 L 185,88 L 185,92 L 184,95 L 180,96 L 175,95 L 174,93 L 175,90 L 175,87',
    labelX: 180,
    labelY: 91
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    abbreviation: 'NZST',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    path: 'M 195,88 L 198,87 L 200,88 L 202,90 L 204,92 L 203,95 L 200,97 L 197,97 L 194,94 L 193,91 L 195,88',
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
        {/* World map background with gradient for oceans */}
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e1f0ff" />
            <stop offset="50%" stopColor="#e6f2ff" />
            <stop offset="100%" stopColor="#daeeff" />
          </linearGradient>
        </defs>

        {/* Ocean background */}
        <rect x="15" y="35" width="195" height="80" fill="url(#oceanGradient)" rx="2" ry="2" />

        {/* Continental outlines for geographic context */}
        <path
          d="M 40,45 L 60,42 L 80,45 L 90,50 L 105,45 L 125,40 L 140,38 L 155,40 L 170,42 L 180,45 L 190,45 L 185,55 L 180,65 L 170,70 L 160,68 L 155,70 L 155,75 L 150,80 L 155,85 L 165,90 L 170,95 L 175,97 L 182,95
          M 93,50 L 92,57 L 90,65 L 88,70 L 85,75 L 88,78 L 92,82 L 100,88 L 110,93 L 115,95
          M 123,56 L 128,58 L 135,55 L 142,57 L 148,61 L 150,65 L 150,70 L 150,75
          M 48,45 L 50,55 L 50,65 L 55,75 L 60,85 L 65,95 L 70,102 L 70,110"
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
        
        {/* Hover info panel with enhanced styling */}
        {hoveredRegion && (
          <g transform="translate(110, 45)">
            <rect x="-50" y="-12" width="100" height="28" rx="4" ry="4" fill="white" opacity="0.97" stroke="#ccc" strokeWidth="0.7" />
            <rect x="-50" y="-12" width="100" height="8" rx="4" ry="4" fill="#f0f7ff" opacity="0.9" />
            <text x="0" y="-5" textAnchor="middle" fontSize="4.2" fontWeight="bold" fill="#2e5b80">{hoveredRegion.name}</text>
            <text x="0" y="2" textAnchor="middle" fontSize="3.8" fontWeight="500">{hoveredRegion.abbreviation}</text>
            <text x="0" y="8" textAnchor="middle" fontSize="3.2">{hoveredRegion.timezones[0]}</text>
            <text x="0" y="13" textAnchor="middle" fontSize="2.7" fill="#367da2" fontWeight="500">Click to select this timezone</text>
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