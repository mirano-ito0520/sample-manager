import { useState, useEffect, useCallback } from 'react'
import { getAllSamples, restoreFromBackupIfNeeded, addSample, updateSample, deleteSample } from './db'
import Dashboard from './components/Dashboard'
import SampleList from './components/SampleList'
import SampleForm from './components/SampleForm'
import ImportPanel from './components/ImportPanel'

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { key: 'list', label: '一覧', icon: '📋' },
  { key: 'new', label: '新規登録', icon: '➕' },
  { key: 'import', label: 'インポート', icon: '📥' },
]

function App() {
  const [samples, setSamples] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [editingSample, setEditingSample] = useState(null)

  const loadSamples = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllSamples()
      setSamples(data)
    } catch (e) {
      console.error('Failed to load samples:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await restoreFromBackupIfNeeded()
      await loadSamples()
    }
    init()
  }, [loadSamples])

  const handleSave = useCallback(async (sampleData) => {
    try {
      if (editingSample) {
        await updateSample(editingSample.id, sampleData)
        setEditingSample(null)
      } else {
        await addSample(sampleData)
      }
      await loadSamples()
      setActiveTab('list')
    } catch (e) {
      console.error('Failed to save sample:', e)
      alert('保存に失敗しました。もう一度お試しください。')
    }
  }, [editingSample, loadSamples])

  const handleEdit = useCallback((sample) => {
    setEditingSample(sample)
    setActiveTab('new')
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingSample(null)
  }, [])

  const handleStatusChange = useCallback(async (id, changes) => {
    try {
      await updateSample(id, changes)
      await loadSamples()
    } catch (e) {
      console.error('Failed to update status:', e)
      alert('ステータスの更新に失敗しました。')
    }
  }, [loadSamples])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteSample(id)
      await loadSamples()
    } catch (e) {
      console.error('Failed to delete sample:', e)
      alert('削除に失敗しました。')
    }
  }, [loadSamples])

  const handleImportComplete = useCallback(async () => {
    await loadSamples()
  }, [loadSamples])

  const handleTabChange = useCallback((key) => {
    if (key !== 'new') {
      setEditingSample(null)
    }
    setActiveTab(key)
  }, [])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-text-sub text-lg">読み込み中...</div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard samples={samples} />
      case 'list':
        return (
          <SampleList
            samples={samples}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )
      case 'new':
        return (
          <SampleForm
            samples={samples}
            editingSample={editingSample}
            onSave={handleSave}
            onCancel={handleCancelEdit}
          />
        )
      case 'import':
        return <ImportPanel onImportComplete={handleImportComplete} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-4">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-text-main">サンプル管理</h1>
        </div>
        {/* Desktop tab bar */}
        <nav className="hidden md:block max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-bg text-accent border-t border-x border-border'
                    : 'text-text-sub hover:text-text-main hover:bg-card-hover'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {tab.key === 'new' && editingSample && (
                  <span className="ml-1.5 text-xs text-warn">(編集中)</span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {renderContent()}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30 safe-area-bottom">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 flex flex-col items-center py-2 pt-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-accent'
                  : 'text-text-muted'
              }`}
            >
              <span className="text-lg mb-0.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default App
