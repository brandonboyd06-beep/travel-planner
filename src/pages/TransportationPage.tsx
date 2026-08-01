import { Bus, Car, CheckCircle2, ExternalLink, Fuel, MapPinned, ShieldAlert } from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { AlertBanner, ExternalLinkButton, StatusPill } from '../components/ui'
import { transportation } from '../data/transportation'
import { officialLinks } from '../data/trip'

export function TransportationPage() {
  return (
    <>
      <PageHeader title="Transportation & shuttles" subtitle="One larger Avis vehicle, plus required lake transportation" />
      <AlertBanner><strong>Moraine Lake:</strong><span> normal private vehicle access is not permitted. The 2026 reservation window and final October schedule must be verified.</span></AlertBanner>
      <section className="transport-grid">
        {transportation.map((item, index) => <article className="transport-card" key={item.title}><div className="transport-icon">{index === 1 ? <Bus /> : index === 4 ? <Fuel /> : <Car />}</div><div className="transport-copy"><div><span>{item.mode}</span><h2>{item.title}</h2></div><p>{item.summary}</p><ul>{item.steps.map((step) => <li key={step}><CheckCircle2 />{step}</li>)}</ul></div><aside><StatusPill tone={item.status === 'Ready to book' ? 'green' : item.status === 'Researching' ? 'amber' : 'gray'}>{item.status}</StatusPill><a href={item.link} target="_blank" rel="noopener noreferrer">Official source<ExternalLink size={14} /></a></aside></article>)}
      </section>
      <section className="panel official-links"><SectionHeading title="Official planning sources" /><div><ExternalLinkButton href={officialLinks.parksTransit}>Parks Canada lake transit</ExternalLinkButton><ExternalLinkButton href={officialLinks.roam}>Roam reservations</ExternalLinkButton><ExternalLinkButton href={officialLinks.gondola}>Banff Gondola</ExternalLinkButton><ExternalLinkButton href={officialLinks.minnewanka}>Lake Minnewanka Cruise</ExternalLinkButton><ExternalLinkButton href={officialLinks.icefield}>Columbia Icefield</ExternalLinkButton><ExternalLinkButton href={officialLinks.road}>Alberta 511</ExternalLinkButton><ExternalLinkButton href={officialLinks.trails}>Trail bulletins</ExternalLinkButton></div></section>
      <div className="safety-strip"><ShieldAlert /><div><strong>Remote-driving rule</strong><span>For the Icefields Parkway: full tank, layers, food, water, offline maps, and a same-day road check.</span></div><MapPinned /></div>
    </>
  )
}
