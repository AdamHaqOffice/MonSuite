import { createAuditEvent } from '../data/projectTemplates.js';

const PROJECTS_KEY = 'monsuite-projects-v1';

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function readJson(key, fallback) {
  const storage = safeStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('monsuite-projects-updated'));
}

export function getProjects() {
  return readJson(PROJECTS_KEY, []).map((project) => ({
    ...project,
    requirements: project.requirements || [],
    imports: project.imports || [],
    measurements: project.measurements || [],
    equipment: project.equipment || [],
    correctiveActions: project.correctiveActions || {},
    events: project.events || [],
    generatedReports: project.generatedReports || [],
  }));
}

export function saveProjects(projects) {
  writeJson(PROJECTS_KEY, projects);
}

export function upsertProject(project, userEmail = '', auditLabel = 'Project updated', auditAction = 'project_updated', values = {}) {
  const projects = getProjects();
  const event = createAuditEvent(auditAction, auditLabel, userEmail, values);
  const nextProject = {
    ...project,
    updatedAt: new Date().toISOString(),
    events: [...(project.events || []), event],
  };
  const exists = projects.some((item) => item.id === project.id);
  const next = exists ? projects.map((item) => (item.id === project.id ? nextProject : item)) : [nextProject, ...projects];
  saveProjects(next);
  return nextProject;
}

export function deleteProject(projectId) {
  saveProjects(getProjects().filter((project) => project.id !== projectId));
}

export function getProjectById(projectId) {
  return getProjects().find((project) => project.id === projectId) || null;
}
