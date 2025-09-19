import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import { getActiveDocsVersion } from "./ActiveDocsVersion";

export default function QuickInstallCommand() {
  const version = getActiveDocsVersion();

  const baseCmd = `curl -s "https://raw.githubusercontent.com/kserve/kserve/release-${version}/hack/quick_install.sh"`;

  return (
    <Tabs groupId="deployment-type">
      <TabItem value="standard" label="Standard Deployment" default>
        <pre>
          <code className="language-bash">{`${baseCmd} | bash -s -- -r`}</code>
        </pre>
      </TabItem>
      <TabItem value="knative" label="Knative">
        <pre>
          <code className="language-bash">{`${baseCmd} | bash`}</code>
        </pre>
      </TabItem>
    </Tabs>
  );
}
