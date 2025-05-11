import React, { useState, useEffect } from 'react';

// More comprehensive timezone data with abbreviations and wider regions
const TIMEZONE_REGIONS = [
  // North America
  {
    id: 'pacific',
    name: 'Pacific Time',
    abbreviation: 'PT',
    timezones: ['America/Los_Angeles', 'America/Vancouver', 'America/Tijuana'],
    path: 'M 43,47 L 48,43 L 51,43 L 52,46 L 52,51 L 52,55 L 51,60 L 49,65 L 46,68 L 41,68 L 39,65 L 38,60 L 39,54 L 41,50 L 43,47',
    labelX: 45,
    labelY: 56
  },
  {
    id: 'mountain',
    name: 'Mountain Time',
    abbreviation: 'MT',
    timezones: ['America/Denver', 'America/Edmonton', 'America/Phoenix'],
    path: 'M 51,43 L 55,42 L 58,42 L 59,45 L 60,51 L 60,55 L 60,62 L 60,68 L 55,68 L 51,68 L 46,68 L 49,65 L 51,60 L 52,55 L 52,51 L 52,46 L 51,43',
    labelX: 55,
    labelY: 56
  },
  {
    id: 'central',
    name: 'Central Time',
    abbreviation: 'CT',
    timezones: ['America/Chicago', 'America/Mexico_City', 'America/Winnipeg'],
    path: 'M 58,42 L 63,41 L 67,42 L 69,46 L 70,51 L 70,55 L 70,62 L 70,68 L 65,68 L 60,68 L 60,62 L 60,55 L 60,51 L 59,45 L 58,42',
    labelX: 65,
    labelY: 56
  },
  {
    id: 'eastern',
    name: 'Eastern Time',
    abbreviation: 'ET',
    timezones: ['America/New_York', 'America/Toronto', 'America/Indiana/Indianapolis'],
    path: 'M 67,42 L 71,40 L 74,41 L 76,45 L 77,51 L 78,55 L 79,59 L 80,65 L 80,68 L 75,68 L 70,68 L 70,62 L 70,55 L 70,51 L 69,46 L 67,42',
    labelX: 75,
    labelY: 56
  },
  {
    id: 'atlantic',
    name: 'Atlantic Time',
    abbreviation: 'AT',
    timezones: ['America/Halifax', 'America/Puerto_Rico', 'America/Caracas'],
    path: 'M 74,41 L 79,40 L 84,41 L 87,46 L 88,52 L 89,56 L 90,62 L 90,68 L 85,68 L 80,68 L 80,65 L 79,59 L 78,55 L 77,51 L 76,45 L 74,41',
    labelX: 84,
    labelY: 56
  },
  {
    id: 'alaska',
    name: 'Alaska',
    abbreviation: 'AKT',
    timezones: ['America/Anchorage'],
    path: 'M 25,42 L 28,40 L 32,42 L 35,45 L 37,47 L 39,50 L 40,54 L 39,58 L 38,60 L 36,62 L 33,63 L 30,62 L 27,60 L 25,57 L 24,52 L 25,47 L 25,42',
    labelX: 32,
    labelY: 52
  },
  {
    id: 'hawaii',
    name: 'Hawaii',
    abbreviation: 'HST',
    timezones: ['Pacific/Honolulu'],
    path: 'M 20,68 L 22,65 L 24,64 L 26,65 L 28,66 L 30,68 L 31,71 L 30,73 L 28,74 L 24,74 L 21,73 L 20,71 L 20,68',
    labelX: 25,
    labelY: 70
  },

  // Central and South America
  {
    id: 'mexico',
    name: 'Mexico',
    abbreviation: 'CST/MST',
    timezones: ['America/Mexico_City', 'America/Chihuahua', 'America/Cancun'],
    path: 'M 50,68 L 55,68 L 60,68 L 61,70 L 62,72 L 62,74 L 60,75 L 57,76 L 54,77 L 51,77 L 49,76 L 48,73 L 49,70 L 50,68',
    labelX: 55,
    labelY: 73
  },
  {
    id: 'central_america',
    name: 'Central America',
    abbreviation: 'CST',
    timezones: ['America/Guatemala', 'America/Panama', 'America/Costa_Rica'],
    path: 'M 60,75 L 62,74 L 64,74 L 67,75 L 69,77 L 70,80 L 68,82 L 66,84 L 63,84 L 61,83 L 60,79 L 60,75',
    labelX: 65,
    labelY: 79
  },
  {
    id: 'caribbean',
    name: 'Caribbean',
    abbreviation: 'EST/AST',
    timezones: ['America/Havana', 'America/Santo_Domingo', 'America/Port_of_Spain'],
    path: 'M 67,70 L 70,69 L 75,70 L 80,71 L 83,73 L 82,75 L 78,76 L 74,77 L 71,77 L 69,75 L 67,72 L 67,70',
    labelX: 75,
    labelY: 73
  },
  {
    id: 'brazil_east',
    name: 'Brazil East',
    abbreviation: 'BRT',
    timezones: ['America/Sao_Paulo', 'America/Rio_de_Janeiro', 'America/Belem'],
    path: 'M 77,85 L 80,83 L 85,83 L 89,86 L 91,90 L 90,94 L 87,97 L 83,99 L 79,98 L 77,96 L 76,92 L 75,88 L 77,85',
    labelX: 84,
    labelY: 91
  },
  {
    id: 'brazil_west',
    name: 'Brazil West',
    abbreviation: 'AMT',
    timezones: ['America/Manaus', 'America/Campo_Grande'],
    path: 'M 67,85 L 70,83 L 74,84 L 77,85 L 75,88 L 76,92 L 77,96 L 74,97 L 71,96 L 68,94 L 66,91 L 66,88 L 67,85',
    labelX: 71,
    labelY: 90
  },
  {
    id: 'argentina',
    name: 'Argentina',
    abbreviation: 'ART',
    timezones: ['America/Argentina/Buenos_Aires', 'America/Argentina/Cordoba', 'America/Argentina/Mendoza'],
    path: 'M 72,98 L 75,97 L 79,98 L 81,100 L 80,104 L 77,107 L 73,109 L 70,110 L 69,107 L 70,103 L 71,100 L 72,98',
    labelX: 76,
    labelY: 104
  },
  {
    id: 'chile',
    name: 'Chile',
    abbreviation: 'CLT',
    timezones: ['America/Santiago', 'America/Punta_Arenas'],
    path: 'M 64,95 L 66,92 L 68,94 L 71,96 L 74,97 L 72,98 L 71,100 L 70,103 L 69,107 L 70,110 L 68,113 L 66,112 L 64,110 L 63,106 L 63,100 L 64,95',
    labelX: 67,
    labelY: 104
  },
  {
    id: 'andes',
    name: 'Andes',
    abbreviation: 'PET',
    timezones: ['America/Lima', 'America/Bogota', 'America/La_Paz'],
    path: 'M 57,82 L 60,80 L 63,84 L 66,84 L 67,85 L 66,88 L 66,91 L 66,92 L 64,95 L 63,100 L 63,106 L 62,108 L 59,105 L 57,101 L 56,96 L 56,90 L 57,86 L 57,82',
    labelX: 62,
    labelY: 95
  },

  // Europe
  {
    id: 'western_europe',
    name: 'Western Europe',
    abbreviation: 'GMT/BST',
    timezones: ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin'],
    path: 'M 93,48 L 96,46 L 99,45 L 102,46 L 104,49 L 105,52 L 105,55 L 103,58 L 100,60 L 97,61 L 94,59 L 93,56 L 92,53 L 93,48',
    labelX: 99,
    labelY: 53
  },
  {
    id: 'central_europe',
    name: 'Central Europe',
    abbreviation: 'CET/CEST',
    timezones: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
    path: 'M 102,46 L 106,45 L 110,45 L 113,47 L 114,50 L 114,53 L 113,56 L 111,59 L 108,60 L 105,60 L 103,58 L 105,55 L 105,52 L 104,49 L 102,46',
    labelX: 108,
    labelY: 53
  },
  {
    id: 'eastern_europe',
    name: 'Eastern Europe',
    abbreviation: 'EET/EEST',
    timezones: ['Europe/Helsinki', 'Europe/Bucharest', 'Europe/Athens', 'Europe/Sofia'],
    path: 'M 113,47 L 117,45 L 121,46 L 123,49 L 124,52 L 124,56 L 122,59 L 119,61 L 115,61 L 111,59 L 113,56 L 114,53 L 114,50 L 113,47',
    labelX: 118,
    labelY: 53
  },
  {
    id: 'russia_west',
    name: 'Russia West',
    abbreviation: 'MSK',
    timezones: ['Europe/Moscow', 'Europe/Kaliningrad'],
    path: 'M 123,45 L 126,41 L 130,39 L 135,38 L 139,40 L 141,43 L 140,48 L 138,52 L 135,55 L 131,58 L 126,58 L 124,56 L 124,52 L 123,49 L 123,45',
    labelX: 132,
    labelY: 49
  },

  // Africa
  {
    id: 'north_africa',
    name: 'North Africa',
    abbreviation: 'CET/EET',
    timezones: ['Africa/Cairo', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca'],
    path: 'M 94,59 L 97,61 L 100,61 L 105,61 L 108,61 L 113,62 L 119,62 L 123,64 L 121,68 L 117,71 L 112,73 L 107,73 L 102,72 L 97,71 L 94,68 L 93,64 L 94,59',
    labelX: 107,
    labelY: 67
  },
  {
    id: 'west_africa',
    name: 'West Africa',
    abbreviation: 'WAT',
    timezones: ['Africa/Lagos', 'Africa/Accra', 'Africa/Dakar'],
    path: 'M 88,69 L 91,67 L 94,68 L 97,71 L 102,72 L 101,75 L 100,78 L 98,81 L 94,84 L 91,82 L 89,78 L 88,74 L 88,69',
    labelX: 95,
    labelY: 76
  },
  {
    id: 'central_africa',
    name: 'Central Africa',
    abbreviation: 'CAT',
    timezones: ['Africa/Kinshasa', 'Africa/Khartoum', 'Africa/Bangui'],
    path: 'M 102,72 L 107,73 L 112,73 L 111,76 L 109,79 L 105,82 L 100,82 L 97,81 L 98,78 L 100,75 L 102,72',
    labelX: 106,
    labelY: 77
  },
  {
    id: 'east_africa',
    name: 'East Africa',
    abbreviation: 'EAT',
    timezones: ['Africa/Nairobi', 'Africa/Addis_Ababa', 'Africa/Kampala'],
    path: 'M 112,73 L 117,71 L 120,69 L 123,70 L 124,74 L 123,79 L 118,81 L 113,81 L 109,79 L 111,76 L 112,73',
    labelX: 117,
    labelY: 76
  },
  {
    id: 'south_africa',
    name: 'South Africa',
    abbreviation: 'SAST',
    timezones: ['Africa/Johannesburg', 'Africa/Harare', 'Africa/Maputo'],
    path: 'M 101,82 L 105,82 L 109,82 L 113,83 L 114,86 L 113,90 L 110,93 L 106,92 L 102,91 L 99,88 L 100,84 L 101,82',
    labelX: 107,
    labelY: 87
  },

  // Middle East & Central Asia
  {
    id: 'middle_east',
    name: 'Middle East',
    abbreviation: 'AST/GST',
    timezones: ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Baghdad', 'Asia/Jerusalem', 'Asia/Tehran'],
    path: 'M 120,61 L 123,59 L 127,58 L 130,59 L 133,60 L 136,62 L 138,66 L 138,70 L 135,73 L 131,73 L 127,72 L 123,69 L 120,67 L 120,61',
    labelX: 129,
    labelY: 66
  },
  {
    id: 'central_asia',
    name: 'Central Asia',
    abbreviation: 'ALMT',
    timezones: ['Asia/Tashkent', 'Asia/Almaty', 'Asia/Yekaterinburg'],
    path: 'M 135,38 L 139,37 L 144,39 L 148,41 L 152,43 L 155,47 L 155,52 L 154,56 L 151,59 L 147,60 L 142,59 L 138,56 L 137,51 L 138,44 L 135,38',
    labelX: 147,
    labelY: 49
  },

  // South Asia
  {
    id: 'india',
    name: 'India',
    abbreviation: 'IST',
    timezones: ['Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka'],
    path: 'M 138,56 L 142,59 L 147,60 L 151,61 L 154,64 L 155,69 L 152,73 L 148,75 L 143,74 L 138,72 L 135,73 L 138,70 L 138,66 L 136,62 L 136,59 L 138,56',
    labelX: 146,
    labelY: 67
  },

  // East Asia
  {
    id: 'se_asia',
    name: 'Southeast Asia',
    abbreviation: 'ICT/WIB',
    timezones: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur'],
    path: 'M 148,75 L 152,73 L 156,73 L 159,74 L 162,76 L 165,77 L 167,79 L 166,82 L 162,83 L 157,83 L 153,81 L 149,78 L 148,75',
    labelX: 158,
    labelY: 78
  },
  {
    id: 'china',
    name: 'China',
    abbreviation: 'CST',
    timezones: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'],
    path: 'M 151,59 L 154,56 L 155,52 L 155,47 L 159,45 L 164,43 L 169,43 L 174,45 L 177,48 L 177,52 L 176,57 L 172,61 L 168,63 L 163,62 L 159,61 L 155,62 L 154,64 L 151,61 L 151,59',
    labelX: 163,
    labelY: 53
  },
  {
    id: 'japan_korea',
    name: 'Japan & Korea',
    abbreviation: 'JST/KST',
    timezones: ['Asia/Tokyo', 'Asia/Seoul'],
    path: 'M 176,45 L 180,43 L 184,44 L 188,46 L 189,49 L 188,52 L 186,55 L 183,57 L 179,56 L 176,57 L 177,52 L 177,48 L 176,45',
    labelX: 183,
    labelY: 49
  },

  // Oceania
  {
    id: 'australia_west',
    name: 'Australia West',
    abbreviation: 'AWST',
    timezones: ['Australia/Perth'],
    path: 'M 154,86 L 157,84 L 160,85 L 162,87 L 163,90 L 162,93 L 159,94 L 155,93 L 154,90 L 154,86',
    labelX: 159,
    labelY: 89
  },
  {
    id: 'australia_central',
    name: 'Australia Central',
    abbreviation: 'ACST',
    timezones: ['Australia/Adelaide', 'Australia/Darwin'],
    path: 'M 162,87 L 166,84 L 170,85 L 173,87 L 173,90 L 172,93 L 169,95 L 165,95 L 162,93 L 163,90 L 162,87',
    labelX: 167,
    labelY: 89
  },
  {
    id: 'australia_east',
    name: 'Australia East',
    abbreviation: 'AEST',
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'],
    path: 'M 173,87 L 177,85 L 180,86 L 183,87 L 184,91 L 182,94 L 178,95 L 174,95 L 172,93 L 173,90 L 173,87',
    labelX: 179,
    labelY: 90
  },
  {
    id: 'new_zealand',
    name: 'New Zealand',
    abbreviation: 'NZST',
    timezones: ['Pacific/Auckland', 'Pacific/Chatham'],
    path: 'M 195,86 L 197,85 L 199,85 L 201,87 L 202,91 L 201,94 L 199,96 L 196,95 L 194,93 L 194,89 L 195,86',
    labelX: 198,
    labelY: 91
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
      <div className="scroller">
        <svg viewBox="15 74 195 1" width="100%" height="410">
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
                fill={getSelectedRegion() === region.id ? '#a5d6a7' : hoveredRegion?.id === region.id ? '#c8e6c9' : '#e8f5e9'}
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
                fill={getSelectedRegion() === region.id ? '#2e7d32' : '#666'}
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

          {/* Removed hover info panel */}
        </svg>
      </div>

      <div className="timezone-region-legend">
        {hoveredRegion ? (
          <span className="region-info">
            <span className="region-name">{hoveredRegion.name} ({getAbbreviationWithDaylight(hoveredRegion)})</span>
            <span className="region-timezone">{hoveredRegion.timezones[0]}</span>
          </span>
        ) : (
          <p className="legend-title">Hover over a region to see details</p>
        )}
      </div>
    </div>
  );
}

export default WorldTimezoneMap;