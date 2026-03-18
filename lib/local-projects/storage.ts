import type { PersistedProject, PersistedProjectIndex, RecentProjectSummary } from "@/lib/persistence/local-projects/schema";
import {
  localProjectsStorageVersion,
  persistedProjectIndexSchema,
  persistedProjectSchema,
} from "@/lib/persistence/local-projects/schema";
import { deriveRecentProjectSummary } from "@/lib/persistence/local-projects/summaries";

const projectKeyPrefix = "appdesigner:project:";
const projectIndexKey = "appdesigner:index";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getProjectKey(projectId: string) {
  return `${projectKeyPrefix}${projectId}`;
}

function defaultIndex(): PersistedProjectIndex {
  return {
    storageVersion: localProjectsStorageVersion,
    recentProjectIds: [],
    lastOpenProjectId: null,
  };
}

export function loadProject(projectId: string) {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.localStorage.getItem(getProjectKey(projectId));

  if (!rawValue) {
    return null;
  }

  try {
    return persistedProjectSchema.parse(JSON.parse(rawValue));
  } catch {
    window.localStorage.removeItem(getProjectKey(projectId));
    return null;
  }
}

export function loadProjectIndex() {
  if (!isBrowser()) {
    return defaultIndex();
  }

  const rawValue = window.localStorage.getItem(projectIndexKey);

  if (!rawValue) {
    return defaultIndex();
  }

  try {
    return persistedProjectIndexSchema.parse(JSON.parse(rawValue));
  } catch {
    window.localStorage.removeItem(projectIndexKey);
    return defaultIndex();
  }
}

export function saveProject(snapshot: PersistedProject) {
  if (!isBrowser()) {
    return;
  }

  const normalizedSnapshot = persistedProjectSchema.parse(snapshot);
  window.localStorage.setItem(getProjectKey(normalizedSnapshot.projectId), JSON.stringify(normalizedSnapshot));

  const index = loadProjectIndex();
  const recentProjectIds = [
    normalizedSnapshot.projectId,
    ...index.recentProjectIds.filter((projectId) => projectId !== normalizedSnapshot.projectId),
  ].slice(0, 5);

  const nextIndex = persistedProjectIndexSchema.parse({
    storageVersion: localProjectsStorageVersion,
    recentProjectIds,
    lastOpenProjectId: normalizedSnapshot.projectId,
  });

  window.localStorage.setItem(projectIndexKey, JSON.stringify(nextIndex));
}

export function loadLastOpenProject() {
  const index = loadProjectIndex();

  if (!index.lastOpenProjectId) {
    return null;
  }

  const project = loadProject(index.lastOpenProjectId);

  if (project) {
    return project;
  }

  clearLastOpenProjectId();
  return null;
}

export function listRecentProjectSummaries(): RecentProjectSummary[] {
  const index = loadProjectIndex();
  const summaries = index.recentProjectIds
    .map((projectId) => loadProject(projectId))
    .filter((project): project is PersistedProject => project !== null)
    .map(deriveRecentProjectSummary)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  if (summaries.length !== index.recentProjectIds.length && isBrowser()) {
    const validIds = summaries.map((summary) => summary.projectId);

    window.localStorage.setItem(
      projectIndexKey,
      JSON.stringify({
        storageVersion: localProjectsStorageVersion,
        recentProjectIds: validIds,
        lastOpenProjectId: validIds.includes(index.lastOpenProjectId ?? "") ? index.lastOpenProjectId : (validIds[0] ?? null),
      }),
    );
  }

  return summaries;
}

function clearLastOpenProjectId() {
  if (!isBrowser()) {
    return;
  }

  const index = loadProjectIndex();
  window.localStorage.setItem(
    projectIndexKey,
    JSON.stringify({
      ...index,
      lastOpenProjectId: null,
    }),
  );
}
