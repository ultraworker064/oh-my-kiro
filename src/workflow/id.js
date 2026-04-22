export function slugify(input) {
  return String(input || 'workflow')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workflow';
}

export function timestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function createWorkflowId(task, date = new Date()) {
  return `${timestamp(date)}-${slugify(task)}`;
}

export function projectSlug(root) {
  const parts = String(root).split(/[\\/]+/).filter(Boolean);
  return slugify(parts.at(-1) || 'project');
}
