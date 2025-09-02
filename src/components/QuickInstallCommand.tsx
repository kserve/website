import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import { getActiveDocsVersion } from "./ActiveDocsVersion";

export default function QuickInstallCommand() {
  const version = getActiveDocsVersion();

  const baseCmd = `curl -s "https://raw.githubusercontent.com/kserve/kserve/release-${version}/hack/quick_install.sh"`;

  return (
    <Tabs groupId="deployment-type">
      <TabItem value="raw" label="Raw Deployment" default>
        <pre>
          <code className="language-bash">{`${baseCmd} | bash -r`}</code>
        </pre>
      </TabItem>
      <TabItem value="serverless" label="Serverless">
        <pre>
          <code className="language-bash">{`${baseCmd} | bash`}</code>
        </pre>
      </TabItem>
    </Tabs>
  );
}
