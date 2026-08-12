import { apiClient } from '../../services/apiClient'

export const projectsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    // Backed by /api/Broker/projects (BorkerPortal.GETPrecint) — id/name/image/status/
    // projectName/unitsOpen are real; kit/tag aren't wired to a source yet, so they're
    // simply absent and ProjectCard's existing blank-string defaults render in their place.
    getProjects: builder.query({
      query: () => '/Broker/projects',
      transformResponse: (response) => response?.data ?? [],
      providesTags: ['Projects'],
    }),
    getProjectById: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Projects', id }],
    }),
    // Backed by /api/Broker/units (Unit_Search @Flag=2). precinctId is the id from
    // getProjects (a precinct, per BorkerPortal.GETPrecint) — bedrooms/size/price all use
    // -1 for "any", matching the stored procedure's own sentinel convention.
    searchUnits: builder.query({
      query: ({ precinctId, bedrooms = -1, size = -1, price = -1, search = '' }) => ({
        url: '/Broker/units',
        params: { precinctId, bedrooms, size, price, search },
      }),
      transformResponse: (response) => response?.data ?? [],
      providesTags: (result, error, arg) => [{ type: 'Projects', id: `units-${arg?.precinctId}` }],
    }),
    // Backed by /api/Broker/marketing-kit (salesoffer_Select @Flag=6) — real category/
    // filepath-derived kit items (Brochure, Floor Plan, Payment Plan, Outside Image, etc.)
    // for the given precinct.
    getMarketingKit: builder.query({
      query: (precinctId) => ({
        url: '/Broker/marketing-kit',
        params: { precinctId },
      }),
      transformResponse: (response) => response?.data ?? [],
      providesTags: (result, error, precinctId) => [{ type: 'Projects', id: `kit-${precinctId}` }],
    }),
    // "Download full kit (.zip)" — /api/Broker/marketing-kit/download zips every file
    // server-side (avoids CORS against the external file host) and streams it back.
    // responseHandler branches on content-type: a JSON body means the API returned an
    // error (e.g. no files attached yet), anything else is the zip itself.
    downloadMarketingKit: builder.mutation({
      query: (precinctId) => ({
        url: '/Broker/marketing-kit/download',
        params: { precinctId },
        responseHandler: (response) =>
          response.headers.get('content-type')?.includes('application/json')
            ? response.json()
            : response.blob(),
      }),
    }),
  }),
})

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useSearchUnitsQuery,
  useGetMarketingKitQuery,
  useDownloadMarketingKitMutation,
} = projectsApi
