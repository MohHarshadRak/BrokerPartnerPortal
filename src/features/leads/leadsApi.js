import { apiClient } from '../../services/apiClient'

export const leadsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getLeadsPipeline: builder.query({
      query: () => '/leads/pipeline',
      providesTags: ['Leads'],
    }),
    getLeads: builder.query({
      query: (params) => ({ url: '/leads', params }),
      providesTags: ['Leads'],
    }),
    createLead: builder.mutation({
      query: (lead) => ({ url: '/leads', method: 'POST', body: lead }),
      invalidatesTags: ['Leads'],
    }),
    updateLeadStatus: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/leads/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Leads'],
    }),
  }),
})

export const {
  useGetLeadsPipelineQuery,
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadStatusMutation,
} = leadsApi
