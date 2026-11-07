import React, { type ReactNode } from "react";
import Link from "@docusaurus/Link";
import { getActiveDocsVersion } from "./ActiveDocsVersion";

// Markdown link URLs are plain strings, so `<ActiveDocsVersion />` inside one
// ends the URL at `release-`. This builds the whole URL before rendering.
export default function KServeReleaseLink({
  kind = "tree",
  path,
  children,
}: {
  kind?: "tree" | "blob";
  path: string;
  children: ReactNode;
}) {
  const version = getActiveDocsVersion();
  return (
    <Link href={`https://github.com/kserve/kserve/${kind}/release-${version}/${path}`}>
      {children}
    </Link>
  );
}
