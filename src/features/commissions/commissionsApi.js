import { apiClient } from '../../services/apiClient'

export const commissionsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    // Real endpoint (Broker_CommissionDetails_Select @Flag=1, keyed by the broker's own
    // username). No project/property name is available, so "Deal" is the unit's PIN number
    // (dealName); "Sale value" is SoldPrice, "Rate" is CommPerc formatted as e.g. "2%".
    // status is pre-bucketed server-side into pending/approved/paid (see CommissionsService).
    // One card per raw CommStatus value that can carry a nonzero CommisionAmt (sum of
    // CommisionAmt for lines in that exact status) — "Commission not initiated" is excluded
    // since CommisionAmt is only ever populated once a commission is calculated, so that sum
    // is always zero. Pending = the Commission Processed sum minus total DispersalAmount.
    // commissionDispersed = DispersalAmount paid out during last calendar month only (from
    // CommissionDispersal.DispersalMonth), not an all-time total.
    getCommissionsSummary: builder.query({
      query: () => '/Broker/commissions/summary',
      transformResponse: (response) => ({
        commissionApprovalInProcess: `AED ${Number(response?.commissionApprovalInProcess ?? 0).toLocaleString()}`,
        commissionProcessed: `AED ${Number(response?.commissionProcessed ?? 0).toLocaleString()}`,
        pending: `AED ${Number(response?.pending ?? 0).toLocaleString()}`,
        commissionDispersed: `AED ${Number(response?.commissionDispersed ?? 0).toLocaleString()}`,
        commissionDispersedMonthLabel: response?.commissionDispersedMonthLabel ?? '',
        commissionDispersedDealCount: response?.commissionDispersedDealCount ?? 0,
        earnedYtd: `AED ${Number(response?.earnedYtd ?? 0).toLocaleString()}`,
        earnedYtdDealCount: response?.earnedYtdDealCount ?? 0,
        earnedYtdYear: response?.earnedYtdYear ?? new Date().getFullYear(),
      }),
      providesTags: ['Commissions'],
    }),
    getCommissions: builder.query({
      query: () => '/Broker/commissions',
      transformResponse: (response) => response?.data ?? [],
      providesTags: ['Commissions'],
    }),
    // Commissions page's "Submit invoice" modal. Real endpoint (Commission_InvSubmission_Save
    // @Flag=0) — transactionId (the commission line's own id) goes in the URL; CommDetailId/
    // UnitId come from that same line's own fields (not shown in the UI, just threaded
    // through), matching what the procedure needs.
    submitInvoice: builder.mutation({
      query: ({ transactionId, commDetailId, unitId, invoiceNo, invoiceDate, invoiceAmount, invoiceFile }) => {
        const fd = new FormData()
        fd.append('commDetailId', commDetailId ?? 0)
        fd.append('unitId', unitId ?? 0)
        fd.append('invoiceNo', invoiceNo)
        fd.append('invoiceDate', invoiceDate)
        fd.append('invoiceAmount', invoiceAmount)
        fd.append('invoiceFile', invoiceFile)

        return { url: `/Broker/commissions/${transactionId}/invoice`, method: 'POST', body: fd }
      },
      transformResponse: (response) => ({
        invoiceId: response?.invoiceId ?? null,
        message: response?.message ?? '',
      }),
      invalidatesTags: ['Commissions'],
    }),
  }),
})

export const {
  useGetCommissionsSummaryQuery,
  useGetCommissionsQuery,
  useSubmitInvoiceMutation,
} = commissionsApi
