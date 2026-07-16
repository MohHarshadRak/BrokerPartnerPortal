import { apiClient } from '../../services/apiClient'

// Shared reference/config data used to populate dropdowns across the forms
// (property type, bedrooms, size and price bands, nationalities, budget
// ranges, payment plans, etc). Salutation is intentionally NOT here — it's
// a fixed, universal set of four values not worth a network round trip.
export const lookupsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getFormOptions: builder.query({
      query: () => '/lookups',
      providesTags: ['Lookups'],
    }),
  }),
})

export const { useGetFormOptionsQuery } = lookupsApi
