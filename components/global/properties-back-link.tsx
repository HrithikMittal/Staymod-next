"use client";

import Link from "next/link";

import { clearLastPropertyId } from "@/utils/last-property-id";

export function PropertiesBackLink() {
  return (
    <Link
      href="/"
      onClick={() => clearLastPropertyId()}
      className="mb-2 w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      ← Properties
    </Link>
  );
}
