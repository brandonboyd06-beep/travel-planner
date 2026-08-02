import { useMemo } from 'react'
import { Download, RotateCcw, WalletCards } from 'lucide-react'
import { PageHeader } from '../components/AppShell'
import { AlertBanner, Button } from '../components/ui'
import { useCollaboration } from '../context/collaboration'
import { useLocalStorage } from '../hooks/useLocalStorage'

const defaults: Record<string, number> = { Lodging: 6800, 'Rental vehicle': 780, Fuel: 300, 'Park pass': 180, Shuttles: 220, Attractions: 800, Restaurants: 1900, Groceries: 350, Parking: 180, Miscellaneous: 300 }
const colors = ['#1467d8', '#0e7490', '#168a63', '#64748b', '#7c3aed', '#d97706', '#d94f70', '#84a21d', '#475569', '#94a3b8']

export function BudgetPage() {
  const { trip } = useCollaboration()
  const canEdit = trip?.role !== 'viewer'
  const [values, setValues] = useLocalStorage('budget-estimates', defaults)
  const safeValues = useMemo(() => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number.isFinite(value) && value >= 0 ? value : 0])), [values])
  const total = useMemo(() => Object.values(safeValues).reduce((sum, value) => sum + value, 0), [safeValues])
  const lodging = safeValues.Lodging ?? 0
  const percent = (value: number) => total > 0 ? Math.round((value / total) * 100) : 0
  const exportCsv = () => {
    const rows = [['Category', 'Estimate (USD)'], ...Object.entries(safeValues), ['Total', total]]
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'banff-2026-budget.csv'; anchor.click(); URL.revokeObjectURL(url)
  }
  return (
    <>
      <PageHeader title="Budget & expenses" subtitle={canEdit ? 'Editable planning estimates · no confirmed spending' : 'View-only shared estimates · no confirmed spending'} actions={<><Button className="secondary" disabled={!canEdit} onClick={() => { if (window.confirm('Reset every budget estimate to the starting numbers?')) setValues(defaults) }}><RotateCcw size={15} />Reset</Button><Button className="primary" onClick={exportCsv}><Download size={15} />Export CSV</Button></>} />
      <AlertBanner tone="info"><strong>Planning estimates only.</strong><span> Lodging has a firm $8,000 cap; other categories are working estimates for four adults.</span></AlertBanner>
      <div className="budget-summary"><article><span>Total trip estimate</span><strong>${total.toLocaleString()}</strong><small>${Math.round(total / 4).toLocaleString()} per person</small></article><article><span>Lodging estimate</span><strong>${lodging.toLocaleString()}</strong><small>{lodging <= 8000 ? `$${(8000 - lodging).toLocaleString()} below cap` : `$${(lodging - 8000).toLocaleString()} above cap`}</small></article><article><span>Non-lodging estimate</span><strong>${(total - lodging).toLocaleString()}</strong><small>Editable and unconfirmed</small></article></div>
      <div className="budget-layout"><section className="panel budget-editor"><div className="section-title-inline"><WalletCards /><div><h2>Category estimates</h2><p>{canEdit ? 'Saved automatically for this trip' : 'An owner or editor can change these'}</p></div></div>{Object.entries(safeValues).map(([category, value], index) => <label key={category}><span><i style={{ background: colors[index] }} />{category}</span><div><b>$</b><input aria-label={`${category} estimate`} type="number" min="0" value={value} disabled={!canEdit} onChange={(event) => setValues((current) => ({ ...current, [category]: Math.max(0, Number(event.target.value) || 0) }))} /></div></label>)}</section><section className="panel budget-chart"><h2>Category breakdown</h2><p>Relative share of the current total</p><div className="bar-chart">{Object.entries(safeValues).map(([category, value], index) => <div key={category}><span>{category}</span><div><i style={{ width: `${total > 0 ? Math.max((value / total) * 100, value > 0 ? 1 : 0) : 0}%`, background: colors[index] }} /></div><b>{percent(value)}%</b></div>)}</div><div className="chart-total"><span>Current total</span><strong>${total.toLocaleString()}</strong></div></section></div>
    </>
  )
}
