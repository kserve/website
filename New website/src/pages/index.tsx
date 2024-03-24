import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";

// Import Tailwind CSS for styling
import "tailwindcss/tailwind.css";
import KserveComponents from "../components/KserveComponents";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Home ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <main>
        <HomepageFeatures />
        <KserveComponents/>
      </main>
    </Layout>
  );
}
