import React from 'react';

function CalendarOutput({ output }) {
  // If output is empty, return nothing
  if (!output) return null;

  // Check if output is a JSON string
  try {
    const parsedOutput = JSON.parse(output);
    if (Array.isArray(parsedOutput)) {
      return (
        <div className="calendar-data-summary">
          <h3>Available Time Slots</h3>
          <p>{parsedOutput.length} time slots found</p>
          <details>
            <summary>View Raw Data</summary>
            <pre id="output">{output}</pre>
          </details>
        </div>
      );
    }
  } catch (e) {
    // If not parseable as JSON, display as is
  }

  // Default rendering for string output
  return (
    <pre id="output">
      {output}
    </pre>
  );
}

export default CalendarOutput;