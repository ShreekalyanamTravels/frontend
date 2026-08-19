/* Hand-written OpenAPI 3.0 description of the /api/v1 mobile API (app/api/v1/**). Kept as a plain
 * object rather than JSDoc-per-route annotations since the route handlers were already written
 * without them — this is the single source of truth for the spec, served as JSON from
 * /api/v1/openapi.json and rendered by the Swagger UI page at /api-docs. Update this file
 * alongside any /api/v1 route change. */

const errorResponse = {
  type: "object",
  properties: { error: { type: "string", example: "Not authenticated" } },
};

const bearerAuth = [{ bearerAuth: [] as string[] }];

function jsonBody(schema: object) {
  return { content: { "application/json": { schema } } };
}

function errorRef(description: string) {
  return { description, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };
}

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Corporate Travel — Mobile API (v1)",
    version: "1.0.0",
    description:
      "Bearer-token API for the mobile app, mirroring the corporate web app's flight/insurance " +
      "booking, payments, and wallet features. All endpoints are versioned under /api/v1 and are " +
      "rate-limited; endpoints not marked \"Public\" require `Authorization: Bearer <accessToken>`.",
  },
  servers: [{ url: "/api/v1" }],
  security: bearerAuth,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: errorResponse,
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1024 },
          email: { type: "string", example: "traveller@company.com" },
          name: { type: "string", example: "Jane Doe" },
          corporateId: { type: "string", example: "1024" },
          status: { type: "string", enum: ["Active", "Inactive"], example: "Active" },
        },
      },
      TokenPair: {
        type: "object",
        properties: {
          accessToken: { type: "string", description: "JWT, 15 minute expiry" },
          refreshToken: { type: "string", description: "Opaque token, 30 day expiry, single-use (rotated on refresh)" },
          expiresIn: { type: "integer", example: 900, description: "Access token lifetime in seconds" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
    },
  },
  tags: [
    { name: "Config" },
    { name: "Auth" },
    { name: "Profile" },
    { name: "Flights" },
    { name: "Bookings" },
    { name: "Insurance" },
    { name: "Payments" },
    { name: "Wallet" },
    { name: "GST & Fees" },
    { name: "Vendor" },
  ],
  paths: {
    "/app-config": {
      get: {
        tags: ["Config"], summary: "Get basic app configuration", security: [],
        description:
          "Public, unauthenticated endpoint for basic app configuration — API base URL, branding, " +
          "update gating, and feature flags — fetched on app launch before any user is logged in. " +
          "Sourced from the system_settings table.",
        responses: {
          "200": {
            description: "App configuration",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    apiBaseUrl: { type: "string", format: "uri" },
                    appName: { type: "string", example: "Shree Kalyanam" },
                    appIconUrl: { type: "string", format: "uri" },
                    branding: {
                      type: "object",
                      properties: {
                        logoUrl: { type: "string", format: "uri" },
                        loadingLogoUrl: { type: "string", format: "uri" },
                        primaryColor: { type: "string", example: "#e07a3f" },
                        backgroundColor: { type: "string", example: "#faf8f4" },
                      },
                    },
                    minSupportedVersion: { type: "string", example: "1.0.0" },
                    forceUpdate: { type: "boolean" },
                    maintenanceMode: { type: "boolean" },
                    featureFlags: {
                      type: "object",
                      properties: {
                        otpLogin: { type: "boolean" },
                        pushNotifications: { type: "boolean" },
                        walletRecharge: { type: "boolean" },
                      },
                    },
                  },
                },
                example: {
                  apiBaseUrl: "https://corporate.shreekalyanam.com/api/v1",
                  appName: "Shree Kalyanam",
                  appIconUrl: "https://corporate.shreekalyanam.com/assets/logo-mark.png",
                  branding: {
                    logoUrl: "https://corporate.shreekalyanam.com/assets/logo.png",
                    loadingLogoUrl: "https://corporate.shreekalyanam.com/assets/logo-mark.png",
                    primaryColor: "#e07a3f",
                    backgroundColor: "#faf8f4",
                  },
                  minSupportedVersion: "1.0.0",
                  forceUpdate: false,
                  maintenanceMode: false,
                  featureFlags: { otpLogin: true, pushNotifications: true, walletRecharge: true },
                },
              },
            },
          },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Log in", security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "ravi.k.ameriya@gmail.com" },
            password: { type: "string", example: "12345678" },
            deviceLabel: { type: "string", maxLength: 255, example: "vivo" },
          },
          example: { email: "ravi.k.ameriya@gmail.com", password: "12345678", deviceLabel: "vivo" },
        }),
        responses: {
          "200": { description: "Logged in", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "400": errorRef("Invalid request body"),
          "401": errorRef("Invalid email or password"),
          "429": errorRef("Too many login attempts"),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"], summary: "Rotate an access/refresh token pair", security: [],
        requestBody: jsonBody({
          type: "object", required: ["refreshToken"],
          properties: { refreshToken: { type: "string" }, deviceLabel: { type: "string", maxLength: 255 } },
        }),
        responses: {
          "200": { description: "New token pair", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "400": errorRef("Invalid request body"),
          "401": errorRef("Invalid, expired, or reused refresh token"),
          "429": errorRef("Too many requests"),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"], summary: "Revoke one refresh token (log out this device)", security: [],
        requestBody: jsonBody({ type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } }),
        responses: { "200": { description: "OK" }, "400": errorRef("Invalid request body") },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"], summary: "Revoke every refresh token for the current user (log out everywhere)",
        responses: { "200": { description: "OK" }, "401": errorRef("Not authenticated") },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"], summary: "Get the current authenticated user",
        responses: {
          "200": { description: "Current user", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" } } } } } },
          "401": errorRef("Not authenticated"),
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"], summary: "Request a password reset email", security: [],
        requestBody: jsonBody({ type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } }),
        responses: { "200": { description: "Always a generic response, whether or not the email exists" }, "429": errorRef("Too many requests") },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"], summary: "Reset password with the emailed token", security: [],
        requestBody: jsonBody({
          type: "object", required: ["email", "token", "newPassword"],
          properties: { email: { type: "string", format: "email" }, token: { type: "string" }, newPassword: { type: "string", minLength: 8 } },
        }),
        responses: { "200": { description: "OK" }, "400": errorRef("Invalid or expired reset link"), "429": errorRef("Too many requests") },
      },
    },
    "/auth/login/mobile/send-otp": {
      post: {
        tags: ["Auth"], summary: "Send a login OTP by SMS to a registered mobile number", security: [],
        description:
          "Always returns the same generic message whether or not the mobile number has an account, " +
          "so this can't be used to enumerate registered numbers. OTP is valid for 10 minutes.",
        requestBody: jsonBody({ type: "object", required: ["mobile"], properties: { mobile: { type: "string", example: "9876543210", description: "10-digit Indian mobile number" } } }),
        responses: {
          "200": { description: "Generic confirmation (sent, or silently no-op if unregistered)" },
          "400": errorRef("Enter a valid 10-digit mobile number"),
          "429": errorRef("Too many OTP requests"),
        },
      },
    },
    "/auth/login/mobile/verify-otp": {
      post: {
        tags: ["Auth"], summary: "Verify a login OTP and log in", security: [],
        requestBody: jsonBody({
          type: "object", required: ["mobile", "otp"],
          properties: { mobile: { type: "string", example: "9876543210" }, otp: { type: "string", example: "482913" } },
        }),
        responses: {
          "200": { description: "Logged in", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenPair" } } } },
          "400": errorRef("Invalid or expired OTP"),
          "429": errorRef("Too many attempts"),
        },
      },
    },

    "/profile": {
      get: {
        tags: ["Profile"], summary: "Get the current user's profile",
        responses: { "200": { description: "Profile" }, "401": errorRef("Not authenticated") },
      },
    },
    "/profile/change-password": {
      post: {
        tags: ["Profile"], summary: "Change password (revokes every other refresh token)",
        requestBody: jsonBody({
          type: "object", required: ["currentPassword", "newPassword"],
          properties: { currentPassword: { type: "string" }, newPassword: { type: "string", minLength: 8 } },
        }),
        responses: { "200": { description: "OK" }, "400": errorRef("Missing or invalid fields"), "401": errorRef("Current password is incorrect") },
      },
    },

    "/flights/search": {
      get: {
        tags: ["Flights"], summary: "Search flights (one-way / round / multi-city)", security: [],
        parameters: [
          { name: "type", in: "query", required: true, schema: { type: "string", enum: ["O", "R", "M"] } },
          { name: "no_segments", in: "query", required: true, schema: { type: "string" } },
          { name: "travelers[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
          { name: "adults", in: "query", required: true, schema: { type: "string" }, description: "1-9" },
          { name: "childs", in: "query", required: true, schema: { type: "string" }, description: "0-9" },
          { name: "infants", in: "query", required: true, schema: { type: "string" }, description: "0-9" },
          { name: "class", in: "query", required: true, schema: { type: "string" } },
          { name: "departure[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } }, description: "dd/mm/yyyy per leg" },
          { name: "origin_country[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
          { name: "destination_country[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
          { name: "from_city[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
          { name: "to_city[]", in: "query", required: true, schema: { type: "array", items: { type: "string" } } },
          { name: "fare_type", in: "query", schema: { type: "string", default: "1" } },
        ],
        responses: { "200": { description: "Flight results, grouped by leg" }, "422": errorRef("Missing/invalid required params") },
      },
    },
    "/flights/search-city": {
      get: {
        tags: ["Flights"], summary: "Airport/city autosuggest", security: [],
        parameters: [{ name: "key", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Matching airports" } },
      },
    },
    "/flights/price": {
      get: {
        tags: ["Flights"], summary: "Live fare re-check before booking", security: [],
        parameters: [
          { name: "searchId", in: "query", required: true, schema: { type: "string" } },
          { name: "supplierCode", in: "query", required: true, schema: { type: "string" } },
          { name: "flightId", in: "query", required: true, schema: { type: "string" } },
          { name: "price", in: "query", required: true, schema: { type: "number" } },
          { name: "originCountry", in: "query", schema: { type: "string" }, description: "Comma-joined, one per leg" },
          { name: "destinationCountry", in: "query", schema: { type: "string" }, description: "Comma-joined, one per leg" },
        ],
        responses: { "200": { description: "Re-checked price" }, "422": errorRef("Missing or invalid required params") },
      },
    },

    "/bookings": {
      get: {
        tags: ["Bookings"], summary: "List the current user's flight bookings",
        responses: { "200": { description: "Bookings" }, "401": errorRef("Not authenticated") },
      },
    },
    "/bookings/create": {
      post: {
        tags: ["Bookings"], summary: "Create a booking paid from the Credit Pool wallet",
        requestBody: jsonBody({ $ref: "#/components/schemas/BookingInput" }),
        responses: {
          "200": { description: "Booking created", content: { "application/json": { schema: { type: "object", properties: { ref: { type: "string" } } } } } },
          "400": errorRef("Invalid booking details, or insufficient Credit Pool balance"),
          "401": errorRef("Not authenticated"),
        },
      },
    },
    "/bookings/{ref}": {
      get: {
        tags: ["Bookings"], summary: "Get full booking detail",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Booking detail" }, "404": errorRef("Booking not found") },
      },
    },
    "/bookings/{ref}/change-request": {
      post: {
        tags: ["Bookings"], summary: "Submit a change request for a booking",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({
          type: "object", required: ["requestType", "remarks"],
          properties: {
            requestType: { type: "string" }, remarks: { type: "string" },
            sectorIds: { type: "array", items: { type: "integer" } },
            passengerIds: { type: "array", items: { type: "integer" } },
          },
        }),
        responses: { "200": { description: "OK" }, "404": errorRef("Booking not found") },
      },
    },
    "/bookings/{ref}/invoice": {
      get: {
        tags: ["Bookings"], summary: "Download the booking invoice PDF",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PDF", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } }, "404": errorRef("Booking not found") },
      },
    },
    "/bookings/{ref}/ticket": {
      get: {
        tags: ["Bookings"], summary: "Render the e-ticket as HTML",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "HTML e-ticket", content: { "text/html": { schema: { type: "string" } } } }, "404": errorRef("Booking not found") },
      },
    },

    "/insurance/plans": {
      get: {
        tags: ["Insurance"], summary: "List priced insurance plans for a search", security: [],
        parameters: [
          { name: "type", in: "query", schema: { type: "string" }, description: "e.g. Annual Multitrip" },
          { name: "dest", in: "query", schema: { type: "string", default: "Worldwide" } },
          { name: "dep", in: "query", schema: { type: "string", format: "date" } },
          { name: "ret", in: "query", schema: { type: "string", format: "date" } },
          { name: "dob", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Priced plans" }, "400": errorRef("Invalid date") },
      },
    },
    "/insurance/plan-details": {
      get: {
        tags: ["Insurance"], summary: "Get full policy wording/details for a plan", security: [],
        parameters: [{ name: "plan", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Plan details" }, "400": errorRef("Missing plan name"), "502": errorRef("Upstream unavailable") },
      },
    },
    "/insurance/premium": {
      get: {
        tags: ["Insurance"], summary: "Calculate the real premium for one plan", security: [],
        parameters: [
          { name: "plan", in: "query", required: true, schema: { type: "string" } },
          { name: "dep", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "ret", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "dob", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "dest", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Premium" }, "400": errorRef("Missing/invalid params"), "404": errorRef("Premium not available"), "502": errorRef("Upstream unavailable") },
      },
    },
    "/insurance/purchase": {
      post: {
        tags: ["Insurance"], summary: "Purchase a policy paid from the Credit Pool wallet",
        requestBody: jsonBody({ $ref: "#/components/schemas/InsuranceInput" }),
        responses: {
          "200": { description: "Policy issued", content: { "application/json": { schema: { type: "object", properties: { ref: { type: "string" }, policyNumber: { type: "string", nullable: true } } } } } },
          "400": errorRef("Invalid details, or insufficient Credit Pool balance"),
        },
      },
    },
    "/insurance/bookings": {
      get: {
        tags: ["Insurance"], summary: "List the current user's insurance policies",
        responses: { "200": { description: "Policies" }, "401": errorRef("Not authenticated") },
      },
    },
    "/insurance/{ref}/invoice": {
      get: {
        tags: ["Insurance"], summary: "Download the policy invoice PDF",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PDF" }, "404": errorRef("Policy not found") },
      },
    },
    "/insurance/{ref}/pdf": {
      get: {
        tags: ["Insurance"], summary: "Download the policy certificate PDF",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "PDF" }, "404": errorRef("Policy not found") },
      },
    },
    "/insurance/{ref}/resend": {
      post: {
        tags: ["Insurance"], summary: "Resend the policy confirmation email",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" }, "400": errorRef("No email on file"), "404": errorRef("Policy not found") },
      },
    },

    "/payments/razorpay/create-order": {
      post: {
        tags: ["Payments"], summary: "Create a Razorpay order for a wallet top-up",
        requestBody: jsonBody({ type: "object", required: ["amount", "paymentMode"], properties: { amount: { type: "number", minimum: 100 }, paymentMode: { type: "string" } } }),
        responses: { "200": { description: "Order created" }, "400": errorRef("Invalid amount/paymentMode") },
      },
    },
    "/payments/razorpay/verify": {
      post: {
        tags: ["Payments"], summary: "Verify a wallet top-up payment and credit the wallet",
        description: "Amount credited is derived from the order's own server-set notes, never the request body.",
        requestBody: jsonBody({ $ref: "#/components/schemas/RazorpayVerifyInput" }),
        responses: { "200": { description: "Credited (idempotent — replays return 200 without re-crediting)" }, "400": errorRef("Verification failed"), "403": errorRef("Order does not belong to this account") },
      },
    },
    "/payments/razorpay/booking/create-order": {
      post: {
        tags: ["Payments"], summary: "Create a Razorpay order for a booking total",
        requestBody: jsonBody({ type: "object", required: ["amount"], properties: { amount: { type: "number", minimum: 0, exclusiveMinimum: true } } }),
        responses: { "200": { description: "Order created" }, "400": errorRef("Invalid amount") },
      },
    },
    "/payments/razorpay/booking/verify": {
      post: {
        tags: ["Payments"], summary: "Verify payment and create the booking",
        description: "Cross-checks the Razorpay order's paid amount against the booking's totalPayableAmt; duplicate payment IDs are idempotent.",
        requestBody: jsonBody({
          type: "object",
          required: ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature", "booking"],
          properties: {
            razorpay_order_id: { type: "string" }, razorpay_payment_id: { type: "string" }, razorpay_signature: { type: "string" },
            mode: { type: "string", enum: ["upi", "netbanking", "credit", "debit"] },
            booking: { $ref: "#/components/schemas/BookingInput" },
          },
        }),
        responses: {
          "200": { description: "Booking created", content: { "application/json": { schema: { type: "object", properties: { ref: { type: "string" } } } } } },
          "400": errorRef("Verification failed, amount mismatch, or invalid booking details"),
          "403": errorRef("Order does not belong to this account"),
        },
      },
    },
    "/payments/razorpay/insurance/create-order": {
      post: {
        tags: ["Payments"], summary: "Create a Razorpay order for an insurance premium",
        requestBody: jsonBody({ type: "object", required: ["amount"], properties: { amount: { type: "number", minimum: 0, exclusiveMinimum: true } } }),
        responses: { "200": { description: "Order created" }, "400": errorRef("Invalid amount") },
      },
    },
    "/payments/razorpay/insurance/verify": {
      post: {
        tags: ["Payments"], summary: "Verify payment and issue the policy",
        description: "Cross-checks the Razorpay order's paid amount against the policy premium; duplicate payment IDs are idempotent.",
        requestBody: jsonBody({
          type: "object",
          required: ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"],
          properties: {
            razorpay_order_id: { type: "string" }, razorpay_payment_id: { type: "string" }, razorpay_signature: { type: "string" },
            mode: { type: "string", enum: ["upi", "netbanking", "credit", "debit"] },
          },
          description: "Also accepts the same fields as /insurance/purchase (proposer, travellers, plan, etc.)",
        }),
        responses: {
          "200": { description: "Policy issued", content: { "application/json": { schema: { type: "object", properties: { ref: { type: "string" }, policyNumber: { type: "string", nullable: true } } } } } },
          "400": errorRef("Verification failed, amount mismatch, or invalid details"),
          "403": errorRef("Order does not belong to this account"),
        },
      },
    },

    "/wallet/balance": {
      get: { tags: ["Wallet"], summary: "Get Credit Pool wallet balance", responses: { "200": { description: "Balance" }, "401": errorRef("Not authenticated") } },
    },
    "/wallet/transactions": {
      get: { tags: ["Wallet"], summary: "List the last 100 wallet ledger entries", responses: { "200": { description: "Transactions" }, "401": errorRef("Not authenticated") } },
    },
    "/deposits": {
      get: {
        tags: ["Wallet"], summary: "List offline deposit requests in a date range",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "Deposits" }, "400": errorRef("from/to must be YYYY-MM-DD") },
      },
      post: {
        tags: ["Wallet"], summary: "Submit an offline deposit (bank transfer / cheque / UPI) for approval",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["paymentType", "amount"],
                properties: {
                  paymentType: { type: "string" }, amount: { type: "number", minimum: 0, exclusiveMinimum: true },
                  bankId: { type: "string" }, transactionDate: { type: "string", format: "date" },
                  transactionId: { type: "string" }, authCode: { type: "string" }, tid: { type: "string" },
                  rrn: { type: "string" }, accountNumber: { type: "string" }, holderName: { type: "string" },
                  atmId: { type: "string" }, chequeNumber: { type: "string" }, chequeBankName: { type: "string" },
                  branchName: { type: "string" }, vpa: { type: "string" }, remarks: { type: "string" },
                  slip: { type: "string", format: "binary", description: "JPEG/PNG/PDF, max 5MB" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "OK" }, "400": errorRef("Invalid amount, payment type, or slip file") },
      },
    },

    "/gst-details": {
      get: { tags: ["GST & Fees"], summary: "List saved corporate GST records", responses: { "200": { description: "GST records + Indian states list" }, "401": errorRef("Not authenticated") } },
      post: {
        tags: ["GST & Fees"], summary: "Add a corporate GST record",
        requestBody: jsonBody({ $ref: "#/components/schemas/GstInput" }),
        responses: { "200": { description: "Created" }, "400": errorRef("Validation error"), "409": errorRef("Duplicate GST number") },
      },
      put: {
        tags: ["GST & Fees"], summary: "Update a corporate GST record",
        requestBody: jsonBody({ allOf: [{ $ref: "#/components/schemas/GstInput" }, { type: "object", required: ["id"], properties: { id: { type: "integer" } } }] }),
        responses: { "200": { description: "OK" }, "400": errorRef("Validation error"), "404": errorRef("Not found"), "409": errorRef("Duplicate GST number") },
      },
      delete: {
        tags: ["GST & Fees"], summary: "Delete a corporate GST record",
        parameters: [{ name: "id", in: "query", required: true, schema: { type: "integer" } }],
        responses: { "200": { description: "OK" }, "400": errorRef("Missing id") },
      },
    },
    "/gst-percentage": {
      get: { tags: ["GST & Fees"], summary: "Get the current GST rate", security: [], responses: { "200": { description: "GST percentage" } } },
    },
    "/products": {
      get: {
        tags: ["GST & Fees"], summary: "List products (Flights, Insurance, Hotels, Travel, Visa, ...)", security: [],
        description:
          "Each product has its own `status` (active/inactive) and `availability` (live/coming_soon), set " +
          "independently in the database — an active product can still be `coming_soon`. Pass `status=active` " +
          "to get only the ones currently turned on, e.g. Insurance while Travel/Hotels are still inactive.",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "inactive"] }, description: "Omit to get every product regardless of status" },
        ],
        responses: {
          "200": {
            description: "Products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 3 },
                          name: { type: "string", example: "Insurance" },
                          status: { type: "string", enum: ["active", "inactive"], example: "active" },
                          availability: { type: "string", enum: ["live", "coming_soon"], example: "live" },
                        },
                      },
                    },
                  },
                },
                example: {
                  products: [
                    { id: 1, name: "Flight", status: "active", availability: "live" },
                    { id: 3, name: "Insurance", status: "active", availability: "live" },
                  ],
                },
              },
            },
          },
          "400": errorRef("status must be 'active' or 'inactive'"),
        },
      },
    },
    "/convenience-fee": {
      get: {
        tags: ["GST & Fees"], summary: "Compute the convenience fee for a payment", security: [],
        parameters: [
          { name: "paymentMode", in: "query", required: true, schema: { type: "string" } },
          { name: "sector", in: "query", required: true, schema: { type: "string" } },
          { name: "amount", in: "query", required: true, schema: { type: "number" } },
        ],
        responses: { "200": { description: "Convenience fee" }, "400": errorRef("Missing params") },
      },
    },
    "/service-fee": {
      get: {
        tags: ["GST & Fees"], summary: "Compute the service fee + GST for a flight fare", security: [],
        parameters: [
          { name: "sector", in: "query", required: true, schema: { type: "string", enum: ["O", "R"] } },
          { name: "bookingType", in: "query", required: true, schema: { type: "string", enum: ["domestic", "international"] } },
          { name: "amount", in: "query", required: true, schema: { type: "number" } },
        ],
        responses: { "200": { description: "Service fee" }, "400": errorRef("Missing params") },
      },
    },
    "/vendor/register": {
      post: {
        tags: ["Vendor"], summary: "Register a new vendor account", security: [],
        description:
          "Public registration endpoint restricted to requests from https://vendor.shreekalyanam.com " +
          "(checked via the Origin header — other origins get 403). New accounts are created with " +
          "status=Inactive and require admin approval before they can log in.",
        requestBody: jsonBody({
          type: "object",
          required: ["firstName", "lastName", "email", "password", "mobile"],
          properties: {
            firstName: { type: "string", maxLength: 100, example: "Ravi" },
            lastName: { type: "string", maxLength: 100, example: "Kumar" },
            email: { type: "string", format: "email", example: "ravi@vendorco.com" },
            password: { type: "string", minLength: 8, example: "correcthorsebattery" },
            mobile: { type: "string", example: "9876543210" },
            companyName: { type: "string", maxLength: 255, example: "Vendor Co Pvt Ltd" },
            gstNumber: { type: "string", maxLength: 50, example: "27AAAPL1234C1ZV" },
            panNumber: { type: "string", maxLength: 20, example: "AAAPL1234C" },
            address: { type: "string", maxLength: 500, example: "12 MG Road" },
            state: { type: "string", maxLength: 100, example: "Maharashtra" },
            pincode: { type: "string", maxLength: 10, example: "400001" },
          },
        }),
        responses: {
          "201": {
            description: "Account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Registration successful. Your account is pending admin approval." },
                    id: { type: "integer" },
                    status: { type: "string", example: "Inactive" },
                  },
                },
              },
            },
          },
          "400": errorRef("Invalid request body"),
          "403": errorRef("Forbidden origin"),
          "409": errorRef("An account with this email already exists"),
          "429": errorRef("Too many requests"),
        },
      },
    },
  },
};

// Extra request-body schemas referenced above via $ref, kept out of `components.schemas` above
// only for readability — merged in at the end so the $ref paths still resolve.
Object.assign(openApiSpec.components.schemas, {
  BookingInput: {
    type: "object",
    required: ["sectors", "passengers", "flightsData", "adt", "chd", "inf", "totalFlightAmt", "serviceFee", "convenienceFee", "totalPayableAmt"],
    properties: {
      countryCode: { type: "string", default: "+91" }, mobile: { type: "string" }, email: { type: "string" },
      adt: { type: "integer", minimum: 1 }, chd: { type: "integer" }, inf: { type: "integer" },
      travelClass: { type: "string", default: "Economy" }, tripLabel: { type: "string", enum: ["O", "R", "M"] },
      sectors: { type: "array", minItems: 1, maxItems: 6, items: { $ref: "#/components/schemas/BookingSector" } },
      passengers: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/BookingPassenger" } },
      totalFlightAmt: { type: "number" }, serviceFee: { type: "number" }, convenienceFee: { type: "number" },
      totalPayableAmt: { type: "number", minimum: 0, exclusiveMinimum: true },
      gst: { type: "object", properties: { companyName: { type: "string" }, registrationNo: { type: "string" }, gstNumber: { type: "string" }, pincode: { type: "string" }, stateName: { type: "string" }, address: { type: "string" } } },
      flightsData: { type: "object", description: "Raw itinerary payload carried through to booking_root/booking_tickets" },
    },
  },
  BookingSector: {
    type: "object",
    required: ["originCity", "destinationCity", "flightDepartDateRaw"],
    properties: {
      originCity: { type: "string" }, destinationCity: { type: "string" },
      originCode: { type: "string" }, destinationCode: { type: "string" },
      originCountry: { type: "string" }, destinationCountry: { type: "string" },
      flightDepartDateRaw: { type: "string" }, flightNo: { type: "string" }, flightId: { type: "string" }, fareType: { type: "string" },
    },
  },
  BookingPassenger: {
    type: "object",
    required: ["type", "firstName", "lastName"],
    properties: {
      title: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" },
      type: { type: "string", enum: ["Adult", "Child", "Infant"] },
      dob: { type: "string", format: "date" }, nationality: { type: "string" },
      passport: { type: "string" }, issuingCountry: { type: "string" }, passportExpiry: { type: "string", format: "date" },
    },
  },
  InsuranceInput: {
    type: "object",
    required: ["supplier", "planName", "dest", "dep", "ret", "amount", "adults", "proposer", "travellers"],
    properties: {
      supplier: { type: "string" }, planName: { type: "string" }, coverage: { type: "number" },
      dest: { type: "string" }, dep: { type: "string", format: "date" }, ret: { type: "string", format: "date" },
      amount: { type: "number", minimum: 0, exclusiveMinimum: true }, adults: { type: "integer", minimum: 1 },
      proposer: {
        type: "object",
        properties: { mobile: { type: "string" }, email: { type: "string" }, address1: { type: "string" }, address2: { type: "string" }, nationality: { type: "string" } },
      },
      travellers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" }, firstName: { type: "string" }, lastName: { type: "string" },
            dob: { type: "string", format: "date" }, passport: { type: "string" }, nationality: { type: "string" },
            relationship: { type: "string" }, nomineeFirst: { type: "string" }, nomineeLast: { type: "string" },
          },
        },
      },
    },
  },
  RazorpayVerifyInput: {
    type: "object",
    required: ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"],
    properties: {
      razorpay_order_id: { type: "string" }, razorpay_payment_id: { type: "string" }, razorpay_signature: { type: "string" },
    },
  },
  GstInput: {
    type: "object",
    required: ["companyName", "registrationNo", "gstNumber", "pincode", "stateId", "address"],
    properties: {
      companyName: { type: "string", pattern: "^[a-zA-Z0-9 &-]+$" },
      registrationNo: { type: "string", pattern: "^[a-zA-Z0-9]+$" },
      gstNumber: { type: "string", pattern: "^[a-zA-Z0-9]+$" },
      pincode: { type: "string", pattern: "^[0-9]+$" },
      stateId: { type: "integer" },
      address: { type: "string", pattern: "^[a-zA-Z0-9 .\\-/#]+$" },
    },
  },
});
