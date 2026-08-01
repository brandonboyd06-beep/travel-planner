import { useMemo, useState } from 'react'
import { Car, Check, CookingPot, ExternalLink, Heart, MapPin, Waves } from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { LodgingCalculator } from '../components/LodgingCalculator'
import { AlertBanner, Button, StatusPill } from '../components/ui'
import { lodging } from '../data/lodging'
import { useLocalStorage } from '../hooks/useLocalStorage'

const tabs = ['Recommended', 'Banff hotels', 'Banff rentals', 'Canmore hotels', 'Canmore rentals', 'Split-stay scenarios']

export function LodgingPage() {
  const [tab, setTab] = useState('Recommended')
  const [preferred, setPreferred] = useLocalStorage<string>('preferred-lodging', '')
  const filtered = useMemo(() => {
    if (tab === 'Recommended') return lodging.filter((item) => item.recommended)
    if (tab === 'Split-stay scenarios') return lodging.filter((item) => item.recommended)
    const [town, type] = tab.split(' ')
    return lodging.filter((item) => item.town === town && (type === 'hotels' ? item.type === 'Hotel' : item.type === 'Condo / rental'))
  }, [tab])
  return (
    <>
      <PageHeader title="Lodging comparison" subtitle="A four-night Banff + three-night Canmore split is the leading strategy" />
      <div className="budget-hero"><div><span>Maximum lodging budget</span><strong>$8,000</strong><small>$2,000 per traveler · seven nights</small></div><div className="strategy-line"><div><b>4 nights</b><span>Banff</span></div><i /><div><b>3 nights</b><span>Canmore</span></div><p>Only one hotel change</p></div></div>
      <AlertBanner><strong>Research snapshot only.</strong><span> Rates, taxes, fees, and inventory are not guaranteed. Use “Verify direct price” before booking.</span></AlertBanner>
      <div className="filter-bar" role="tablist" aria-label="Lodging filters">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
      <section className="lodging-list">
        {filtered.map((item) => (
          <article className={`lodging-card ${preferred === item.id ? 'selected' : ''}`} key={item.id}>
            <div className="lodging-main"><div className="property-heading"><div><span>{item.town} · {item.type}</span><h2>{item.name}</h2></div><div className="score"><strong>{item.score}</strong><span>review score</span></div></div><div className="property-price"><strong>${item.price}<small>/ avg night</small></strong><span>${item.total.toLocaleString()} estimated segment</span></div><div className="amenity-row"><span><MapPin />{item.walkability}</span><span><Car />{item.parking}</span><span><CookingPot />{item.kitchen}</span><span><Waves />{item.amenities}</span></div><div className="pros-cons"><div><strong>Why it works</strong>{item.pros.map((pro) => <span key={pro}><Check />{pro}</span>)}</div><div><strong>Watch-outs</strong>{item.cons.map((con) => <span key={con}>— {con}</span>)}</div></div></div>
            <aside className="lodging-meta"><StatusPill tone={item.recommended ? 'green' : 'gray'}>{item.recommended ? 'Recommended' : item.transit}</StatusPill><p><strong>Loyalty</strong>{item.loyalty}</p><p><strong>Configuration</strong>{item.rooms}</p><p><strong>Last checked</strong>{item.lastChecked}</p><small>Taxes and fees: verify directly</small><a className="button secondary" href={item.url} target="_blank" rel="noopener noreferrer">Verify direct price<ExternalLink size={14} /></a><Button className={preferred === item.id ? 'primary' : 'ghost'} onClick={() => setPreferred(preferred === item.id ? '' : item.id)}><Heart size={15} fill={preferred === item.id ? 'currentColor' : 'none'} />{preferred === item.id ? 'Preferred stay' : 'Mark preferred'}</Button></aside>
          </article>
        ))}
      </section>
      <section className="scenario-section"><SectionHeading title="Scenario snapshot" /><div className="scenario-grid"><article><span>Scenario A · recommended</span><strong>$6,810</strong><p>4 Banff hotel nights, 3 rooms + 3 Canmore rental nights</p><StatusPill tone="green">$1,190 under cap</StatusPill></article><article><span>Scenario B</span><strong>$7,866</strong><p>7 central Banff nights, 3 rooms at a target $325 average</p><StatusPill tone="amber">Little fee buffer</StatusPill></article><article><span>Scenario C</span><strong>$4,250</strong><p>7 nights in one central Canmore three-bedroom rental</p><StatusPill tone="blue">Best value</StatusPill></article></div></section>
      <LodgingCalculator />
    </>
  )
}
