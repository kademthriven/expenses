import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isLoggedIn: false,
  isLoading: true,
  bearerToken: null,
  userId: null,
  email: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.isLoggedIn = true
      state.isLoading = false
      state.bearerToken = action.payload.bearerToken
      state.userId = action.payload.userId
      state.email = action.payload.email
    },
    clearCredentials() {
      return { ...initialState, isLoading: false }
    },
  },
})

export const { clearCredentials, setCredentials } = authSlice.actions
export const selectAuth = (state) => state.auth
export default authSlice.reducer
