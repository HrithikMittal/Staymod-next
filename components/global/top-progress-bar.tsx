"use client";

import NextTopLoader from "nextjs-toploader";

const PRIMARY_COLOR = "var(--primary)";

export default function TopProgressBar() {
  return (
    <NextTopLoader color={PRIMARY_COLOR} height={3} showSpinner={false} zIndex={9999} />
  );
}
