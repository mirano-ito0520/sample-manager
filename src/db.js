import Dexie from 'dexie'

export const db = new Dexie('SampleManagerDB')

db.version(1).stores({
  samples: '++id, manufacturer, brand, requestDate, receiveDate, status',
  appState: 'key',
})

// --- Status auto-determination ---

function determineStatus(sample) {
  if (sample.note && sample.note.includes('対応不可')) return '対応不可'
  if (sample.receiveDate) return '到着済'
  if (!sample.requestDate || sample.requestDate === '未' || sample.requestDate === '？') return '依頼準備中'
  return '未到着'
}

// --- localStorage backup / restore ---

const BACKUP_KEY = 'sm_backup_samples'

export async function backupToLocalStorage() {
  try {
    const all = await db.samples.toArray()
    localStorage.setItem(BACKUP_KEY, JSON.stringify(all))
  } catch (e) {
    console.warn('localStorage backup failed:', e)
  }
}

export async function restoreFromBackupIfNeeded() {
  try {
    const count = await db.samples.count()
    if (count > 0) return false

    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return false

    const items = JSON.parse(raw)
    if (!Array.isArray(items) || items.length === 0) return false

    // Strip id so Dexie auto-generates new ones
    const cleaned = items.map(({ id, ...rest }) => rest)
    await db.samples.bulkAdd(cleaned)
    console.log(`Restored ${cleaned.length} samples from localStorage backup`)
    return true
  } catch (e) {
    console.warn('Restore from backup failed:', e)
    return false
  }
}

// --- CRUD helpers ---

export async function getAllSamples() {
  const all = await db.samples.toArray()
  // Sort by requestDate descending (nulls last)
  all.sort((a, b) => {
    if (!a.requestDate && !b.requestDate) return 0
    if (!a.requestDate) return 1
    if (!b.requestDate) return -1
    return b.requestDate.localeCompare(a.requestDate)
  })
  return all
}

export async function getSample(id) {
  return db.samples.get(id)
}

export async function addSample(sample) {
  const status = determineStatus(sample)
  const id = await db.samples.add({ ...sample, status })
  await backupToLocalStorage()
  return id
}

export async function updateSample(id, changes) {
  // Re-determine status when relevant fields change
  if ('requestDate' in changes || 'receiveDate' in changes || 'note' in changes) {
    const existing = await db.samples.get(id)
    if (existing) {
      const merged = { ...existing, ...changes }
      changes.status = determineStatus(merged)
    }
  }
  await db.samples.update(id, changes)
  await backupToLocalStorage()
}

export async function deleteSample(id) {
  await db.samples.delete(id)
  await backupToLocalStorage()
}

export async function bulkAddSamples(samples) {
  const withStatus = samples.map((s) => ({
    ...s,
    status: determineStatus(s),
  }))
  await db.samples.bulkAdd(withStatus)
  await backupToLocalStorage()
  return withStatus.length
}

export async function clearAllSamples() {
  await db.samples.clear()
  await backupToLocalStorage()
}

// --- Unique value helpers (for autocomplete / suggestions) ---

export async function getUniqueSampleNames() {
  const all = await db.samples.toArray()
  const names = [...new Set(all.map((s) => s.sampleName).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, 'ja'))
  return names
}

export async function getUniqueManufacturers() {
  const all = await db.samples.toArray()
  const names = [...new Set(all.map((s) => s.manufacturer).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, 'ja'))
  return names
}

export async function getUniqueBrands() {
  const all = await db.samples.toArray()
  const names = [...new Set(all.map((s) => s.brand).filter(Boolean))]
  names.sort((a, b) => a.localeCompare(b, 'ja'))
  return names
}
