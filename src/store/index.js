import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import expensesReducer from './expensesSlice'
import themeReducer from './themeSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  expenses: expensesReducer,
  theme: themeReducer,
})

const store = configureStore({ reducer: rootReducer })

export default store
