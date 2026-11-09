"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[GLOBAL_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff1f2",
          color: "#1f2937",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>
            The store hit an unexpected error
          </h1>
          <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 20 }}>
            Your data is safe. Please reload the page to continue shopping.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#881337",
              color: "white",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
