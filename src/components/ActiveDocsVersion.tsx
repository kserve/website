import React from 'react';
import {useDocsVersion, useAllDocsData} from '@docusaurus/plugin-content-docs/client';

export function getActiveDocsVersion(): string {
  const version = useDocsVersion(); // gets current docs version metadata
  const allDocsData = useAllDocsData();
  const latestVersion = Object.values(allDocsData)[0]?.versions.find(
    (version) => version.isLast
  );
  if (version.version === 'current') {
    // TODO: Remove the hardcoded version and uncomment the line below when 0.16 release is available.
    return '0.15';
    // return latestVersion.label;
  } else {
    return version.label;
  }
}

export default function ActiveDocsVersion() {
  const version = getActiveDocsVersion();
  return <span>{version}</span>;
}

