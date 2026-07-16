import { configureStore } from '@reduxjs/toolkit'
import { apiClient } from '../services/apiClient'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiClient.reducerPath]: apiClient.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiClient.middleware),
})
