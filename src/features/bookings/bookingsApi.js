import { apiClient } from '../../services/apiClient'

// e.g. 9200000 -> "AED 9.2M" — keeps the KPI card compact regardless of magnitude.
const formatCompactAed = (value) =>
  `AED ${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0))}`

export const bookingsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    // Bookings page's summary KPI cards — real endpoint. activeHolds/activeHold come from the
    // broker's own active explicit unit holds (Unit_Search @Flag=4); reserved/spaSigned/
    // totalSalesValue come from SalesAgentPerformence_Select @Flag=1, scoped to the page's
    // From/To date picker.
    getBookingsSummary: builder.query({
      query: ({ fromDate, toDate }) => ({ url: '/Broker/bookings/summary', params: { fromDate, toDate } }),
      transformResponse: (response) => ({
        activeHolds: response?.activeHolds ?? 0,
        reserved: response?.reserved ?? 0,
        spaSigned: response?.spaSigned ?? 0,
        totalSalesValue: formatCompactAed(response?.totalSalesValue),
        // Every one of the broker's own active holds, most recent first — the banner lists all
        // of them (scrollable), not just one.
        activeHoldsList: (response?.activeHoldsList ?? []).map((h) => ({
          unitId: h.unitId,
          unitLabel: h.unitLabel,
          // Null until the broker confirms Step 2's client selection (Unit_Hold_Lead_Save).
          clientName: h.clientName ?? null,
          leadId: h.leadId ?? null,
          placedAt: h.placedAt ? new Date(h.placedAt).toLocaleString() : '',
          expiresAt: h.expiresAt ? new Date(h.expiresAt).getTime() : null,
          isEoiPaid: h.isEoiPaid ?? false,
          isEoiSent: h.isEoiSent ?? false,
        })),
      }),
      providesTags: ['Bookings'],
    }),
    // Bookings page's "All bookings" grid — real endpoint, same procedure/date range as the
    // summary above, plus the broker's own active explicit unit holds ('hold' status rows).
    // Sold rows map to 'done' ("Completed"), Reserved to 'reserved', Cancelled to 'cancelled',
    // SPA-signed to 'spa' — 'eoi' still has no data source, so that filter shows nothing.
    getBookings: builder.query({
      query: ({ fromDate, toDate }) => ({ url: '/Broker/bookings', params: { fromDate, toDate } }),
      transformResponse: (response) =>
        (response?.data ?? []).map((b) => ({
          ...b,
          bookedOn: b.bookedOn ? new Date(b.bookedOn).toLocaleDateString() : '—',
        })),
      providesTags: ['Bookings'],
    }),
    // Reservation wizard Step 1's filter dropdowns — real endpoint, backed by
    // SchemaPortal.GetUnitFilterLookups (Community/Bedrooms/Property Type, scoped to units
    // that are actually for-sale and available). Mapped to {value,label} here, same
    // convention as getNationalityList in lookupsApi.js.
    getUnitFilterLookups: builder.query({
      query: () => '/Broker/unit-filters',
      transformResponse: (response) => {
        const data = response?.data ?? {}
        return {
          communities: (data.communities ?? []).map((c) => ({
            value: String(c.precintID),
            label: c.precNickName?.trim(),
          })),
          bedrooms: (data.bedrooms ?? []).map((b) => ({ value: String(b), label: String(b) })),
          propertyTypes: (data.propertyTypes ?? []).map((t) => ({
            value: String(t.unitTypeID),
            label: t.typeName?.trim(),
          })),
        }
      },
      providesTags: ['Bookings'],
    }),
    // Reservation wizard Step 1 — cross-project unit search/filter. Real endpoint
    // (Unit_Search @Flag=3, ProjectID/PropertyID=0, Status="1") — @Flag=3 excludes units
    // currently on hold by a different broker (see holdUnit below).
    searchAllUnits: builder.query({
      query: (params) => ({ url: '/Broker/units/search', params }),
      transformResponse: (response) => response?.data ?? [],
      providesTags: ['Bookings'],
    }),
    // Places a hold on a unit, dropping it out of every other broker's units/search results
    // until the hold expires or the unit is actually reserved. Real endpoint (Unit_Hold_Save).
    // Two callers: Step 1's "Select" flow — holdUnit(unitId) — a transient 20-minute soft-lock
    // released automatically on wizard cancel/unmount; and Step 1's standalone "Hold" button —
    // holdUnit({ unitId, durationMinutes: 2880 }) — a real 48-hour hold released only from the
    // Bookings grid.
    holdUnit: builder.mutation({
      query: (arg) => {
        const { unitId, durationMinutes } = typeof arg === 'object' && arg !== null ? arg : { unitId: arg }
        return {
          url: `/Broker/units/${unitId}/hold`,
          method: 'POST',
          params: durationMinutes ? { durationMinutes } : undefined,
        }
      },
      transformResponse: (response) => ({
        message: response?.message ?? '',
        expiresAt: response?.expiresAt ? new Date(response.expiresAt).getTime() : null,
      }),
      invalidatesTags: ['Bookings'],
    }),
    // Releases a unit's hold early — Cancel, Back to pick a different unit, or navigating away
    // without completing the reservation. Real endpoint (Unit_Hold_Release).
    releaseUnitHold: builder.mutation({
      query: (unitId) => ({ url: `/Broker/units/${unitId}/release-hold`, method: 'POST' }),
      invalidatesTags: ['Bookings'],
    }),
    // Wizard's "Hold" flow, Step 2 — confirms which lead the already-placed 48-hour hold is
    // for. Real endpoint (Unit_Hold_Lead_Save) — deliberately separate from createBooking,
    // since a hold is not a reservation.
    saveUnitHoldLead: builder.mutation({
      query: ({ unitId, leadId }) => ({ url: `/Broker/units/${unitId}/hold-lead`, method: 'POST', params: { leadId } }),
      invalidatesTags: ['Bookings'],
    }),
    // Bookings grid's "Convert to EOI" action — sends the held unit's client a payment link by
    // email (no redirect on our side, since it's the client who needs to pay). Real endpoint;
    // flips the row's status from 'hold' to 'eoi' once sent.
    convertHoldToEoi: builder.mutation({
      query: (unitId) => ({ url: `/Broker/units/${unitId}/convert-to-eoi`, method: 'POST' }),
      transformResponse: (response) => ({ message: response?.message ?? '' }),
      invalidatesTags: ['Bookings'],
    }),
    // Bookings grid's "Download reservation form" action on a 'reserved' row — real endpoint
    // (ReservationbyLead.Attachement, read from BROKER_DOCUMENTSPATH). Same blob/JSON-error
    // response-handler pattern as downloadMarketingKit (projectsApi.js).
    downloadReservationForm: builder.mutation({
      query: (reserveId) => ({
        url: `/Broker/reservations/${reserveId}/form`,
        responseHandler: (response) =>
          response.headers.get('content-type')?.includes('application/json') ? response.json() : response.blob(),
      }),
    }),
    // Reservation wizard Step 2 — full property-details panel for the selected unit. Real
    // endpoint (Unit_Select @Flag=2, keyed by UnitID). refetchOnMountOrArgChange must be
    // passed at the useGetUnitDetailQuery call site (RTK Query only reads this option from
    // the hook call's own options argument, not from the endpoint definition below — it has
    // no effect here) — see ReservationWizard.jsx.
    getUnitDetail: builder.query({
      query: (unitId) => `/Broker/units/${unitId}`,
      transformResponse: (response) => response?.data ?? null,
      providesTags: (result, error, unitId) => [{ type: 'Bookings', id: `unit-${unitId}` }],
    }),
    // Step 3 — payment plan options scoped to the selected unit's precinct. Real endpoint
    // (PaymentPlan_Select @Flag=8, keyed by PrecintID).
    getPaymentPlans: builder.query({
      query: (precintId) => ({ url: '/Broker/payment-plans', params: { precintId } }),
      transformResponse: (response) => response?.data ?? [],
      providesTags: (result, error, precintId) => [{ type: 'Bookings', id: `plans-${precintId}` }],
    }),
    // Step 3 — the selected plan's installment schedule (SlNo/Installment/Date/Amount(%)/
    // Amount(AED) grid) plus the total selling price. Real endpoint (PaymentPlan_Select
    // @Flag=5) — sellingPrice is the already-resolved price-option amount (see
    // ReservationWizard's resolvedSellingPrice); propertyId lets the API add 5% VAT on top
    // when the property's VATType_Prop is "STD" (Property_Select @Flag=1); handoverDate (from
    // the selected unit's own Unit_Select row) drives InstType=1's cap-at-handover rule and
    // InstType=4's date calculation — all matching legacy.
    getPaymentPlanSchedule: builder.query({
      query: ({ planId, sellingPrice, propertyId, handoverDate }) => ({
        url: `/Broker/payment-plans/${planId}/schedule`,
        params: { sellingPrice, propertyId, handoverDate },
      }),
      transformResponse: (response) => ({
        rows: response?.data ?? [],
        totalSellingPrice: response?.totalSellingPrice ?? 0,
      }),
      providesTags: (result, error, arg) => [{ type: 'Bookings', id: `schedule-${arg?.planId}` }],
    }),
    // Step 4 — the minimum the broker's own entered reservation amount must meet (a floor,
    // not the amount itself). Real endpoint.
    getReservationFeeMinimum: builder.query({
      query: () => '/Broker/reservation-fee-minimum',
      transformResponse: (response) => response?.minimumAmount ?? 0,
      providesTags: ['Bookings'],
    }),
    // Step 4 — final "Reserve unit". Real endpoint (ReservationbyLead_FormGeneration_Save,
    // mirroring legacy's BtnReserve_Click1), which then triggers the signed payment-gateway
    // redirect using whatever amount the broker entered (reservationAmount) — must meet the
    // configured minimum. Client ID/passport is captured during lead creation, not
    // re-uploaded here; the joint buyer is picked from the same registered leads list as the
    // primary client (jointLeadId), not a fresh registration.
    createBooking: builder.mutation({
      query: (form) => {
        const fd = new FormData()
        const append = (key, value) => {
          if (value !== null && value !== undefined && value !== '') fd.append(key, value)
        }

        append('unitId', form.unitId)
        append('leadId', form.leadId)
        append('payeeEmail', form.payeeEmail)
        append('payeeMobile', form.payeeMobile)
        append('paymentPlanId', form.paymentPlanId)
        append('sellingPrice', form.sellingPrice)
        append('reservationAmount', form.reservationAmount)
        append('jointBuyer', form.jointBuyer ? 'true' : 'false')
        append('jointLeadId', form.jointLeadId)

        return { url: '/Broker/bookings', method: 'POST', body: fd }
      },
      transformResponse: (response) => ({
        reservationId: response?.reservationId ?? null,
        paymentGatewayUrl: response?.paymentGatewayUrl ?? null,
        paymentInitiationFailed: response?.paymentInitiationFailed ?? false,
        message: response?.message ?? '',
      }),
      invalidatesTags: ['Bookings'],
    }),
    updateBookingStatus: builder.mutation({
      query: ({ id, ...patch }) => ({ url: `/bookings/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Bookings'],
    }),
    // Payment gateway return page — the broker's browser lands on the frontend's own
    // /payment-confirmation route after MIGS/VPC redirects back, with the vpc_ fields on the
    // query string. This forwards them to the backend as an authenticated request (the base
    // apiClient attaches the broker's JWT from local storage automatically), since a JWT
    // bearer token can't survive the gateway's own top-level redirect the way a session
    // cookie would have. The backend verifies the response hash, records it, updates unit
    // status, sends the acknowledgement email, and returns the receipt data rendered here.
    confirmPayment: builder.query({
      query: (vpcParams) => ({ url: '/Broker/payment-confirmation', params: vpcParams }),
      transformResponse: (response) => ({
        success: response?.success ?? false,
        reservationId: response?.reservationId ?? null,
        transactionRefNo: response?.transactionRefNo ?? null,
        unitNo: response?.unitNo ?? null,
        propertyName: response?.propertyName ?? null,
        clientName: response?.clientName ?? null,
        payeeEmail: response?.payeeEmail ?? null,
        payeeMobile: response?.payeeMobile ?? null,
        nationality: response?.nationality ?? null,
        passport: response?.passport ?? null,
        leadId: response?.leadId ?? null,
        amount: response?.amount ?? 0,
        message: response?.message ?? '',
        // True for an EOI checkout rather than a real reservation — this same page/endpoint
        // backs both, so the receipt view adapts its labels based on this.
        isEoi: response?.isEoi ?? false,
      }),
    }),
  }),
})

export const {
  useGetBookingsSummaryQuery,
  useGetBookingsQuery,
  useGetUnitFilterLookupsQuery,
  useSearchAllUnitsQuery,
  useHoldUnitMutation,
  useReleaseUnitHoldMutation,
  useSaveUnitHoldLeadMutation,
  useConvertHoldToEoiMutation,
  useDownloadReservationFormMutation,
  useGetUnitDetailQuery,
  useGetPaymentPlansQuery,
  useGetPaymentPlanScheduleQuery,
  useGetReservationFeeMinimumQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
  useConfirmPaymentQuery,
} = bookingsApi
