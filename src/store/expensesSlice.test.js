import { describe, expect, it } from 'vitest'
import expensesReducer, {
  fetchExpenses,
  resetExpenses,
  selectCanActivatePremium,
  selectTotalSpent,
} from './expensesSlice'

const expenses = [
  {
    id: 'expense-1',
    amount: 4500,
    description: 'Rent',
    category: 'bills',
    addedAt: '2026-07-21T10:00:00.000Z',
  },
  {
    id: 'expense-2',
    amount: 5500,
    description: 'Groceries',
    category: 'food',
    addedAt: '2026-07-21T11:00:00.000Z',
  },
]

describe('expenses reducer and selectors', () => {
  it('calculates the total amount from all stored expenses', () => {
    expect(selectTotalSpent({ expenses: { items: expenses } })).toBe(10000)
  })

  it('unlocks premium at ₹10,000 but not below the threshold', () => {
    expect(selectCanActivatePremium({ expenses: { items: expenses } })).toBe(true)
    expect(selectCanActivatePremium({
      expenses: { items: [{ ...expenses[0], amount: 9999.99 }] },
    })).toBe(false)
  })

  it('stores fetched expenses and can reset them', () => {
    const loadedState = expensesReducer(
      undefined,
      fetchExpenses.fulfilled(expenses, 'request-id'),
    )

    expect(loadedState.items).toEqual(expenses)
    expect(loadedState.loadStatus).toBe('succeeded')
    expect(expensesReducer(loadedState, resetExpenses()).items).toEqual([])
  })
})
