import { apiClient } from '../../services/apiClient'

export const bookingsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getBookingsSummary: builder.query({
      query: () => '/bookings/summary',
      providesTags: ['Bookings'],
    }),
    getBookings: builder.query({
      query: (params) => ({ url: '/bookings', params }),
      providesTags: ['Bookings'],
    }),
    createBooking: builder.mutation({
      query: (booking) => ({ url: '/bookings', method: 'POST', body: booking }),
      invalidatesTags: ['Bookings'],
    }),
    updateBookingStatus: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/bookings/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Bookings'],
    }),
  }),
})

export const {
  useGetBookingsSummaryQuery,
  useGetBookingsQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
} = bookingsApi
