import { configureStore } from '@reduxjs/toolkit'
import { apiClient } from '../services/apiClient'
import authReducer from '../features/auth/authSlice'
import uiReducer from '../features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [apiClient.reducerPath]: apiClient.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiClient.middleware),
})
