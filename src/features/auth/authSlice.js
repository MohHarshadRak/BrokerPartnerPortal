import { createSlice } from '@reduxjs/toolkit'

const storedUser = localStorage.getItem('broker_user')

const initialState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: localStorage.getItem('broker_token') || null,
  isAuthenticated: Boolean(localStorage.getItem('broker_token')),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload
      state.user = user
      state.token = token
      state.isAuthenticated = true
      localStorage.setItem('broker_user', JSON.stringify(user))
      localStorage.setItem('broker_token', token)
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('broker_user')
      localStorage.removeItem('broker_token')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
