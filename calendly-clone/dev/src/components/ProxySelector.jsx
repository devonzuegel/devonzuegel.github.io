import React from 'react';

function ProxySelector({ selectedProxy, onChange }) {
  const proxyOptions = [
    { value: 'https://api.allorigins.win/raw?url=', label: 'allorigins' },
    { value: 'https://corsproxy.io/?', label: 'corsproxy.io' },
    { value: 'https://cors-anywhere.herokuapp.com/', label: 'cors-anywhere' },
    { value: 'https://proxy.cors.sh/', label: 'cors.sh' },
    { value: 'direct', label: 'Direct (no proxy)' }
  ];

  const handleChange = (event) => {
    onChange(event.target.value);
  };

  return (
    <div>
      <label htmlFor="proxySelector">CORS Proxy:</label>
      <select 
        id="proxySelector" 
        value={selectedProxy} 
        onChange={handleChange}
      >
        {proxyOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ProxySelector;