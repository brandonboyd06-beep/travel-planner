/* eslint-disable react-refresh/only-export-components */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

let hashScrollGeneration = 0

export function scrollToHashWhenReady(hash = window.location.hash) {
  const generation = ++hashScrollGeneration
  if (!hash) return
  let id = ''
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''))
  } catch {
    return
  }
  if (!id) return

  let attempts = 0
  const findTarget = () => {
    if (generation !== hashScrollGeneration) return
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ block: 'start' })
      return
    }
    attempts += 1
    if (attempts < 40) window.setTimeout(findTarget, 50)
  }
  window.requestAnimationFrame(findTarget)
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => '/')
}

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function navigate(href: string, replace = false) {
  if (replace) window.history.replaceState({}, '', href)
  else window.history.pushState({}, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
  const hash = new URL(href, window.location.origin).hash
  if (hash) {
    scrollToHashWhenReady(hash)
  } else {
    hashScrollGeneration += 1
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

export function AppLink({ href, exact = false, className = '', onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; exact?: boolean }) {
  const pathname = normalizePathname(usePathname())
  const targetPathname = normalizePathname(href.split(/[?#]/, 1)[0] || '/')
  const active = exact
    ? pathname === targetPathname
    : pathname === targetPathname || (targetPathname !== '/' && pathname.startsWith(`${targetPathname}/`))
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || (props.target && props.target !== '_self')
      || props.download
    ) return
    event.preventDefault()
    navigate(href)
  }
  return <a {...props} href={href} className={`${className} ${active ? 'active' : ''}`.trim()} aria-current={active ? 'page' : undefined} onClick={handleClick} />
}
