import { useState, useEffect, useMemo, useRef } from 'react'

function getToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function SampleForm({ samples, editingSample, onSave, onCancel }) {
  const [manufacturer, setManufacturer] = useState('')
  const [brand, setBrand] = useState('')
  const [projectName, setProjectName] = useState('')
  const [sampleName, setSampleName] = useState('')
  const [requestDetail, setRequestDetail] = useState('')
  const [ingredientNote, setIngredientNote] = useState('')
  const [salesTarget, setSalesTarget] = useState('')
  const [factoryName, setFactoryName] = useState('')
  const [requestDate, setRequestDate] = useState(getToday())
  const [receiveDate, setReceiveDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [ingredientList, setIngredientList] = useState('未')
  const [estimate, setEstimate] = useState('未')
  const [note, setNote] = useState('')
  const [parentId, setParentId] = useState(null)
  const [parentName, setParentName] = useState('')
  const [showParentPicker, setShowParentPicker] = useState(false)
  const [parentSearch, setParentSearch] = useState('')

  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef(null)
  const inputRef = useRef(null)
  const parentPickerRef = useRef(null)

  // Pre-fill on edit
  useEffect(() => {
    if (editingSample) {
      if (editingSample._isRevision) {
        // Creating a revision - pre-fill from parent
        setManufacturer(editingSample.manufacturer || '')
        setBrand(editingSample.brand || '')
        setProjectName(editingSample.projectName || '')
        setSampleName('')
        setRequestDetail('')
        setIngredientNote('')
        setSalesTarget(editingSample.salesTarget || '')
        setFactoryName(editingSample.factoryName || '')
        setRequestDate(getToday())
        setReceiveDate('')
        setQuantity(editingSample.quantity || '')
        setIngredientList('未')
        setEstimate('未')
        setNote('')
        setParentId(editingSample.parentId)
        setParentName(editingSample.parentName || '')
      } else {
        // Normal edit
        setManufacturer(editingSample.manufacturer || '')
        setBrand(editingSample.brand || '')
        setProjectName(editingSample.projectName || '')
        setSampleName(editingSample.sampleName || '')
        setRequestDetail(editingSample.requestDetail || '')
        setIngredientNote(editingSample.ingredientNote || '')
        setSalesTarget(editingSample.salesTarget || '')
        setFactoryName(editingSample.factoryName || '')
        setRequestDate(editingSample.requestDate || '')
        setReceiveDate(editingSample.receiveDate || '')
        setQuantity(editingSample.quantity || '')
        setIngredientList(editingSample.ingredientList || '未')
        setEstimate(editingSample.estimate || '未')
        setNote(editingSample.note || '')
        setParentId(editingSample.parentId || null)
        setParentName('')
        if (editingSample.parentId) {
          const parent = samples.find(s => s.id === editingSample.parentId)
          setParentName(parent ? (parent.sampleName || parent.requestDetail || '(名称なし)') : '(削除済み)')
        }
      }
      setShowParentPicker(false)
      setParentSearch('')
    } else {
      resetForm()
    }
  }, [editingSample, samples])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
      if (
        parentPickerRef.current &&
        !parentPickerRef.current.contains(e.target)
      ) {
        setShowParentPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const uniqueManufacturers = useMemo(() => {
    return [...new Set(samples.map(s => s.manufacturer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples])

  const uniqueBrands = useMemo(() => {
    return [...new Set(samples.map(s => s.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples])

  const uniqueSalesTargets = useMemo(() => {
    return [...new Set(samples.map(s => s.salesTarget).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples])

  const uniqueFactoryNames = useMemo(() => {
    return [...new Set(samples.map(s => s.factoryName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [samples])

  const filteredParentSamples = useMemo(() => {
    if (!parentSearch.trim()) return samples.slice(0, 20)
    const q = parentSearch.trim().toLowerCase()
    return samples.filter(s =>
      (s.sampleName && s.sampleName.toLowerCase().includes(q)) ||
      (s.requestDetail && s.requestDetail.toLowerCase().includes(q)) ||
      (s.brand && s.brand.toLowerCase().includes(q))
    ).slice(0, 20)
  }, [samples, parentSearch])

  const resetForm = () => {
    setManufacturer('')
    setBrand('')
    setProjectName('')
    setSampleName('')
    setRequestDetail('')
    setIngredientNote('')
    setSalesTarget('')
    setFactoryName('')
    setRequestDate(getToday())
    setReceiveDate('')
    setQuantity('')
    setIngredientList('未')
    setEstimate('未')
    setNote('')
    setParentId(null)
    setParentName('')
    setShowParentPicker(false)
    setParentSearch('')
  }

  const handleSampleNameChange = (value) => {
    setSampleName(value)
    if (value.length >= 1) {
      const uniqueNames = [...new Set(samples.map(s => s.sampleName).filter(Boolean))]
      const matches = uniqueNames.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (name) => {
    setSampleName(name)
    setShowSuggestions(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      manufacturer,
      brand,
      projectName,
      sampleName,
      requestDetail,
      ingredientNote,
      salesTarget,
      factoryName,
      requestDate: requestDate || null,
      receiveDate: receiveDate || null,
      quantity,
      ingredientList,
      estimate,
      note,
      parentId: parentId || null,
    }
    onSave(data)
  }

  const inputClass = 'w-full bg-input text-text-main border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted'
  const labelClass = 'block text-sm text-text-sub mb-1'

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text-main">
            {editingSample && editingSample._isRevision
              ? '改良版を登録'
              : editingSample
                ? 'サンプル編集'
                : '新規サンプル登録'}
          </h2>
          {editingSample && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-sub hover:text-text-main hover:border-border-focus transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* お客様 & 依頼先 & 製造元 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>お客様</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                list="brand-list"
                className={inputClass}
                placeholder="お客様名"
              />
              <datalist id="brand-list">
                {uniqueBrands.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>依頼先</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                list="manufacturer-list"
                className={inputClass}
                placeholder="依頼先名"
              />
              <datalist id="manufacturer-list">
                {uniqueManufacturers.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>製造元</label>
              <input
                type="text"
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                list="factory-list"
                className={inputClass}
                placeholder="製造元名"
              />
              <datalist id="factory-list">
                {uniqueFactoryNames.map(f => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Project name */}
          <div>
            <label className={labelClass}>プロジェクト名</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={inputClass}
              placeholder="任意"
            />
          </div>

          {/* Sample name with autocomplete */}
          <div className="relative">
            <label className={labelClass}>サンプル名</label>
            <input
              ref={inputRef}
              type="text"
              value={sampleName}
              onChange={(e) => handleSampleNameChange(e.target.value)}
              onFocus={() => {
                if (sampleName.length >= 1 && suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              className={inputClass}
              placeholder="サンプル名を入力"
            />
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {suggestions.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(name)}
                    className="w-full text-left px-3 py-2 text-sm text-text-main hover:bg-card-hover transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 改良元 (Parent sample) */}
          <div>
            {parentId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg bg-accent-glow text-accent">
                  ← {parentName} の改良版
                </span>
                <button
                  type="button"
                  onClick={() => { setParentId(null); setParentName('') }}
                  className="text-xs text-text-muted hover:text-danger transition-colors"
                >
                  解除
                </button>
              </div>
            ) : (
              <div ref={parentPickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowParentPicker(!showParentPicker)}
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  {showParentPicker ? '▼ 改良元を設定' : '▶ 改良元を設定'}
                </button>
                {showParentPicker && (
                  <div className="mt-2 bg-card border border-border rounded-lg shadow-lg p-2">
                    <input
                      type="text"
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      placeholder="サンプル名で検索..."
                      className="w-full bg-input text-text-main border border-border rounded-lg px-3 py-1.5 text-xs placeholder:text-text-muted mb-2"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {filteredParentSamples.length === 0 ? (
                        <div className="text-xs text-text-muted py-2 text-center">該当なし</div>
                      ) : (
                        filteredParentSamples.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setParentId(s.id)
                              setParentName(s.sampleName || s.requestDetail || '(名称なし)')
                              setShowParentPicker(false)
                              setParentSearch('')
                            }}
                            className="w-full text-left px-2 py-1.5 text-xs text-text-main hover:bg-card-hover rounded transition-colors"
                          >
                            <span className="font-medium">{s.sampleName || '(名称なし)'}</span>
                            {s.brand && <span className="text-text-muted ml-2">/ {s.brand}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Request detail */}
          <div>
            <label className={labelClass}>依頼内容</label>
            <textarea
              value={requestDetail}
              onChange={(e) => setRequestDetail(e.target.value)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="依頼内容を入力"
            />
          </div>

          {/* Ingredient note */}
          <div>
            <label className={labelClass}>成分メモ</label>
            <input
              type="text"
              value={ingredientNote}
              onChange={(e) => setIngredientNote(e.target.value)}
              className={inputClass}
              placeholder="任意"
            />
          </div>

          {/* Sales target */}
          <div>
            <label className={labelClass}>販売先</label>
            <input
              type="text"
              value={salesTarget}
              onChange={(e) => setSalesTarget(e.target.value)}
              list="sales-target-list"
              className={inputClass}
              placeholder="任意"
            />
            <datalist id="sales-target-list">
              {uniqueSalesTargets.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>依頼日</label>
              <input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>受取日</label>
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className={labelClass}>本数</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
              placeholder="数量を入力"
            />
          </div>

          {/* Ingredient list & Estimate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>全成分表示</label>
              <select
                value={ingredientList}
                onChange={(e) => setIngredientList(e.target.value)}
                className={inputClass}
              >
                <option value="未">未</option>
                <option value="有">有</option>
                <option value="依頼中">依頼中</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>見積</label>
              <select
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className={inputClass}
              >
                <option value="未">未</option>
                <option value="有">有</option>
                <option value="依頼中">依頼中</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={labelClass}>備考</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className={inputClass + ' resize-none'}
              placeholder="備考を入力"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-3 rounded-lg transition-colors text-sm"
            >
              {editingSample ? '更新' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SampleForm
