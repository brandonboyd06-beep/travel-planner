/* eslint-disable react-refresh/only-export-components */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

const subscribe = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname, () => '/')
}

export function navigate(href: string, replace = false) {
  if (replace) window.history.replaceState({}, '', href)
  else window.history.pushState({}, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'instant' })
}

export function AppLink({ href, exact = false, className = '', onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; exact?: boolean }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }
  return <a href={href} className={`${className} ${active ? 'active' : ''}`.trim()} onClick={handleClick} {...props} />
}
