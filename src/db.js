import Dexie from 'dexie'

export const db = new Dexie('SampleManagerDB')

db.version(1).stores({
  samples: '++id, manufacturer, brand, requestDate, receiveDate, status',
  appState: 'key',
})

db.version(2).stores({
  samples: '++id, manufacturer, brand, requestDate, receiveDate, status, parentId',
  appState: 'key',
}).upgrade(tx => {
  // No data migration needed, parentId will be undefined for existing records
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

    await bulkAddSamples(items)
    console.log(`Restored ${items.length} samples from localStorage backup`)
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
  const existing = await db.samples.get(id)
  if (!existing) throw new Error(`Sample with id ${id} not found`)

  // 明示的なステータス変更（アーカイブ、商品化など）
  if (changes.status === 'アーカイブ') {
    // アーカイブ前のステータスを保存（復元時に使う）
    await db.samples.update(id, { ...changes, prevStatus: existing.status })
    await backupToLocalStorage()
    return
  }
  if (changes.status === '商品化') {
    await db.samples.update(id, changes)
    await backupToLocalStorage()
    return
  }

  // 「復元」の場合: アーカイブ前のステータスに戻す
  if (changes.status === 'restore') {
    if (existing.prevStatus) {
      changes.status = existing.prevStatus
      changes.prevStatus = null
    } else {
      const merged = { ...existing, ...changes }
      delete merged.status
      changes.status = determineStatus(merged)
    }
  }
  // 通常の編集: アーカイブ/商品化中のサンプルはステータスを維持
  else if ((existing.status === 'アーカイブ' || existing.status === '商品化') && !('status' in changes)) {
    // status を変更しない
  }
  // 通常の編集: ステータスに影響する項目が変わったら再計算
  else if ('requestDate' in changes || 'receiveDate' in changes || 'note' in changes) {
    const merged = { ...existing, ...changes }
    changes.status = determineStatus(merged)
  }

  await db.samples.update(id, changes)
  await backupToLocalStorage()
}

export async function deleteSample(id) {
  await db.samples.delete(id)
  await backupToLocalStorage()
}

export async function bulkAddSamples(samples) {
  // Build old→new ID mapping to preserve parentId links
  const oldIdMap = {}
  const toInsert = samples.map((s) => {
    const oldId = s.id
    const { id, ...rest } = s
    const record = { ...rest, status: s.status || determineStatus(rest) }
    // Store old ID for remapping later
    if (oldId != null) record._oldId = oldId
    return record
  })

  // Insert records one by one to capture new IDs
  for (const record of toInsert) {
    const oldId = record._oldId
    delete record._oldId
    const newId = await db.samples.add(record)
    if (oldId != null) oldIdMap[oldId] = newId
  }

  // Remap parentId references to new IDs
  const allRecords = await db.samples.toArray()
  for (const record of allRecords) {
    if (record.parentId && oldIdMap[record.parentId] != null) {
      await db.samples.update(record.id, { parentId: oldIdMap[record.parentId] })
    }
  }

  await backupToLocalStorage()
  return toInsert.length
}

export async function clearAllSamples() {
  await db.samples.clear()
  await backupToLocalStorage()
}
