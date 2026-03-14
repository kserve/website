import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "reference/oip/data-plane",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "reference/oip/get-v-2-health-live",
          label: "Server Live",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "reference/oip/get-v-2-health-ready",
          label: "Server Ready",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "reference/oip/get-v-2-models-model-name-versions-model-version-ready",
          label: "Model Ready",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "reference/oip/get-v-2",
          label: "Server Metadata",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "reference/oip/get-v-2-models-model-name-versions-model-version",
          label: "Model Metadata",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "reference/oip/post-v-2-models-model-name-versions-model-version-infer",
          label: "Inference",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
