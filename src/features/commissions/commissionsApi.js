import { apiClient } from '../../services/apiClient'

export const commissionsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getCommissionsSummary: builder.query({
      query: () => '/commissions/summary',
      providesTags: ['Commissions'],
    }),
    getCommissions: builder.query({
      query: (params) => ({ url: '/commissions', params }),
      providesTags: ['Commissions'],
    }),
    submitInvoice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/commissions/${id}/invoice`, method: 'POST', body }),
      invalidatesTags: ['Commissions'],
    }),
  }),
})

export const {
  useGetCommissionsSummaryQuery,
  useGetCommissionsQuery,
  useSubmitInvoiceMutation,
} = commissionsApi
