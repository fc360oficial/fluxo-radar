// Saves survey submissions locally when offline, syncs when back online

export interface PendingSurvey {
  localId: string
  campaignId: string
  payload: Record<string, unknown>
  createdAt: string
}

const KEY = 'fluxo_pending_surveys'

export function getQueue(): PendingSurvey[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function enqueue(item: Omit<PendingSurvey, 'localId' | 'createdAt'>): PendingSurvey {
  const entry: PendingSurvey = {
    ...item,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const queue = getQueue()
  queue.push(entry)
  localStorage.setItem(KEY, JSON.stringify(queue))
  return entry
}

export function dequeue(localId: string) {
  const queue = getQueue().filter((i) => i.localId !== localId)
  localStorage.setItem(KEY, JSON.stringify(queue))
}

export function pendingCount(): number {
  return getQueue().length
}
