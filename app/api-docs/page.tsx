"use client";

import "swagger-ui-react/swagger-ui.css";
import dynamic from "next/dynamic";

// swagger-ui-react touches `window`/`document` at module scope, so it can't be server-rendered —
// load it client-only, same as any other browser-only widget in this app.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return <SwaggerUI url="/api/v1/openapi.json" />;
}
