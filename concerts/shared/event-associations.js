// Project existing notebook entries onto every ID without deleting stored data.
// Edits are mirrored to the group by ClientStore so unsaving/clearing still works.
export function projectEventFields(fields, groups = []) {
  const result = { ...fields };
  for (const ids of groups) {
    const names = new Set(Object.keys(fields).flatMap(key => {
      const [, id, name] = key.split('/');
      return key.startsWith('event/') && ids.includes(id) && name !== 'snapshot' ? [name] : [];
    }));
    for (const name of names) {
      const entries = ids.map(id => fields[`event/${id}/${name}`]).filter(Boolean);
      const latest = [...entries].sort((a, b) => (b.at || '').localeCompare(a.at || ''))[0];
      let value = latest.value;
      if (name === 'saved' || name === 'hidden' || name === 'planned') value = entries.some(e => e.value === true);
      if (name === 'notes') value = [...new Set(entries.map(e => e.value).filter(Boolean))].join('\n\n');
      for (const id of ids) {
        const key = `event/${id}/${name}`;
        result[key] = { ...latest, rev: fields[key]?.rev || 0, value };
      }
    }
  }
  return result;
}
