import { apiClient } from '../../services/apiClient'

export const dashboardApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: () => '/dashboard/summary',
      providesTags: ['Dashboard'],
    }),
    getInventoryFeed: builder.query({
      query: (params) => ({ url: '/dashboard/inventory', params }),
      providesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetDashboardSummaryQuery, useGetInventoryFeedQuery } = dashboardApi
