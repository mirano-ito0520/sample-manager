import { read, utils } from 'xlsx'

// --- Date conversion ---

function excelDateToString(excelDate) {
  if (!excelDate) return null
  if (typeof excelDate === 'string') {
    // Already a string like '未', '？', '→'
    if (['未', '？', '→', '?'].includes(excelDate.trim())) return null
    // Try to parse date string
    const d = new Date(excelDate)
    if (!isNaN(d.getTime())) {
      // Use UTC components to avoid timezone shift
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }
    return null
  }
  if (typeof excelDate === 'number') {
    const days = excelDate - 25569
    const ms = days * 86400 * 1000
    const date = new Date(ms)
    // Use UTC components to avoid timezone shift
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

// --- Manufacturer name extraction ---

function extractManufacturer(filename) {
  // Remove common suffixes to get manufacturer name
  // e.g. "ABC様サンプルシート.xlsx" → "ABC"
  const name = filename
    .replace(/\.(xlsx|xls)$/i, '')
    .replace(/様サンプルシート$/, '')
    .replace(/サンプルシート$/, '')
    .trim()
  return name
}

// --- Sheet skip logic ---

function shouldSkipSheet(sheetName) {
  if (sheetName === '原紙') return true
  if (sheetName.endsWith('原紙')) return true
  if (sheetName.includes('案件なし')) return true
  return false
}

// --- Row skip logic ---

function isEmptyRow(row) {
  const sampleName = row['サンプル名'] || ''
  const requestDetail = row['依頼内容'] || ''
  return !sampleName && !requestDetail
}

// --- Main parse function ---

export async function parseExcelFile(file) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = read(arrayBuffer, { type: 'array' })

  const manufacturer = extractManufacturer(file.name)
  const results = []

  for (const sheetName of workbook.SheetNames) {
    if (shouldSkipSheet(sheetName)) continue

    const worksheet = workbook.Sheets[sheetName]
    const rows = utils.sheet_to_json(worksheet, { defval: '' })

    for (const row of rows) {
      if (isEmptyRow(row)) continue

      const sample = {
        manufacturer,
        brand: sheetName,
        projectName: row['プロジェクト名'] || '',
        sampleName: row['サンプル名'] || '',
        requestDetail: row['依頼内容'] || '',
        ingredientNote: row['成分説明（変更点など）'] || row['成分説明'] || '',
        salesTarget: row['販売先'] || '',
        factoryName: row['製造会社'] || '',
        requestDate: excelDateToString(row['依頼日']),
        receiveDate: excelDateToString(row['受取日']),
        quantity: String(row['本数'] || ''),
        progressNote: row['進捗状況'] || '',
        ingredientList: row['全成分表示'] || '',
        estimate: row['見積'] || '',
        note: row['備考'] || '',
        sourceFile: file.name,
        sourceSheet: sheetName,
      }

      results.push(sample)
    }
  }

  return results
}

// --- Multiple files ---

export async function parseMultipleExcelFiles(files) {
  const allSamples = []
  for (const file of files) {
    const samples = await parseExcelFile(file)
    allSamples.push(...samples)
  }
  return allSamples
}
