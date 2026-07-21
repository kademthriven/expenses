import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  mode: 'light',
  isPremiumActivated: false,
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    activatePremium(state) {
      state.isPremiumActivated = true
      state.mode = 'dark'
    },
    toggleTheme(state) {
      if (!state.isPremiumActivated) return
      state.mode = state.mode === 'light' ? 'dark' : 'light'
    },
    resetTheme() {
      return initialState
    },
  },
})

export const { activatePremium, resetTheme, toggleTheme } = themeSlice.actions
export const selectTheme = (state) => state.theme
export default themeSlice.reducer
