import { useState, useRef, useCallback } from 'react'
import { parseMultipleExcelFiles } from '../excelImport'
import { bulkAddSamples, clearAllSamples, getAllSamples } from '../db'

function ImportPanel({ onImportComplete }) {
  const [files, setFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [clearBeforeImport, setClearBeforeImport] = useState(false)
  const fileInputRef = useRef(null)
  const jsonInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    setFiles(selected)
    setResult(null)
    setError(null)
  }

  const handleImport = async () => {
    if (files.length === 0) return

    if (clearBeforeImport) {
      const confirmed = window.confirm(
        '全データを削除してからインポートします。\nこの操作は取り消せません。よろしいですか？'
      )
      if (!confirmed) return
    }

    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const parsed = await parseMultipleExcelFiles(files)

      if (parsed.length === 0) {
        setError('インポートできるデータが見つかりませんでした。')
        setImporting(false)
        return
      }

      if (clearBeforeImport) {
        const backup = await getAllSamples()
        try {
          await clearAllSamples()
          const count = await bulkAddSamples(parsed)
          setResult(count)
          setFiles([])
          if (fileInputRef.current) fileInputRef.current.value = ''
          onImportComplete()
          return
        } catch (restoreErr) {
          try {
            const cleaned = backup.map(({ id, ...rest }) => rest)
            await bulkAddSamples(cleaned)
          } catch (e2) {
            console.error('Restore failed:', e2)
          }
          throw restoreErr
        }
      }

      const count = await bulkAddSamples(parsed)
      setResult(count)
      setFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onImportComplete()
    } catch (e) {
      console.error('Import failed:', e)
      setError(`インポートに失敗しました: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // === JSON エクスポート ===
  const handleJsonExport = useCallback(async () => {
    try {
      const allSamples = await getAllSamples()
      if (allSamples.length === 0) {
        alert('エクスポートするデータがありません。')
        return
      }
      const cleaned = allSamples.map(({ id, ...rest }) => rest)
      const json = JSON.stringify(cleaned, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
      a.download = `サンプル管理_バックアップ_${ts}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert('エクスポートに失敗しました。')
    }
  }, [])

  // === JSON インポート ===
  const handleJsonImport = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data) || data.length === 0) {
        setError('有効なデータが含まれていません。')
        setImporting(false)
        return
      }

      const confirmed = window.confirm(
        `${data.length}件のデータを読み込みます。\n既存データを全て置き換えますか？\n\n「OK」→ 置き換え\n「キャンセル」→ 既存データに追加`
      )

      if (confirmed) {
        const backup = await getAllSamples()
        try {
          await clearAllSamples()
          const count = await bulkAddSamples(data)
          setResult(count)
          onImportComplete()
        } catch (restoreErr) {
          try {
            const cleaned = backup.map(({ id, ...rest }) => rest)
            await bulkAddSamples(cleaned)
          } catch (e2) {
            console.error('Restore failed:', e2)
          }
          throw restoreErr
        }
      } else {
        const count = await bulkAddSamples(data)
        setResult(count)
        onImportComplete()
      }
    } catch (e) {
      console.error('JSON import failed:', e)
      setError(`JSONインポートに失敗しました: ${e.message}`)
    } finally {
      setImporting(false)
      if (jsonInputRef.current) jsonInputRef.current.value = ''
    }
  }, [onImportComplete])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
      {/* === デバイス間連携 === */}
      <div className="bg-card rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-text-main">デバイス間連携</h2>
        <p className="text-sm text-text-sub">
          PC⇔スマホ間でデータを移動できます。JSONファイルで全データを丸ごとやりとりします。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* JSON Export */}
          <button
            type="button"
            onClick={handleJsonExport}
            className="flex flex-col items-center gap-2 bg-input border border-border rounded-xl p-5 hover:bg-card-hover transition-colors"
          >
            <span className="text-3xl">📤</span>
            <span className="text-sm font-medium text-text-main">データを書き出す</span>
            <span className="text-xs text-text-muted text-center">全データをJSONファイルとして保存</span>
          </button>

          {/* JSON Import */}
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="flex flex-col items-center gap-2 bg-input border border-border rounded-xl p-5 hover:bg-card-hover transition-colors"
          >
            <span className="text-3xl">📥</span>
            <span className="text-sm font-medium text-text-main">データを読み込む</span>
            <span className="text-xs text-text-muted text-center">JSONファイルからデータを復元</span>
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonImport}
            className="hidden"
          />
        </div>
      </div>

      {/* === Excelインポート === */}
      <div className="bg-card rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-text-main">Excelインポート</h2>

        <p className="text-sm text-text-sub">
          サンプルシート（.xlsx）ファイルを選択してインポートできます。
          複数ファイルをまとめて選択できます。
        </p>

        {/* File picker */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            ファイルを選択
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-text-sub">{files.length}件のファイルを選択中:</div>
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-input rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-text-main truncate mr-2">
                    📄 {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    className="text-text-muted hover:text-danger text-sm shrink-0 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="bg-warn-bg border border-warn/20 rounded-xl p-4">
          <p className="text-sm text-warn mb-3">
            既存データに追加されます。重複にご注意ください。
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={clearBeforeImport}
              onChange={(e) => setClearBeforeImport(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-input accent-accent"
            />
            <span className="text-sm text-text-main">
              全データ削除してからインポート
            </span>
          </label>
        </div>

        {/* Import button */}
        <button
          type="button"
          onClick={handleImport}
          disabled={files.length === 0 || importing}
          className={`w-full font-medium py-3 rounded-lg transition-colors text-sm ${
            files.length === 0 || importing
              ? 'bg-border text-text-muted cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-white'
          }`}
        >
          {importing ? 'インポート中...' : 'インポート開始'}
        </button>
      </div>

      {/* Shared status messages */}
      {importing && (
        <div className="flex items-center gap-3 py-2">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-sub">処理しています...</span>
        </div>
      )}

      {result !== null && (
        <div className="bg-success-bg border border-success/20 rounded-xl p-4">
          <p className="text-success text-sm font-medium">
            {result}件のサンプルをインポートしました
          </p>
        </div>
      )}

      {error && (
        <div className="bg-danger-bg border border-danger/20 rounded-xl p-4">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImportPanel
