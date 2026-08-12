import { apiClient } from '../../services/apiClient'

export const leadsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getLeadsPipeline: builder.query({
      query: () => '/leads/pipeline',
      providesTags: ['Leads'],
    }),
    // Backed by /api/Broker/leads (Leads_select @Flag=10) — scoped server-side to the
    // logged-in broker's own submitted leads (SavedBy, from their JWT). Response fields
    // (clientName, nationality, passportNo, mobile, email, leadId) match the grid 1:1.
    getLeads: builder.query({
      query: () => '/Broker/leads',
      transformResponse: (response) => response?.data ?? [],
      providesTags: ['Leads'],
    }),
    // Backed by /api/Broker/leads (Leads_save_by_Broker + Attachment_Save for the mandatory
    // passport copy) — multipart since a file is always attached. Field names match
    // CreateLeadRequest's properties case-insensitively, mirroring LeadsPage.jsx's `form`
    // shape one-to-one so no renaming is needed here.
    createLead: builder.mutation({
      query: (form) => {
        const fd = new FormData()
        const append = (key, value) => {
          if (value !== null && value !== undefined && value !== '') fd.append(key, value)
        }

        append('salutation', form.salutation)
        append('fullName', form.fullName)
        append('nationality', form.nationality)
        append('passportNo', form.passport)
        append('email', form.email)
        append('mobile', form.mobile)
        append('address', form.address)
        append('residence', form.residence)
        append('passportFile', form.passportFile)

        return { url: '/Broker/leads', method: 'POST', body: fd }
      },
      transformResponse: (response) => ({ leadId: response?.leadId ?? null, message: response?.message ?? '' }),
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
