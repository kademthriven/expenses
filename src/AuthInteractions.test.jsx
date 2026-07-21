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

async function renderSignupScreen() {
  renderApp()
  await screen.findByRole('heading', { name: 'Create your account' })
}

async function openLoginScreen(user) {
  await renderSignupScreen()
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('authentication user interactions and connected forms', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('keeps account creation disabled while required fields are empty', async () => {
    await renderSignupScreen()

    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  it('enables account creation after valid matching details are entered', async () => {
    const user = userEvent.setup()
    await renderSignupScreen()

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.type(screen.getByLabelText('Confirm password'), 'secret1')

    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('shows an error and disables submission when passwords do not match', async () => {
    const user = userEvent.setup()
    await renderSignupScreen()

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.type(screen.getByLabelText('Confirm password'), 'different')

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled()
  })

  it('removes the password mismatch error after the confirmation is corrected', async () => {
    const user = userEvent.setup()
    await renderSignupScreen()
    const confirmationInput = screen.getByLabelText('Confirm password')

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret1')
    await user.type(confirmationInput, 'different')
    await user.clear(confirmationInput)
    await user.type(confirmationInput, 'secret1')

    expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  it('shows login controls and removes confirmation controls in login mode', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)

    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument()
  })

  it('returns from login mode to account creation mode', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)

    await user.click(screen.getByRole('button', { name: 'Create an account' }))

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  })

  it('opens the password reset child form from login mode', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument()
  })

  it('passes the entered login email to the password reset child form', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)

    await user.type(screen.getByLabelText('Email'), 'person@example.com')
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))

    expect(screen.getByLabelText('Email')).toHaveValue('person@example.com')
  })

  it('shows reset validation feedback for an invalid email address', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))

    await user.type(screen.getByLabelText('Email'), 'invalid-email')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.')
  })

  it('returns from the password reset child form to login mode', async () => {
    const user = userEvent.setup()
    await openLoginScreen(user)
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reset your password' })).not.toBeInTheDocument()
  })
})
