import { useState, useMemo } from 'react'

const STATUS_OPTIONS = ['全て', '未到着', '依頼準備中', '到着済', '対応不可']

const STATUS_STYLES = {
  '未到着': 'bg-danger-bg text-danger',
  '依頼準備中': 'bg-warn-bg text-warn',
  '到着済': 'bg-success-bg text-success',
  '対応不可': 'bg-card text-text-muted',
}

function SampleList({ samples, onEdit, onStatusChange, onDelete }) {
  const [statusFilter, setStatusFilter] = useState('全て')
  const [manufacturerFilter, setManufacturerFilter] = useState('全て')
  const [brandFilter, setBrandFilter] = useState('全て')
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState('requestDate')
  const [sortAsc, setSortAsc] = useState(false)

  const manufacturers = useMemo(() => {
    const set = new Set(samples.map(s => s.manufacturer).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples])

  const brands = useMemo(() => {
    let filtered = samples
    if (manufacturerFilter !== '全て') {
      filtered = filtered.filter(s => s.manufacturer === manufacturerFilter)
    }
    const set = new Set(filtered.map(s => s.brand).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples, manufacturerFilter])

  const filteredSamples = useMemo(() => {
    let result = [...samples]

    if (statusFilter !== '全て') {
      result = result.filter(s => s.status === statusFilter)
    }
    if (manufacturerFilter !== '全て') {
      result = result.filter(s => s.manufacturer === manufacturerFilter)
    }
    if (brandFilter !== '全て') {
      result = result.filter(s => s.brand === brandFilter)
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      result = result.filter(s =>
        (s.sampleName && s.sampleName.toLowerCase().includes(q)) ||
        (s.requestDetail && s.requestDetail.toLowerCase().includes(q)) ||
        (s.note && s.note.toLowerCase().includes(q))
      )
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] || ''
      const bVal = b[sortKey] || ''
      if (!aVal && !bVal) return 0
      if (!aVal) return 1
      if (!bVal) return -1
      const cmp = aVal.localeCompare(bVal)
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [samples, statusFilter, manufacturerFilter, brandFilter, searchText, sortKey, sortAsc])

  const handleManufacturerChange = (value) => {
    setManufacturerFilter(value)
    setBrandFilter('全て')
  }

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const handleArrival = (sample) => {
    const today = new Date().toISOString().split('T')[0]
    onStatusChange(sample.id, { receiveDate: today, status: '到着済' })
  }

  const handleDeleteClick = (sample) => {
    if (window.confirm(`「${sample.sampleName || '(名称なし)'}」を削除しますか？`)) {
      onDelete(sample.id)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter bar */}
      <div className="bg-card rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-input text-text-main border border-border rounded-lg px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">メーカー</label>
            <select
              value={manufacturerFilter}
              onChange={(e) => handleManufacturerChange(e.target.value)}
              className="w-full bg-input text-text-main border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="全て">全て</option>
              {manufacturers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">ブランド</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full bg-input text-text-main border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="全て">全て</option>
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">検索</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="サンプル名・依頼内容・備考"
              className="w-full bg-input text-text-main border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            {filteredSamples.length}件 表示中 / 全{samples.length}件
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSort('requestDate')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                sortKey === 'requestDate'
                  ? 'border-accent text-accent bg-accent-glow'
                  : 'border-border text-text-sub hover:text-text-main'
              }`}
            >
              依頼日{sortKey === 'requestDate' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => toggleSort('receiveDate')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                sortKey === 'receiveDate'
                  ? 'border-accent text-accent bg-accent-glow'
                  : 'border-border text-text-sub hover:text-text-main'
              }`}
            >
              受取日{sortKey === 'receiveDate' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">ステータス</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">依頼日</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">メーカー</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">ブランド</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">サンプル名</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">依頼内容</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">受取日</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredSamples.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-text-muted">
                  該当するサンプルはありません
                </td>
              </tr>
            ) : (
              filteredSamples.map((sample) => (
                <tr
                  key={sample.id}
                  className="border-b border-border/50 hover:bg-card-hover transition-colors"
                >
                  <td className="py-3 px-3">
                    <StatusBadge status={sample.status} />
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub whitespace-nowrap">
                    {sample.requestDate || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main">
                    {sample.manufacturer || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main">
                    {sample.brand || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main max-w-[200px] truncate">
                    {sample.sampleName || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub max-w-[200px] truncate">
                    {sample.requestDetail || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub whitespace-nowrap">
                    {sample.receiveDate || '-'}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex gap-1.5">
                      {sample.status === '未到着' && (
                        <button
                          onClick={() => handleArrival(sample)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-success-bg text-success hover:bg-success/20 transition-colors"
                        >
                          到着
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(sample)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteClick(sample)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-danger-bg text-danger hover:bg-danger/20 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {filteredSamples.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center text-text-muted">
            該当するサンプルはありません
          </div>
        ) : (
          filteredSamples.map((sample) => (
            <div
              key={sample.id}
              className="bg-card rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-text-main text-sm font-medium truncate">
                    {sample.sampleName || '(名称なし)'}
                  </div>
                  <div className="text-text-muted text-xs mt-0.5">
                    {sample.manufacturer || '-'}
                    {sample.brand ? ` / ${sample.brand}` : ''}
                  </div>
                </div>
                <StatusBadge status={sample.status} />
              </div>

              {sample.requestDetail && (
                <div className="text-text-sub text-xs line-clamp-2">
                  {sample.requestDetail}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>依頼: {sample.requestDate || '-'}</span>
                <span>受取: {sample.receiveDate || '-'}</span>
              </div>

              <div className="flex gap-2 pt-1">
                {sample.status === '未到着' && (
                  <button
                    onClick={() => handleArrival(sample)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-success-bg text-success hover:bg-success/20 transition-colors"
                  >
                    到着
                  </button>
                )}
                <button
                  onClick={() => onEdit(sample)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeleteClick(sample)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-danger-bg text-danger hover:bg-danger/20 transition-colors"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || 'bg-card text-text-muted'
  return (
    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${style}`}>
      {status}
    </span>
  )
}

export default SampleList
