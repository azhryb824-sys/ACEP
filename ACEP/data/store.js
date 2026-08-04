/**
 * ACEP JSON File Store
 * Persists data to disk so projects survive server restarts
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filepath, defaultValue) {
  ensureDir();
  try {
    if (fs.existsSync(filepath)) {
      const raw = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`[Store] Error reading ${filepath}:`, e.message);
  }
  return defaultValue;
}

function writeJSON(filepath, data) {
  ensureDir();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Projects ──────────────────────────
const defaultProjects = [
  { id: 'proj-001', name: 'برج المملكة السكني', type: 'Villa', status: 'Active', created: '2026-01-15', area: 42000, floors: 30, cost: 450000000, progress: 72 },
  { id: 'proj-002', name: 'مستشفى المدينة الطبي', type: 'Hospital', status: 'Delayed', created: '2026-03-20', area: 85000, floors: 12, cost: 1200000000, progress: 45 },
  { id: 'proj-003', name: 'مشروع جدة السكني', type: 'Residential_Compound', status: 'Planning', created: '2026-04-10', area: 500000, floors: 2, cost: 280000000, progress: 15 }
];

function getProjects() {
  return readJSON(PROJECTS_FILE, defaultProjects);
}

function saveProjects(projects) {
  writeJSON(PROJECTS_FILE, projects);
}

function findProject(id) {
  return getProjects().find(p => p.id === id);
}

function createProject(data) {
  const projects = getProjects();
  const project = {
    id: 'proj-' + Date.now(),
    name: data.name || 'مشروع جديد',
    type: data.type || 'Building',
    status: data.status || 'Planning',
    created: new Date().toISOString().split('T')[0],
    area: data.area || 0,
    floors: data.floors || 1,
    cost: data.cost || 0,
    progress: 0,
    description: data.description || '',
    ...data
  };
  projects.push(project);
  saveProjects(projects);
  return project;
}

function updateProject(id, data) {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  projects[index] = { ...projects[index], ...data, id, updated: new Date().toISOString() };
  saveProjects(projects);
  return projects[index];
}

function deleteProject(id) {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  saveProjects(projects);
  return true;
}

module.exports = {
  getProjects,
  saveProjects,
  findProject,
  createProject,
  updateProject,
  deleteProject
};
