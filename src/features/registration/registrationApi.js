import { apiClient } from '../../services/apiClient'

// Same temporary-token pattern as lookupsApi's getNationalityList/getStaffList —
// registration happens before anyone is logged in, so this fetches a short-lived
// temporary token first and uses that as the bearer.
export const registrationApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    checkBrokerEmail: builder.mutation({
      queryFn: async (email, _api, _extraOptions, baseQuery) => {
        const tokenResult = await baseQuery({ url: '/Auth/temporary-token', method: 'POST' })
        if (tokenResult.error) return { error: tokenResult.error }

        const accessToken = tokenResult.data?.accessToken
        const checkResult = await baseQuery({
          url: '/Guest/checkBrokerEmail',
          method: 'POST',
          body: { email },
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (checkResult.error) return { error: checkResult.error }

        return {
          data: {
            availability: checkResult.data?.data?.availability ?? 'available',
            approvalStatus: checkResult.data?.data?.approvalStatus ?? null,
            message: checkResult.data?.message ?? '',
          },
        }
      },
    }),
    // Saves the registration via /api/Guest/saveBrokerRegistration (mirrors the legacy
    // pages' BrokerRegistration_Save). Field names below match the request DTO's
    // properties case-insensitively, and mirror the shape used by `form` in
    // RegistrationPage.jsx one-to-one, so no renaming is needed here.
    saveBrokerRegistration: builder.mutation({
      // brokerId is null on the first save (insert) and the previously-returned
      // referenceId on every save after that (update-in-place) — see RegistrationPage.jsx.
      // brokerTypeCode: 1 = agency, 2 = freelancer, 3 = lease. isCompanyShaped is true for
      // both agency and lease, which share the exact same field layout.
      queryFn: async ({ brokerTypeCode, isCompanyShaped, form, brokerId, isFinal }, _api, _extraOptions, baseQuery) => {
        const tokenResult = await baseQuery({ url: '/Auth/temporary-token', method: 'POST' })
        if (tokenResult.error) return { error: tokenResult.error }
        const accessToken = tokenResult.data?.accessToken

        const fd = new FormData()
        const append = (key, value) => {
          if (value !== null && value !== undefined && value !== '') fd.append(key, value)
        }

        fd.append('brokerType', String(brokerTypeCode))
        append('brokerId', brokerId)
        fd.append('isFinal', isFinal ? 'true' : 'false')
        append('email', form.email)
        append('bankAccountHolder', form.bankAccountHolder)
        append('bankName', form.bankName)
        append('bankAccountNo', form.bankAccountNo)
        append('bankIban', form.bankIban)
        append('bankBranch', form.bankBranch)
        append('bankAddress', form.bankAddress)
        append('isRelatedParty', form.isRelatedParty)
        append('relatedPartyDetails', form.relatedPartyDetails)
        append('dealingWith', form.dealingWith)

        if (isCompanyShaped) {
          append('companyName', form.companyName)
          append('ownerName', form.ownerName)
          append('ownerPassport', form.ownerPassport)
          append('ownerNationality', form.ownerNationality)
          append('ownershipType', form.ownershipType)
          append('tradeLicenseNo', form.tradeLicenseNo)
          append('tradeLicenseExpiry', form.tradeLicenseExpiry)
          append('tradeLicenseCountry', form.tradeLicenseCountry)
          append('officeAddress', form.officeAddress)
          append('officeCity', form.officeCity)
          append('officeCountry', form.officeCountry)
          append('telephone', form.telephone)
          append('mobile', form.mobile)
          append('website', form.website)
          append('commercialRegNo', form.commercialRegNo)
          append('staffCount', form.staffCount)
          append('pastTrackRecord', form.pastTrackRecord)
          append('hasAuthorizedPerson', form.hasAuthorizedPerson)
          if (form.hasAuthorizedPerson === 'yes') {
            append('authPersonName', form.authPersonName)
            append('authPersonPassport', form.authPersonPassport)
            append('authPersonCountry', form.authPersonCountry)
            append('authPerson2Name', form.authPerson2Name)
            append('authPerson2Passport', form.authPerson2Passport)
            append('authPerson2Country', form.authPerson2Country)
          }
          append('licenseFile', form.licenseFile)
          append('ownerPassportFile', form.ownerPassportFile)
          append('ownerEidFile', form.ownerEidFile)
          append('companyProfileFile', form.companyProfileFile)
          append('signatoryFile', form.signatoryFile)
          append('authPersonPassportFile', form.authPersonPassportFile)
          append('authPersonEidFile', form.authPersonEidFile)
          append('authPerson2PassportFile', form.authPerson2PassportFile)
          append('authPerson2EidFile', form.authPerson2EidFile)
        } else {
          append('fullName', form.fullName)
          append('mobile', form.mobile)
          append('nationality', form.nationality)
          append('emiratesId', form.emiratesId)
          append('freelancerAddress', form.freelancerAddress)
          append('freelancerCity', form.freelancerCity)
          append('passportFile', form.passportFile)
          append('eidFile', form.eidFile)
          append('profileFile', form.profileFile)
        }

        const saveResult = await baseQuery({
          url: '/Guest/saveBrokerRegistration',
          method: 'POST',
          body: fd,
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (saveResult.error) return { error: saveResult.error }

        return {
          data: {
            referenceId: saveResult.data?.data?.referenceId ?? null,
            seccode: saveResult.data?.data?.seccode ?? '',
            message: saveResult.data?.message ?? '',
          },
        }
      },
    }),
    // Backs the "resume via emailed link" flow — fetches a previously-saved application by
    // bid/seccode so RegistrationPage.jsx can pre-fill the wizard. The response's field names
    // already match `form`'s shape (see BrokerRegistrationResumeResult on the API side), so no
    // renaming is needed here either.
    resumeBrokerRegistration: builder.query({
      queryFn: async ({ bid, seccode }, _api, _extraOptions, baseQuery) => {
        const tokenResult = await baseQuery({ url: '/Auth/temporary-token', method: 'POST' })
        if (tokenResult.error) return { error: tokenResult.error }
        const accessToken = tokenResult.data?.accessToken

        const resumeResult = await baseQuery({
          url: '/Guest/resumeBrokerRegistration',
          params: { Bid: bid, Seccode: seccode },
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (resumeResult.error) return { error: resumeResult.error }

        return { data: resumeResult.data?.data ?? null }
      },
    }),
  }),
})

export const { useCheckBrokerEmailMutation, useSaveBrokerRegistrationMutation, useResumeBrokerRegistrationQuery } =
  registrationApi
