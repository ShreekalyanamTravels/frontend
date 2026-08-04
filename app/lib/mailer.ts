import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: Number(process.env.SMTP_PORT ?? 465) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface BookingConfirmationDetails {
  bookingRef: string;
  pnr: string;
  sectors: { route: string; date: string }[];
  passengers: { name: string; type: string }[];
  totalPayableAmt: number;
  travellerName?: string;
  invoicePdf?: Buffer;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildBookingConfirmationHtml(details: BookingConfirmationDetails): string {
  const confirmationUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/corporate/booking-confirmation?ref=${encodeURIComponent(details.bookingRef)}`;
  const O = "#f07820", O2 = "#e86d18", PK = "#c9184a", NAVY = "#1a1a2e";
  const firstName = (details.travellerName ?? "").trim().split(/\s+/)[0] || "";

  const sectorRows = details.sectors.map((s, i) => `
    <tr>
      <td style="padding:14px 18px;border-bottom:${i < details.sectors.length - 1 ? "1px dashed #f0e0d8" : "none"}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width:34px;vertical-align:top">
              <div style="width:26px;height:26px;border-radius:8px;background:${i % 2 === 0 ? O : PK};
                color:#fff;font-size:12px;font-weight:700;line-height:26px;text-align:center;font-family:Arial,sans-serif">✈</div>
            </td>
            <td style="vertical-align:top">
              <div style="font-family:Arial,sans-serif;font-size:14.5px;font-weight:700;color:${NAVY}">${escapeHtml(s.route)}</div>
              <div style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin-top:2px">${escapeHtml(s.date)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  const passengerRows = details.passengers.map((p, i) => `
    <tr>
      <td style="padding:10px 18px;border-bottom:${i < details.passengers.length - 1 ? "1px solid #f5f0ee" : "none"};
        font-family:Arial,sans-serif;font-size:13.5px;color:${NAVY}">${escapeHtml(p.name)}</td>
      <td style="padding:10px 18px;border-bottom:${i < details.passengers.length - 1 ? "1px solid #f5f0ee" : "none"};
        text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#999">${escapeHtml(p.type)}</td>
    </tr>`).join("");

  const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4ede7;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4ede7;padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">

          <!-- Brand header -->
          <tr>
            <td style="background:#0f0f0f;padding:20px 28px">
              <span style="font-size:20px;vertical-align:middle">🪷</span>
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px;
                font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px">Kalyanam</span>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a7a3c 0%,#2d8a4e 55%,#1a5c2e 100%);
              background-color:#2d8a4e;padding:36px 28px;text-align:center">
              <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.18);
                border:2px solid rgba(255,255,255,.6);line-height:52px;text-align:center;
                font-size:26px;color:#ffffff;margin:0 auto 14px;font-family:Arial,sans-serif">✓</div>
              <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff">
                Booking Confirmed${firstName ? `, ${escapeHtml(firstName)}!` : "!"}
              </div>
              <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,.85);margin-top:6px">
                Your e-tickets are ready — full details below.
              </div>
            </td>
          </tr>

          <!-- Ref / PNR strip -->
          <tr>
            <td style="padding:22px 28px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="background:#fdf6f2;border:1px solid #f0e0d8;border-radius:10px 0 0 10px;
                    padding:14px 18px;border-right:none">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#bbb;
                      letter-spacing:.08em;text-transform:uppercase">Booking Reference</div>
                    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:800;color:${O};margin-top:3px">
                      ${escapeHtml(details.bookingRef)}
                    </div>
                  </td>
                  <td width="50%" style="background:#fdf6f2;border:1px solid #f0e0d8;border-radius:0 10px 10px 0;
                    padding:14px 18px">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#bbb;
                      letter-spacing:.08em;text-transform:uppercase">PNR</div>
                    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:800;color:${NAVY};margin-top:3px">
                      ${escapeHtml(details.pnr)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Flights -->
          <tr>
            <td style="padding:26px 28px 0">
              <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:800;color:${NAVY};
                letter-spacing:.04em;margin-bottom:10px">FLIGHT ITINERARY</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden">
                ${sectorRows}
              </table>
            </td>
          </tr>

          <!-- Passengers -->
          <tr>
            <td style="padding:22px 28px 0">
              <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:800;color:${NAVY};
                letter-spacing:.04em;margin-bottom:10px">PASSENGERS</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden">
                ${passengerRows}
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding:22px 28px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(135deg,${O}14,${O}06);background-color:#fdf1e8;
                border:1px solid ${O}30;border-radius:10px">
                <tr>
                  <td style="padding:16px 18px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;color:${O};
                            letter-spacing:.06em;text-transform:uppercase">Total Paid</div>
                          <div style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;margin-top:2px">Incl. all taxes &amp; fees</div>
                        </td>
                        <td align="right">
                          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:${O}">
                            &#8377; ${details.totalPayableAmt.toLocaleString("en-IN")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:26px 28px 8px;text-align:center">
              <a href="${confirmationUrl}" style="display:inline-block;background:${O};background:linear-gradient(135deg,${O},${O2});
                color:#ffffff;font-family:Arial,sans-serif;font-size:14.5px;font-weight:700;text-decoration:none;
                padding:13px 34px;border-radius:24px">View Booking Details</a>
              ${details.invoicePdf ? `<div style="font-family:Arial,sans-serif;font-size:11.5px;color:#aaa;margin-top:14px">
                Your invoice is attached to this email as a PDF.</div>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 28px">
              <div style="height:1px;background:#f0e8e8;margin-bottom:18px"></div>
              <div style="font-family:Arial,sans-serif;font-size:11.5px;color:#aaa;line-height:1.6;text-align:center">
                Need help with this booking? Reply to this email or contact our support team.<br/>
                Shree Kalyanam Corporate Travel
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

export async function sendBookingConfirmationEmail(to: string, details: BookingConfirmationDetails) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Booking Confirmed — ${details.bookingRef}`,
    html: buildBookingConfirmationHtml(details),
    attachments: details.invoicePdf ? [{
      filename: `Invoice-${details.bookingRef}.pdf`,
      content: details.invoicePdf,
      contentType: "application/pdf",
    }] : undefined,
  });
}

export interface InsuranceConfirmationDetails {
  /** Internal booking ref — used only to build the confirmation-page link, which is keyed by this,
   * not by the insurer's policy number. */
  policyRef: string;
  /** The insurer's actual policy number (Bajaj's `ppolicyRef`), shown to the customer. Falls back
   * to `policyRef` when issuance hasn't produced one yet (e.g. auto-issue is off). */
  policyNumber?: string;
  planName: string;
  supplier: string;
  coverage: number;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: { name: string; relation: string }[];
  totalPaid: number;
  proposerName?: string;
  policyPdf?: Buffer;
}

export function buildInsuranceConfirmationHtml(details: InsuranceConfirmationDetails): string {
  const confirmationUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/corporate/insurance/confirmation?ref=${encodeURIComponent(details.policyRef)}`;
  const displayPolicyNumber = details.policyNumber || details.policyRef;
  const O = "#f07820", O2 = "#e86d18", PK = "#c9184a", BLUE = "rgb(21, 70, 144)", NAVY = "#1a1a2e";
  const firstName = (details.proposerName ?? "").trim().split(/\s+/)[0] || "";

  const travellerRows = details.travellers.map((t, i) => `
    <tr>
      <td style="padding:10px 18px;border-bottom:${i < details.travellers.length - 1 ? "1px solid #f5f0ee" : "none"};
        font-family:Arial,sans-serif;font-size:13.5px;color:${NAVY}">${escapeHtml(t.name)}</td>
      <td style="padding:10px 18px;border-bottom:${i < details.travellers.length - 1 ? "1px solid #f5f0ee" : "none"};
        text-align:right;font-family:Arial,sans-serif;font-size:12px;color:#999">${escapeHtml(t.relation)}</td>
    </tr>`).join("");

  const html = `
<!doctype html>
<html>
<body style="margin:0;padding:0;background:#fdf6f2;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f2;padding:32px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">

          <!-- Brand header -->
          <tr>
            <td style="background:#0f0f0f;padding:20px 28px">
              <span style="font-size:20px;vertical-align:middle">🪷</span>
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px;
                font-weight:700;color:#ffffff;vertical-align:middle;margin-left:8px">Kalyanam</span>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BLUE}, rgba(21, 70, 144, 0.8));
              background-color:${BLUE};padding:36px 28px;text-align:center">
              <div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.18);
                border:2px solid rgba(255,255,255,.6);line-height:52px;text-align:center;
                font-size:26px;color:#ffffff;margin:0 auto 14px;font-family:Arial,sans-serif">✓</div>
              <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:#ffffff">
                Policy Issued${firstName ? `, ${escapeHtml(firstName)}!` : "!"}
              </div>
              <div style="font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,.85);margin-top:6px">
                Your travel insurance is active — full details below.
              </div>
            </td>
          </tr>

          <!-- Policy No / Insurer strip -->
          <tr>
            <td style="padding:22px 28px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="background:#fdf6f2;border:1px solid #f0e0d8;border-radius:10px 0 0 10px;
                    padding:14px 18px;border-right:none">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#bbb;
                      letter-spacing:.08em;text-transform:uppercase">Policy Number</div>
                    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:800;color:${O};margin-top:3px">
                      ${escapeHtml(displayPolicyNumber)}
                    </div>
                  </td>
                  <td width="50%" style="background:#fdf6f2;border:1px solid #f0e0d8;border-radius:0 10px 10px 0;
                    padding:14px 18px">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#bbb;
                      letter-spacing:.08em;text-transform:uppercase">Insurer</div>
                    <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:800;color:${NAVY};margin-top:3px">
                      ${escapeHtml(details.supplier)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Plan -->
          <tr>
            <td style="padding:26px 28px 0">
              <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:800;color:${NAVY};
                letter-spacing:.04em;margin-bottom:10px">PLAN DETAILS</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden">
                <tr>
                  <td style="padding:14px 18px">
                    <div style="font-family:Arial,sans-serif;font-size:14.5px;font-weight:700;color:${NAVY}">${escapeHtml(details.planName)}</div>
                    <div style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin-top:4px">
                      ${escapeHtml(details.destination)} &middot; ${escapeHtml(details.startDate)} &rarr; ${escapeHtml(details.endDate)}
                    </div>
                    <div style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin-top:2px">
                      Coverage: $${details.coverage.toLocaleString("en-US")}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Travellers -->
          <tr>
            <td style="padding:22px 28px 0">
              <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:800;color:${NAVY};
                letter-spacing:.04em;margin-bottom:10px">TRAVELLERS</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #f0e8e8;border-radius:10px;overflow:hidden">
                ${travellerRows}
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding:22px 28px 0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(135deg,${O}14,${O}06);background-color:#fdf1e8;
                border:1px solid ${O}30;border-radius:10px">
                <tr>
                  <td style="padding:16px 18px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-family:Arial,sans-serif;font-size:10.5px;font-weight:800;color:${O};
                            letter-spacing:.06em;text-transform:uppercase">Total Premium Paid</div>
                          <div style="font-family:Arial,sans-serif;font-size:11px;color:#bbb;margin-top:2px">Incl. 18% GST</div>
                        </td>
                        <td align="right">
                          <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:${O}">
                            &#8377; ${details.totalPaid.toLocaleString("en-IN")}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:26px 28px 8px;text-align:center">
              <a href="${confirmationUrl}" style="display:inline-block;background:${O};background:linear-gradient(135deg,${O},${O2});
                color:#ffffff;font-family:Arial,sans-serif;font-size:14.5px;font-weight:700;text-decoration:none;
                padding:13px 34px;border-radius:24px">View Policy Details</a>
              <div style="font-family:Arial,sans-serif;font-size:10.5px;color:${PK};margin-top:16px;font-weight:700">
                🛡️ IRDAI Approved Policy
              </div>
              ${details.policyPdf ? `<div style="font-family:Arial,sans-serif;font-size:11.5px;color:#aaa;margin-top:14px">
                Your policy certificate is attached to this email as a PDF.</div>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 28px 28px">
              <div style="height:1px;background:#f0e8e8;margin-bottom:18px"></div>
              <div style="font-family:Arial,sans-serif;font-size:11.5px;color:#aaa;line-height:1.6;text-align:center">
                Need help with this policy? Reply to this email or contact our support team.<br/>
                Shree Kalyanam Corporate Travel
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

export async function sendInsuranceConfirmationEmail(to: string, details: InsuranceConfirmationDetails) {
  const displayPolicyNumber = details.policyNumber || details.policyRef;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `Policy Issued — ${displayPolicyNumber}`,
    html: buildInsuranceConfirmationHtml(details),
    attachments: details.policyPdf ? [{
      filename: `Policy-${displayPolicyNumber}.pdf`,
      content: details.policyPdf,
      contentType: "application/pdf",
    }] : undefined,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Reset your Shree Kalyanam password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">Reset your password</h2>
        <p style="color:#444;line-height:1.6">
          We received a request to reset your Shree Kalyanam corporate account password.
          Click the button below to choose a new password. This link expires in 60 minutes.
        </p>
        <p style="text-align:center;margin:32px 0">
          <a href="${resetUrl}" style="background:#8b1a1a;color:#fff;padding:12px 28px;
            border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
        </p>
        <p style="color:#999;font-size:12.5px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
