import { apiClient } from '../../services/apiClient'

export const authApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/Broker/token',
        method: 'POST',
        body: {
          username: credentials.username,
          password: credentials.password,
        },
      }),
      // Maps RAKP_API's BrokerJwtTokenResponse shape (from the legacy
      // Check_Login_Agent SP / UserInfo table) to the { user, token } shape
      // authSlice.setCredentials expects.
      transformResponse: (response) => ({
        token: response.accessToken,
        user: {
          uid: response.uid,
          fullName: response.fullName,
          userName: response.userName,
          email: response.email,
          mobile: response.mobile,
          address: response.address,
          isFirstTime: response.isFirstTime,
          language: response.language,
        },
        // Signed handoff URL to the legacy RAKPBrokeragePortal — the new app's
        // job is just to log the broker in, then send them there.
        oldAppSsoUrl: response.oldAppSsoUrl,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/Broker/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    // Backs the reset-password landing page (see ResetPasswordPage.jsx) — checked once on
    // mount so an expired/invalid link shows a message instead of a form nobody can submit.
    validateResetLink: builder.query({
      query: ({ ref, token }) => ({
        url: '/Broker/validate-reset-link',
        params: { Ref: ref, Token: token },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ ref, token, newPassword }) => ({
        url: '/Broker/reset-password',
        method: 'POST',
        body: { ref, token, newPassword },
      }),
    }),
  }),
})

export const {
  useLoginMutation,
  useForgotPasswordMutation,
  useValidateResetLinkQuery,
  useResetPasswordMutation,
} = authApi
