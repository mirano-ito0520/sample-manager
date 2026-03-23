import { useState, useRef } from 'react'
import { parseMultipleExcelFiles } from '../excelImport'
import { bulkAddSamples, clearAllSamples, getAllSamples } from '../db'

function ImportPanel({ onImportComplete }) {
  const [files, setFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [clearBeforeImport, setClearBeforeImport] = useState(false)
  const fileInputRef = useRef(null)

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
          // インポート失敗時はバックアップから復元
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

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
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
            className="bg-accent hover:bg-accent-light text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
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
              : 'bg-accent hover:bg-accent-light text-white'
          }`}
        >
          {importing ? 'インポート中...' : 'インポート開始'}
        </button>

        {/* Progress */}
        {importing && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-sub">ファイルを処理しています...</span>
          </div>
        )}

        {/* Result */}
        {result !== null && (
          <div className="bg-success-bg border border-success/20 rounded-xl p-4">
            <p className="text-success text-sm font-medium">
              {result}件のサンプルをインポートしました
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-danger-bg border border-danger/20 rounded-xl p-4">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportPanel
