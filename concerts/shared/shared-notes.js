export function sharedNoteFor(event, fields = {}, notes = null) {
  for (const id of [event.id, ...(event.aliases || [])]) {
    if (notes && Object.hasOwn(notes,id)) return typeof notes[id] === 'string' ? notes[id].slice(0,3000) : '';
    const field = fields[`event/${id}/publicNote`];
    if (field) return typeof field.value === 'string' ? field.value.slice(0,3000) : '';
  }
  return '';
}
export function sharedNotesFor(events, fields = {}) {
  return Object.fromEntries(events.map(event=>[event.id,sharedNoteFor(event,fields)]).filter(([,note])=>note));
}
