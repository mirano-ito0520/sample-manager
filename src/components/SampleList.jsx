import { useState, useMemo, useEffect, useCallback } from 'react'

const STATUS_OPTIONS = ['全て', '未到着', '依頼準備中', '到着済', '商品化', '対応不可', 'アーカイブ']

const CSV_COLUMNS = [
  { key: 'status', label: 'ステータス' },
  { key: 'requestDate', label: '依頼日' },
  { key: 'brand', label: 'お客様' },
  { key: 'manufacturer', label: '依頼先' },
  { key: 'factoryName', label: '製造元' },
  { key: 'projectName', label: 'プロジェクト名' },
  { key: 'sampleName', label: 'サンプル名' },
  { key: 'requestDetail', label: '依頼内容' },
  { key: 'salesTarget', label: '販売先' },
  { key: 'receiveDate', label: '受取日' },
  { key: 'quantity', label: '本数' },
  { key: 'ingredientList', label: '全成分表示' },
  { key: 'estimate', label: '見積' },
  { key: 'note', label: '備考' },
  { key: 'parentId', label: '改良元ID' },
]

const STATUS_STYLES = {
  '未到着': 'bg-danger-bg text-danger',
  '依頼準備中': 'bg-warn-bg text-warn',
  '到着済': 'bg-success-bg text-success',
  '商品化': 'bg-accent-glow text-accent',
  '対応不可': 'bg-card text-text-muted',
  'アーカイブ': 'bg-card text-text-muted opacity-60',
}

function SampleList({ samples, onEdit, onStatusChange, onDelete, onCreateRevision, saving }) {
  const [statusFilter, setStatusFilter] = useState('全て')
  const [manufacturerFilter, setManufacturerFilter] = useState('全て')
  const [brandFilter, setBrandFilter] = useState('全て')
  const [searchText, setSearchText] = useState('')
  const [sortKey, setSortKey] = useState('requestDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())

  const toggleCollapse = useCallback((parentId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }, [])

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

  useEffect(() => {
    if (manufacturerFilter !== '全て' && !manufacturers.includes(manufacturerFilter)) {
      setManufacturerFilter('全て')
    }
  }, [manufacturers])

  useEffect(() => {
    if (brandFilter !== '全て' && !brands.includes(brandFilter)) {
      setBrandFilter('全て')
    }
  }, [brands])

  const filteredSamples = useMemo(() => {
    let result = [...samples]

    if (statusFilter === '全て') {
      // デフォルトではアーカイブを非表示
      result = result.filter(s => s.status !== 'アーカイブ')
    } else {
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
      const raw = (v) => (!v || v === '不明') ? '' : v
      const aVal = raw(a[sortKey])
      const bVal = raw(b[sortKey])
      if (!aVal && !bVal) return 0
      if (!aVal) return 1
      if (!bVal) return -1
      const cmp = aVal.localeCompare(bVal)
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [samples, statusFilter, manufacturerFilter, brandFilter, searchText, sortKey, sortAsc])

  const treeItems = useMemo(() => {
    const filteredIds = new Set(filteredSamples.map(s => s.id))
    const childrenMap = {}  // parentId -> [children]
    const roots = []

    // Group children by parent
    for (const s of filteredSamples) {
      if (s.parentId && filteredIds.has(s.parentId)) {
        if (!childrenMap[s.parentId]) childrenMap[s.parentId] = []
        childrenMap[s.parentId].push(s)
      } else {
        roots.push(s)
      }
    }

    // Recursively build flat list with depth info
    const items = []
    const addNode = (sample, depth) => {
      const children = childrenMap[sample.id] || []
      const hasChildren = children.length > 0
      items.push({ ...sample, _depth: depth, _hasChildren: hasChildren, _childCount: children.length })
      if (hasChildren && !collapsedGroups.has(sample.id)) {
        for (const child of children) {
          addNode(child, depth + 1)
        }
      }
    }
    for (const root of roots) {
      addNode(root, 0)
    }
    return items
  }, [filteredSamples, collapsedGroups])

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

  const exportCsv = useCallback(() => {
    if (filteredSamples.length === 0) return

    const escCsv = (val) => {
      const s = String(val ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const header = CSV_COLUMNS.map(c => c.label).join(',')
    const rows = filteredSamples.map(sample =>
      CSV_COLUMNS.map(c => escCsv(sample[c.key])).join(',')
    )
    const bom = '\uFEFF'
    const csv = bom + header + '\n' + rows.join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
    const filterLabel = [
      statusFilter !== '全て' ? statusFilter : '',
      manufacturerFilter !== '全て' ? manufacturerFilter : '',
      brandFilter !== '全て' ? brandFilter : '',
    ].filter(Boolean).join('_')
    a.download = `サンプル一覧_${filterLabel || '全件'}_${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [filteredSamples, statusFilter, manufacturerFilter, brandFilter])

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
            <label className="block text-xs text-text-muted mb-1">お客様</label>
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
            <label className="block text-xs text-text-muted mb-1">依頼先</label>
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
            {treeItems.length !== filteredSamples.length && (
              <span className="ml-1">({treeItems.length}件 展開表示)</span>
            )}
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
            <button
              onClick={exportCsv}
              disabled={filteredSamples.length === 0}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filteredSamples.length === 0
                  ? 'border-border text-text-muted cursor-not-allowed'
                  : 'border-success text-success bg-success-bg hover:bg-success/20'
              }`}
            >
              CSV出力
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
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">お客様</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">依頼先</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">製造元</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">サンプル名</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">依頼内容</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">受取日</th>
              <th className="text-left text-xs text-text-muted font-medium py-3 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {treeItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-text-muted">
                  該当するサンプルはありません
                </td>
              </tr>
            ) : (
              treeItems.map((sample) => (
                <tr
                  key={sample.id}
                  className={`border-b border-border/50 hover:bg-card-hover transition-colors ${
                    sample._depth > 0 ? 'bg-card/30' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <StatusBadge status={sample.status} />
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub whitespace-nowrap">
                    {sample.requestDate || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main">
                    {sample._depth > 0 ? '-' : (sample.brand || '-')}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main">
                    {sample._depth > 0 ? '-' : (sample.manufacturer || '-')}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub">
                    {sample.factoryName || '-'}
                  </td>
                  <td className="py-3 px-3 text-sm text-text-main min-w-[180px]">
                    <div className="flex items-start gap-1">
                      {sample._depth === 0 && sample._hasChildren && (
                        <button
                          onClick={() => toggleCollapse(sample.id)}
                          className="text-text-muted text-xs shrink-0 w-4 mt-0.5"
                        >
                          {collapsedGroups.has(sample.id) ? '▶' : '▼'}
                        </button>
                      )}
                      {sample._depth > 0 && (
                        <span className={`text-accent/50 shrink-0 mt-0.5 ${sample._depth === 1 ? 'ml-4' : 'ml-8'}`}>↳</span>
                      )}
                      <span className="break-words">{sample.sampleName || '-'}</span>
                      {sample._depth === 0 && sample._hasChildren && (
                        <span className="text-xs text-accent bg-accent-glow px-1.5 py-0.5 rounded-full shrink-0 ml-1">
                          {sample._childCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-text-sub min-w-[150px]">
                    <span className="break-words">{sample.requestDetail || '-'}</span>
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
                      {sample.status === '到着済' && (
                        <button
                          onClick={() => onStatusChange(sample.id, { status: '商品化' })}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                        >
                          商品化
                        </button>
                      )}
                      {sample.status !== 'アーカイブ' ? (
                        <button
                          onClick={() => onStatusChange(sample.id, { status: 'アーカイブ' })}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-card text-text-muted hover:bg-card-hover transition-colors border border-border"
                        >
                          保留
                        </button>
                      ) : (
                        <button
                          onClick={() => onStatusChange(sample.id, { status: 'restore' })}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                        >
                          復元
                        </button>
                      )}
                      <button
                        onClick={() => onCreateRevision(sample)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                      >
                        改良
                      </button>
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
        {treeItems.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center text-text-muted">
            該当するサンプルはありません
          </div>
        ) : (
          treeItems.map((sample) => (
            <div
              key={sample.id}
              className={`bg-card rounded-xl space-y-2 ${
                sample._depth === 0 ? 'p-4' : 'p-3 ml-4 border-l-2 border-accent/30 bg-card/50'
              } ${sample._depth >= 2 ? 'ml-8' : ''} ${sample.status === 'アーカイブ' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {sample._depth === 0 && sample._hasChildren && (
                      <button
                        onClick={() => toggleCollapse(sample.id)}
                        className="text-text-muted text-xs shrink-0"
                      >
                        {collapsedGroups.has(sample.id) ? '▶' : '▼'}
                      </button>
                    )}
                    {sample._depth > 0 && (
                      <span className="text-accent text-xs shrink-0">↳</span>
                    )}
                    <div className="text-text-main text-sm font-medium break-words">
                      {sample.sampleName || sample.requestDetail || '(名称なし)'}
                    </div>
                  </div>
                  <div className="text-text-muted text-xs mt-0.5">
                    {sample._depth === 0 ? (
                      <>
                        お客様: {sample.brand || '-'}
                        {sample.manufacturer ? ` / 依頼先: ${sample.manufacturer}` : ''}
                      </>
                    ) : (
                      sample.requestDetail || ''
                    )}
                  </div>
                  {sample._depth === 0 && sample.requestDetail && (
                    <div className="text-text-sub text-xs mt-1 line-clamp-2">
                      {sample.requestDetail}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {sample._depth === 0 && sample._hasChildren && (
                    <span className="text-xs text-accent bg-accent-glow px-1.5 py-0.5 rounded-full">
                      {sample._childCount}回改良
                    </span>
                  )}
                  <StatusBadge status={sample.status} />
                </div>
              </div>

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
                {sample.status === '到着済' && (
                  <button
                    onClick={() => onStatusChange(sample.id, { status: '商品化' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                  >
                    商品化
                  </button>
                )}
                {sample.status !== 'アーカイブ' ? (
                  <button
                    onClick={() => onStatusChange(sample.id, { status: 'アーカイブ' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-card text-text-muted hover:bg-card-hover transition-colors border border-border"
                  >
                    保留
                  </button>
                ) : (
                  <button
                    onClick={() => onStatusChange(sample.id, { status: 'restore' })}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                  >
                    復元
                  </button>
                )}
                <button
                  onClick={() => onCreateRevision(sample)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-glow text-accent hover:bg-accent/20 transition-colors"
                >
                  改良
                </button>
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
