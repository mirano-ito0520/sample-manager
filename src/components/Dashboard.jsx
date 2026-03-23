import { useMemo } from 'react'

function Dashboard({ samples }) {
  const stats = useMemo(() => {
    const notArrived = samples.filter(s => s.status === '未到着').length
    const preparing = samples.filter(s => s.status === '依頼準備中').length
    const arrived = samples.filter(s => s.status === '到着済').length
    const total = samples.length
    return { notArrived, preparing, arrived, total }
  }, [samples])

  const recentSamples = useMemo(() => {
    return samples
      .filter(s => s.status === '未到着' || s.status === '依頼準備中')
      .sort((a, b) => {
        if (!a.requestDate && !b.requestDate) return 0
        if (!a.requestDate) return 1
        if (!b.requestDate) return -1
        return b.requestDate.localeCompare(a.requestDate)
      })
      .slice(0, 10)
  }, [samples])

  const manufacturerSummary = useMemo(() => {
    const map = {}
    samples
      .filter(s => s.status === '未到着')
      .forEach(s => {
        const name = s.manufacturer || '(未設定)'
        map[name] = (map[name] || 0) + 1
      })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
  }, [samples])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Status summary cards */}
      <section>
        <h2 className="text-sm font-medium text-text-sub mb-3">ステータス概要</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-danger-bg border border-danger/20 rounded-xl p-4">
            <div className="text-2xl mb-1">🔴</div>
            <div className="text-danger text-2xl font-bold">{stats.notArrived}</div>
            <div className="text-danger/70 text-sm">未到着</div>
          </div>
          <div className="bg-warn-bg border border-warn/20 rounded-xl p-4">
            <div className="text-2xl mb-1">🟡</div>
            <div className="text-warn text-2xl font-bold">{stats.preparing}</div>
            <div className="text-warn/70 text-sm">依頼準備中</div>
          </div>
          <div className="bg-success-bg border border-success/20 rounded-xl p-4">
            <div className="text-2xl mb-1">🟢</div>
            <div className="text-success text-2xl font-bold">{stats.arrived}</div>
            <div className="text-success/70 text-sm">到着済</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-text-main text-2xl font-bold">{stats.total}</div>
            <div className="text-text-sub text-sm">全サンプル</div>
          </div>
        </div>
      </section>

      {/* Recent samples */}
      <section>
        <h2 className="text-sm font-medium text-text-sub mb-3">
          最近の依頼（未到着・準備中）
        </h2>
        {recentSamples.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center text-text-muted">
            対象のサンプルはありません
          </div>
        ) : (
          <div className="space-y-2">
            {recentSamples.map((sample) => (
              <div
                key={sample.id}
                className="bg-card hover:bg-card-hover rounded-xl p-3 flex items-center gap-3 transition-colors"
              >
                <StatusDot status={sample.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-text-main text-sm font-medium truncate">
                    {sample.sampleName || '(名称なし)'}
                  </div>
                  <div className="text-text-muted text-xs truncate">
                    {sample.manufacturer}
                    {sample.brand ? ` / ${sample.brand}` : ''}
                  </div>
                </div>
                <div className="text-text-muted text-xs whitespace-nowrap">
                  {sample.requestDate || '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Manufacturer summary */}
      {manufacturerSummary.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-sub mb-3">
            メーカー別 未到着数
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {manufacturerSummary.map(([name, count]) => (
              <div
                key={name}
                className="bg-card rounded-xl p-3 flex items-center justify-between"
              >
                <span className="text-text-main text-sm truncate mr-2">{name}</span>
                <span className="text-danger font-bold text-sm whitespace-nowrap">
                  {count}件
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatusDot({ status }) {
  const color = status === '未到着'
    ? 'bg-danger'
    : status === '依頼準備中'
    ? 'bg-warn'
    : 'bg-success'

  return <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
}

export default Dashboard
