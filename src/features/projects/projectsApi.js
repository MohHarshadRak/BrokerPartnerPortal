import { apiClient } from '../../services/apiClient'

export const projectsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: () => '/projects',
      providesTags: ['Projects'],
    }),
    getProjectById: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Projects', id }],
    }),
  }),
})

export const { useGetProjectsQuery, useGetProjectByIdQuery } = projectsApi
