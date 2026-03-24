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

  const loadSamples = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const data = await getAllSamples()
      setSamples(data)
    } catch (e) {
      console.error('Failed to load samples:', e)
    } finally {
      if (initial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await restoreFromBackupIfNeeded()
      await loadSamples(true)
    }
    init()
  }, [loadSamples])

  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleSave = useCallback(async (sampleData) => {
    try {
      if (editingSample && editingSample._isRevision) {
        await addSample(sampleData)
        setEditingSample(null)
        showToast('改良版を登録しました')
      } else if (editingSample) {
        await updateSample(editingSample.id, sampleData)
        setEditingSample(null)
        showToast('更新しました')
      } else {
        await addSample(sampleData)
        showToast('登録しました')
      }
      await loadSamples()
    } catch (e) {
      console.error('Failed to save sample:', e)
      alert('保存に失敗しました。もう一度お試しください。')
      throw e
    }
  }, [editingSample, loadSamples, showToast])

  const handleEdit = useCallback((sample) => {
    setEditingSample(sample)
    setActiveTab('new')
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingSample(null)
  }, [])

  const handleStatusChange = useCallback(async (id, changes) => {
    try {
      // アーカイブ時は改良版も一括で保留にする
      if (changes.status === 'アーカイブ') {
        const descendants = []
        const findChildren = (parentId) => {
          for (const s of samples) {
            if (s.parentId === parentId) {
              if (s.status !== 'アーカイブ') descendants.push(s.id)
              findChildren(s.id)  // 中間ノードがアーカイブ済みでも先の子を走査
            }
          }
        }
        findChildren(id)
        await updateSample(id, changes)
        for (const childId of descendants) {
          await updateSample(childId, { status: 'アーカイブ' })
        }
        if (descendants.length > 0) {
          showToast(`${1 + descendants.length}件を一括保留にしました`)
        }
      } else {
        await updateSample(id, changes)
      }
      await loadSamples()
    } catch (e) {
      console.error('Failed to update status:', e)
      alert('ステータスの更新に失敗しました。')
    }
  }, [loadSamples, samples, showToast])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteSample(id)
      await loadSamples()
    } catch (e) {
      console.error('Failed to delete sample:', e)
      alert('削除に失敗しました。')
    }
  }, [loadSamples])

  const handleCreateRevision = useCallback((sample) => {
    const revision = {
      manufacturer: sample.manufacturer || '',
      brand: sample.brand || '',
      projectName: sample.projectName || '',
      sampleName: '',
      requestDetail: '',
      ingredientNote: '',
      salesTarget: sample.salesTarget || '',
      factoryName: sample.factoryName || '',
      requestDate: '',
      receiveDate: '',
      quantity: sample.quantity || '',
      ingredientList: '未',
      estimate: '未',
      note: '',
      parentId: sample.id,
      parentName: sample.sampleName || sample.requestDetail || '(名称なし)',
    }
    setEditingSample({ ...revision, _isRevision: true })
    setActiveTab('new')
  }, [])

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
            onCreateRevision={handleCreateRevision}
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-success text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
