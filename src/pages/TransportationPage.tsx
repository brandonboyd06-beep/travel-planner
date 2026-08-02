import { useState } from 'react'
import { Bus, CalendarCheck2, Car, CheckCircle2, ExternalLink, Fuel, MapPinned, ShieldAlert } from 'lucide-react'
import { PageHeader, SectionHeading } from '../components/AppShell'
import { AppLink } from '../components/AppLink'
import { AlertBanner, ExternalLinkButton, SeeMoreButton, StatusPill } from '../components/ui'
import { useItinerary } from '../context/itinerary'
import { transportation } from '../data/transportation'
import { officialLinks } from '../data/trip'
import { getTransportationResearchGap, itineraryIncludes, summarizeItinerary } from '../lib/itinerarySummary'

export function TransportationPage() {
  const { plan } = useItinerary()
  const itinerarySummary = summarizeItinerary(plan)
  const researchGap = getTransportationResearchGap(plan)
  const visitsMoraineLake = itineraryIncludes(plan, ['Moraine Lake'])
  const usesIcefieldsParkway = itineraryIncludes(plan, ['Icefields Parkway', 'Columbia Icefield', 'Bow Lake', 'Peyto Lake', 'Waterfowl Lakes', 'Mistaya Canyon'])
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? transportation : transportation.slice(0, 4)
  return (
    <>
      <PageHeader title="Transportation & shuttles" subtitle={`Current route: ${itinerarySummary.baseSummary} · Revision ${plan.revision}`} actions={<AppLink className="button primary" href="/book"><CalendarCheck2 size={16} />Open booking center</AppLink>} />
      {researchGap.changed ? <AlertBanner><strong>Transportation research needs a fresh review for itinerary Revision {plan.revision}.</strong><span> The current route changed beyond the original Banff/Canmore plan. {researchGap.addedStops.length > 0 ? `New or changed travel stops include ${researchGap.addedStops.slice(0, 3).join(', ')}. ` : ''}The cards below remain official-source research, but may not cover every drive, shuttle, parking rule, or reservation now required. </span><AppLink className="text-link" href="/itinerary">Review the current route</AppLink></AlertBanner> : null}
      {visitsMoraineLake ? <AlertBanner><strong>Moraine Lake:</strong><span> normal private vehicle access is not permitted. Compare both official shuttle options—and the itinerary-matched date—in the booking center.</span></AlertBanner> : null}
      <section className="transport-grid">
        {displayed.map((item, index) => <article className="transport-card" key={item.title}><div className="transport-icon">{index === 1 ? <Bus /> : item.title === 'Icefields Parkway' ? <Fuel /> : <Car />}</div><div className="transport-copy"><div><span>{item.mode}</span><h2>{item.title}</h2></div><p>{item.summary}</p><ul>{item.steps.map((step) => <li key={step}><CheckCircle2 />{step}</li>)}</ul></div><aside><StatusPill tone={item.status === 'Ready to book' ? 'green' : item.status === 'Researching' ? 'amber' : 'gray'}>{item.status}</StatusPill><a href={item.link} target="_blank" rel="noopener noreferrer">Official source<ExternalLink size={14} /></a></aside></article>)}
      </section>
      <SeeMoreButton expanded={showAll} onClick={() => setShowAll((value) => !value)} count={transportation.length - 4} moreLabel="See more transportation options" lessLabel="See fewer transportation options" />
      <section className="panel official-links"><SectionHeading title="Official planning sources" /><div><ExternalLinkButton href={officialLinks.parksTransit}>Parks Canada lake transit</ExternalLinkButton><ExternalLinkButton href={officialLinks.roam}>Roam reservations</ExternalLinkButton><ExternalLinkButton href={officialLinks.gondola}>Banff Gondola</ExternalLinkButton><ExternalLinkButton href={officialLinks.minnewanka}>Lake Minnewanka Cruise</ExternalLinkButton><ExternalLinkButton href={officialLinks.icefield}>Columbia Icefield</ExternalLinkButton><ExternalLinkButton href={officialLinks.road}>Alberta 511</ExternalLinkButton><ExternalLinkButton href={officialLinks.trails}>Trail bulletins</ExternalLinkButton></div></section>
      {usesIcefieldsParkway ? <div className="safety-strip"><ShieldAlert /><div><strong>Remote-driving rule</strong><span>For the Icefields Parkway: full tank, layers, food, water, offline maps, and a same-day road check.</span></div><MapPinned /></div> : null}
    </>
  )
}
