import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import {
  createFirebaseExpense,
  deleteFirebaseExpense,
  getFirebaseExpenses,
  updateFirebaseExpense,
} from '../firebase'

const PREMIUM_THRESHOLD = 10000

function readableExpenseError(error) {
  if (error?.name === 'TypeError') {
    return 'We could not reach Firebase. Check your connection and try again.'
  }

  if (error?.code === 401 || error?.code === 403) {
    return 'Firebase denied access to your expenses. Check the Realtime Database security rules and try again.'
  }

  if (error?.code === 404) {
    return 'The Firebase Realtime Database could not be found. Check VITE_FIREBASE_DATABASE_URL and try again.'
  }

  if (error?.code === 429) {
    return 'Firebase received too many requests. Wait a moment and try again.'
  }

  return error?.message ?? 'Firebase could not process your expenses. Please try again.'
}

function getAuthentication(getState) {
  const { bearerToken, userId } = getState().auth

  if (!bearerToken || !userId) {
    throw new Error('Your session is no longer valid. Please log in again.')
  }

  return { bearerToken, userId }
}

function normalizeExpense(expense) {
  const amount = Number(expense.amount)
  const addedAt = new Date(expense.addedAt)

  if (
    !Number.isFinite(amount)
    || typeof expense.description !== 'string'
    || typeof expense.category !== 'string'
    || Number.isNaN(addedAt.getTime())
  ) {
    return null
  }

  return {
    ...expense,
    amount,
    addedAt: addedAt.toISOString(),
  }
}

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchExpenses',
  async (_, { getState, rejectWithValue }) => {
    try {
      const authentication = getAuthentication(getState)
      const expenses = await getFirebaseExpenses(authentication)
      return expenses.map(normalizeExpense).filter(Boolean)
    } catch (error) {
      return rejectWithValue(readableExpenseError(error))
    }
  },
  {
    condition: (_, { getState }) => getState().expenses.loadStatus !== 'loading',
  },
)

export const addExpense = createAsyncThunk(
  'expenses/addExpense',
  async (expense, { getState, rejectWithValue }) => {
    try {
      const savedExpense = await createFirebaseExpense(getAuthentication(getState), expense)
      return normalizeExpense(savedExpense)
    } catch (error) {
      return rejectWithValue(readableExpenseError(error))
    }
  },
)

export const editExpense = createAsyncThunk(
  'expenses/editExpense',
  async ({ expenseId, expense }, { getState, rejectWithValue }) => {
    try {
      const updatedExpense = await updateFirebaseExpense(
        getAuthentication(getState),
        expenseId,
        expense,
      )
      return normalizeExpense(updatedExpense)
    } catch (error) {
      return rejectWithValue(readableExpenseError(error))
    }
  },
)

export const removeExpense = createAsyncThunk(
  'expenses/removeExpense',
  async (expenseId, { getState, rejectWithValue }) => {
    try {
      await deleteFirebaseExpense(getAuthentication(getState), expenseId)
      return expenseId
    } catch (error) {
      return rejectWithValue(readableExpenseError(error))
    }
  },
)

const initialState = {
  items: [],
  loadStatus: 'idle',
  saveStatus: 'idle',
  updateStatus: 'idle',
  deletingId: null,
  loadError: null,
  saveError: null,
  actionError: null,
}

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    clearExpenseErrors(state) {
      state.saveError = null
      state.actionError = null
    },
    resetExpenses() {
      return initialState
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loadStatus = 'loading'
        state.loadError = null
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loadStatus = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loadStatus = 'failed'
        state.loadError = action.payload ?? action.error.message
      })
      .addCase(addExpense.pending, (state) => {
        state.saveStatus = 'loading'
        state.saveError = null
      })
      .addCase(addExpense.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded'
        state.items.unshift(action.payload)
      })
      .addCase(addExpense.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload ?? action.error.message
      })
      .addCase(editExpense.pending, (state) => {
        state.updateStatus = 'loading'
        state.actionError = null
      })
      .addCase(editExpense.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded'
        const expenseIndex = state.items.findIndex((expense) => expense.id === action.payload.id)
        if (expenseIndex !== -1) state.items[expenseIndex] = action.payload
      })
      .addCase(editExpense.rejected, (state, action) => {
        state.updateStatus = 'failed'
        state.actionError = action.payload ?? action.error.message
      })
      .addCase(removeExpense.pending, (state, action) => {
        state.deletingId = action.meta.arg
        state.actionError = null
      })
      .addCase(removeExpense.fulfilled, (state, action) => {
        state.deletingId = null
        state.items = state.items.filter((expense) => expense.id !== action.payload)
      })
      .addCase(removeExpense.rejected, (state, action) => {
        state.deletingId = null
        state.actionError = action.payload ?? action.error.message
      })
  },
})

export const { clearExpenseErrors, resetExpenses } = expensesSlice.actions
export const selectExpensesState = (state) => state.expenses
export const selectTotalSpent = createSelector(
  [(state) => state.expenses.items],
  (expenses) => expenses.reduce((total, expense) => total + expense.amount, 0),
)
export const selectCanActivatePremium = createSelector(
  [selectTotalSpent],
  (totalSpent) => totalSpent > PREMIUM_THRESHOLD,
)
export default expensesSlice.reducer
