import type { ReactElement } from 'react'
import homeSprite from '../assets/navigation/blue-pottery/home.png?inline'
import readSprite from '../assets/navigation/blue-pottery/read.png?inline'
import savedSprite from '../assets/navigation/blue-pottery/saved.png?inline'
import moreSprite from '../assets/navigation/blue-pottery/more.png?inline'

export type NavigationGlyphProps = { active: boolean }
type NavigationGlyph = (props: NavigationGlyphProps) => ReactElement

// Tiny inlined assets travel with the cached app shell, so all four remain
// available offline. Their colours stay consistent in both themes and states;
// the link's label and top marker identify the selected destination.
function NavigationSprite({ src }: { src: string }) {
  return <img src={src} width={36} height={36} alt="" aria-hidden="true" draggable={false} />
}

export const NavHomeGlyph: NavigationGlyph = () => <NavigationSprite src={homeSprite} />
export const NavReadGlyph: NavigationGlyph = () => <NavigationSprite src={readSprite} />
export const NavSavedGlyph: NavigationGlyph = () => <NavigationSprite src={savedSprite} />
export const NavMoreGlyph: NavigationGlyph = () => <NavigationSprite src={moreSprite} />
