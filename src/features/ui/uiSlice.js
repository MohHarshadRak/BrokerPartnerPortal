import { createSlice } from '@reduxjs/toolkit'

// Tracks whether the last API call couldn't reach the server at all (RTK Query's FETCH_ERROR —
// no HTTP response, as opposed to a 401/500 the server actually returned). Drives the global
// "Can't reach the server" banner in PortalLayout, since without this a failed query on a page
// like Search just silently shows an empty result with no indication why.
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    serverUnreachable: false,
  },
  reducers: {
    setServerUnreachable: (state, action) => {
      state.serverUnreachable = action.payload
    },
  },
})

export const { setServerUnreachable } = uiSlice.actions
export default uiSlice.reducer
