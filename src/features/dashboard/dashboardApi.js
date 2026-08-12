import { apiClient } from '../../services/apiClient'

export const dashboardApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    // Real endpoint (BrokerNotification_Select @Flag=0, @KeyValue="Announcement"). description
    // carries raw HTML as authored (bold/underline/color tags, line breaks) — rendered as-is
    // by the Dashboard, not escaped, since it's trusted admin-authored content from
    // Tbl_Broker_Notifications rather than user input.
    getAnnouncements: builder.query({
      query: () => '/Broker/announcements',
      transformResponse: (response) =>
        (response?.data ?? []).map((a) => ({
          id: a.id,
          title: a.title ?? '',
          description: a.description ?? '',
          date: a.savedDate
            ? new Date(a.savedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '',
        })),
      providesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetAnnouncementsQuery } = dashboardApi
