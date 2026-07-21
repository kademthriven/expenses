import { describe, expect, it } from 'vitest'
import themeReducer, { activatePremium, toggleTheme } from './themeSlice'

describe('theme reducer', () => {
  it('starts in light mode with premium locked', () => {
    expect(themeReducer(undefined, { type: 'unknown' })).toEqual({
      mode: 'light',
      isPremiumActivated: false,
    })
  })

  it('activates premium and enables dark mode', () => {
    expect(themeReducer(undefined, activatePremium())).toEqual({
      mode: 'dark',
      isPremiumActivated: true,
    })
  })

  it('toggles themes only after premium is activated', () => {
    const lockedState = themeReducer(undefined, toggleTheme())
    const premiumState = themeReducer(lockedState, activatePremium())

    expect(lockedState.mode).toBe('light')
    expect(themeReducer(premiumState, toggleTheme()).mode).toBe('light')
  })
})
