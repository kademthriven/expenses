import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import authReducer from './store/authSlice'
import expensesReducer from './store/expensesSlice'
import themeReducer from './store/themeSlice'

function renderApp() {
  const store = configureStore({
    reducer: combineReducers({
      auth: authReducer,
      expenses: expensesReducer,
      theme: themeReducer,
    }),
  })

  return render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
}

describe('App authentication screen', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('renders the account creation screen', async () => {
    renderApp()

    expect(await screen.findByText('Create your account')).toBeInTheDocument()
  })

  it('switches from signup to login when the user clicks Log in', async () => {
    const user = userEvent.setup()
    renderApp()

    await screen.findByText('Create your account')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})
