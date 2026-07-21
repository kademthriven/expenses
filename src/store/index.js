import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import expensesReducer from './expensesSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  expenses: expensesReducer,
})

const store = configureStore({ reducer: rootReducer })

export default store
