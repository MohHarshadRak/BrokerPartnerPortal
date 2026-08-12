import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../features/auth/authSlice'
import { setServerUnreachable } from '../features/ui/uiSlice'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    // Some endpoints (getNationalityList, getStaffList, checkBrokerEmail — the anonymous
    // temp-token pattern used pre-login) explicitly set their own Authorization header.
    // Don't clobber it with the logged-in user's token when one's already present.
    if (headers.has('Authorization')) {
      return headers
    }
    const token = getState().auth.token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return headers
  },
})

// A 401 from any endpoint means the broker's session is no longer valid (expired/invalid JWT)
// — log them out so ProtectedRoute's own isAuthenticated check redirects to the login page
// automatically, same as clicking "Log out" manually, instead of leaving them stuck on a page
// where every subsequent request silently fails. Harmless no-op on a failed login attempt
// itself (also a 401) since there's no session to clear at that point anyway.
// FETCH_ERROR means the request never got an HTTP response at all (server down, no network) —
// distinct from a 401/500 the server actually returned. Drives the global "Can't reach the
// server" banner; cleared as soon as any request succeeds again.
const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.error?.status === 401) {
    api.dispatch(logout())
  }
  api.dispatch(setServerUnreachable(result.error?.status === 'FETCH_ERROR'))
  return result
}

export const apiClient = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard', 'Projects', 'Leads', 'Bookings', 'Commissions', 'Lookups'],
  endpoints: () => ({}),
})
