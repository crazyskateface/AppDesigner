import type { RuntimeSessionRecord, RuntimeSessionStore } from "@/lib/runtime/store/runtime-session-store";

export class InMemoryRuntimeSessionStore implements RuntimeSessionStore {
  private readonly sessions = new Map<string, RuntimeSessionRecord>();

  save(session: RuntimeSessionRecord) {
    this.sessions.set(session.runtimeId, session);
  }

  get(runtimeId: string) {
    return this.sessions.get(runtimeId) ?? null;
  }

  update(runtimeId: string, updates: Partial<RuntimeSessionRecord>) {
    const existing = this.sessions.get(runtimeId);

    if (!existing) {
      return null;
    }

    const nextRecord = {
      ...existing,
      ...updates,
    };

    this.sessions.set(runtimeId, nextRecord);
    return nextRecord;
  }
}
