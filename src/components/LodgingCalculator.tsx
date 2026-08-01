import { useMemo, useState } from 'react'
import { Calculator, RotateCcw } from 'lucide-react'
import { Button } from './ui'

const budget = 8000

function Money({ value }: { value: number }) { return <>{value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</> }

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) {
  return <label className="number-field"><span>{label}</span><div><input type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} />{suffix ? <small>{suffix}</small> : null}</div></label>
}

export function LodgingCalculator() {
  const defaults = { rooms: 3, hotelRate: 315, hotelNights: 4, tax: 15, parking: 25, rentalNights: 3, rentalTotal: 1560, cleaning: 180, service: 145 }
  const [values, setValues] = useState(defaults)
  const set = (key: keyof typeof values) => (value: number) => setValues((current) => ({ ...current, [key]: value }))
  const result = useMemo(() => {
    const hotelBase = values.rooms * values.hotelRate * values.hotelNights
    const hotel = hotelBase * (1 + values.tax / 100) + values.parking * values.hotelNights
    const rental = values.rentalTotal + values.cleaning + values.service
    const total = hotel + rental
    return { hotel, rental, total, perPerson: total / 4, remaining: budget - total, effective: total / (values.hotelNights + values.rentalNights) }
  }, [values])
  return (
    <section className="panel calculator-panel">
      <div className="calculator-heading"><div><Calculator /><div><h2>Lodging comparison calculator</h2><p>Default: 4 Banff hotel nights + 3 Canmore rental nights</p></div></div><Button className="ghost" onClick={() => setValues(defaults)}><RotateCcw size={15} />Reset</Button></div>
      <div className="calculator-layout">
        <div className="calc-group"><h3>Banff hotel</h3><NumberField label="Rooms" value={values.rooms} onChange={set('rooms')} /><NumberField label="Nightly room rate" value={values.hotelRate} onChange={set('hotelRate')} suffix="USD" /><NumberField label="Nights" value={values.hotelNights} onChange={set('hotelNights')} /><NumberField label="Taxes & fees" value={values.tax} onChange={set('tax')} suffix="%" /><NumberField label="Parking / night" value={values.parking} onChange={set('parking')} suffix="USD" /></div>
        <div className="calc-group"><h3>Canmore rental</h3><NumberField label="Rental nights" value={values.rentalNights} onChange={set('rentalNights')} /><NumberField label="Rental subtotal" value={values.rentalTotal} onChange={set('rentalTotal')} suffix="USD" /><NumberField label="Cleaning fee" value={values.cleaning} onChange={set('cleaning')} suffix="USD" /><NumberField label="Service fee" value={values.service} onChange={set('service')} suffix="USD" /></div>
        <div className="calc-results"><span>Group total</span><strong><Money value={result.total} /></strong><div className={`budget-delta ${result.remaining < 0 ? 'over' : ''}`}><span>{result.remaining >= 0 ? 'Remaining budget' : 'Over budget'}</span><b><Money value={Math.abs(result.remaining)} /></b></div><dl><div><dt>Hotel portion</dt><dd><Money value={result.hotel} /></dd></div><div><dt>Rental portion</dt><dd><Money value={result.rental} /></dd></div><div><dt>Per person</dt><dd><Money value={result.perPerson} /></dd></div><div><dt>Effective / night</dt><dd><Money value={result.effective} /></dd></div></dl></div>
      </div>
    </section>
  )
}
