import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h atrás` : `${Math.floor(hrs / 24)}d atrás`
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
