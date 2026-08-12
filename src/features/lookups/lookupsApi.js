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
    // Real, already-live endpoint (unlike /lookups above, which is still a
    // placeholder). It requires a bearer token, but registration happens
    // before anyone is logged in — so this fetches a short-lived temporary
    // token first (same one /api/Auth/temporary-token issues for exactly
    // this kind of anonymous/guest lookup) and uses that as the bearer.
    getNationalityList: builder.query({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const tokenResult = await baseQuery({ url: '/Auth/temporary-token', method: 'POST' })
        if (tokenResult.error) return { error: tokenResult.error }

        const accessToken = tokenResult.data?.accessToken
        const listResult = await baseQuery({
          url: '/Guest/getNationalityList',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (listResult.error) return { error: listResult.error }

        const options = (listResult.data?.data ?? []).map((n) => ({
          value: n.nationID,
          label: n.nationName?.trim(),
        }))
        return { data: options }
      },
    }),
    // Same temporary-token pattern as getNationalityList above. This endpoint
    // wraps UserInfo_Select, which the caller drives via flag/uid/key — e.g.
    // { flag: 11, uid: 0, key: '' } backs the "Currently dealing with (RAK
    // Properties staff)" dropdown, but other flags return other UserInfo_Select
    // modes, so none of those values are assumed here.
    getStaffList: builder.query({
      queryFn: async ({ flag, uid = 0, key = '' }, _api, _extraOptions, baseQuery) => {
        const tokenResult = await baseQuery({ url: '/Auth/temporary-token', method: 'POST' })
        if (tokenResult.error) return { error: tokenResult.error }

        const accessToken = tokenResult.data?.accessToken
        const listResult = await baseQuery({
          url: '/Guest/getStaffList',
          params: { Flag: flag, UID: uid, Key: key },
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (listResult.error) return { error: listResult.error }

        const options = (listResult.data?.data ?? [])
          .map((s) => ({ value: s.userName, label: s.fullName?.trim() }))
          .sort((a, b) => a.label.localeCompare(b.label))
        return { data: options }
      },
    }),
  }),
})

export const { useGetFormOptionsQuery, useGetNationalityListQuery, useGetStaffListQuery } = lookupsApi
