---
title: "Contribution Guide"
description: "Guidelines for contributing to KServe"
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Contribution Guide

This guide provides detailed information on how to contribute to KServe. It complements the [general developer guide](./index.md) by focusing specifically on the contribution workflow and best practices.

## Getting Started with Contributions

Before you begin contributing to KServe, make sure you:

1. Have set up your [development environment](./index.md#prerequisites)
2. Are familiar with the [KServe architecture](../concepts/architecture/index.md)
3. Have read the [CNCF Code of Conduct](#code-of-conduct)

## Code of Conduct

All members of the KServe community must abide by the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md). This code establishes the guidelines for respectful, constructive participation in the community.

## Ways to Contribute

KServe welcomes contributions in various forms - from code changes and bug fixes to documentation improvements and issue reporting. The sections below provide detailed guidance for different types of contributions.

## Common Contribution Scenarios

### Adding a New Feature

When contributing a significant feature to KServe, follow this comprehensive process:

#### Step 1: Discuss Your Idea
- Start by discussing your idea with the working group on [Slack](https://cloud-native.slack.com/archives/C06KZRPSDS7).
- Get initial feedback and gauge community interest.

#### Step 2: Create a GitHub Issue
- Once there's general agreement, create a GitHub issue.
- Include detailed requirements, use cases, and proposed implementation.

#### Step 3: Design Documentation
KServe uses a two-step approach for design documentation:

- **For Initial Feedback**: Use the [RFC template](https://docs.google.com/document/d/1UcBeLfZ_JMGpVrPJmYtEIVH_9Y4U3AEKQdq_IKuOMrU) to outline your ideas.
- **After Consensus**: Use the [design doc template](https://docs.google.com/document/d/1Mtoui_PP2a9N59NjYHnsvrdJ8t2iKFwIJAx1zRO_I1c) for detailed specifications.
- Share documents with the community by adding them to the shared Google Drive.
- Notify the working group when your document is ready for review.

#### Step 4: Community Review
- Participate in working group meetings to discuss the design if needed.
- Address feedback and iterate on the design.
- Post a note to the working group with the final design decision and execution plan.

#### Step 5: Implementation and PRs
- Break the work into manageable "bite-sized" PRs instead of "giant monster" PRs.
- Submit PRs to [kserve/kserve](https://github.com/kserve/kserve) with your code changes.
- Ensure each PR includes:
  - Necessary tests (unit and integration)
  - Documentation updates
  - Working code that passes CI checks
  - Performance improvements (if applicable)

#### Step 6: Documentation
- Submit documentation to [kserve/website](https://github.com/kserve/website) with usage examples.
- Ensure your documentation is clear and includes practical examples.
- Update user guides and relevant documentation.

:::tip
For substantial features, creating a design document is crucial for getting proper feedback and ensuring your implementation aligns with KServe's architecture and goals.
:::

### Fixing a Bug

When fixing a bug:
1. Create an issue to describe the bug if it doesn't already exist
2. Include the version of KServe you were using (version number or git commit)
3. Provide your setup environment details
4. Document the exact, minimal steps needed to reproduce the issue
5. Start with a reproducible test case
6. Add a failing test that demonstrates the bug
7. Fix the code so the test passes
8. Consider adding more tests to prevent regression

### Improving Documentation

When improving documentation:
1. Ensure technical accuracy
2. Make sure examples are up to date
3. Check for typos and grammar issues
4. Consider adding diagrams for complex concepts
5. Update or expand existing documentation
6. Create new tutorials or code examples where needed
7. Test any code examples to ensure they work

### Reporting Security Vulnerabilities

When you discover a security vulnerability in KServe, follow this secure reporting process:

#### Step 1: Keep It Confidential
- **DO NOT create a public GitHub issue** for the vulnerability
- **DO NOT discuss the vulnerability publicly** until it has been addressed

#### Step 2: Report Through Proper Channels
Use one of these secure channels to report the vulnerability:
- [GitHub Security Advisory](https://github.com/kserve/kserve/security/advisories/new) (preferred method)
- Email the KServe security team at [kserve-security@lists.lfaidata.foundation](mailto:kserve-security@lists.lfaidata.foundation)

#### Step 3: Provide Detailed Information
Include the following information in your report:
- Description of the vulnerability
- Detailed reproduction steps
- Potential impact on systems or users
- Any suggested fixes (if you have them)
- Your contact information for follow-up

#### Step 4: Collaborate on Resolution
The KServe security team will follow this process:
- Acknowledge receipt within 5 business days
- Investigate the issue thoroughly
- Keep you informed of progress
- Work with you to validate fixes
- Coordinate the public disclosure process
- Credit you for the discovery (unless you prefer to remain anonymous)

:::tip
For more details on our security process, visit the [KServe Security Policy](https://github.com/kserve/kserve/security/policy).
:::

### Submitting Feature Requests

When requesting a new feature:
1. Check existing issues to avoid duplicates
2. Create a GitHub issue with the "Feature request" template
3. Clearly describe the problem the feature would solve
4. Suggest an approach or implementation if you have one
5. Explain the benefit to KServe users

## Contribution Workflow

### 1. Find or Create an Issue

Start by finding an existing issue to work on or create a new one if needed:

1. Browse [existing issues](https://github.com/kserve/kserve/issues)
2. Filter by labels like `good first issue` or `help wanted`
3. If creating a new issue, clearly describe the problem or enhancement

### 2. Fork and Clone

Follow these steps to get the code:

1. Fork the KServe repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kserve.git
   cd kserve
   git remote add upstream https://github.com/kserve/kserve.git
   ```

### 3. Create a Branch

Create a new branch for your work:

```bash
git checkout -b fix-issue-123  # Use a descriptive name related to the issue
```

### 4. Make Your Changes

When making changes:

- Follow the [KServe coding conventions](#coding-conventions)
- Add or update tests as needed
- Update documentation to reflect your changes
- Run `make precommit` to ensure your changes pass all checks

### 5. Commit Your Changes

Write clear, concise commit messages:

```bash
git commit -m "Brief description of the change

Longer description explaining the problem and solution.
Fixes #123"
```

### 6. Keep Your Branch Updated

Regularly sync your branch with upstream to avoid merge conflicts:

```bash
git fetch upstream
git rebase upstream/master
```

### 7. Push Your Changes

Push your changes to your fork:

```bash
git push origin fix-issue-123
```

### 8. Submit a Pull Request

Create a pull request from your branch to the KServe main repository:

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch and target the main KServe repository
4. Fill in the PR template with all required information
5. Link related issues using "Fixes #123" or "Relates to #456" syntax
6. **Sign off your commits** using `git commit -s` or adding a "Signed-off-by" line to your commit message

### 9. Documentation Updates

When making code changes that affect functionality:

1. Update the corresponding and all related documentation in the [website repository](https://github.com/kserve/website)
2. [**Follow the documentation guidelines**](#documentation-best-practices) for formatting and structure
3. **Keep content accurate**: Ensure examples work with the latest KServe version
4. **Use clear language**: Avoid jargon and explain complex concepts
5. **Add examples**: Code samples help users understand concepts quickly
6. **Preview changes**: Test documentation changes locally before submitting
7. **Submit documentation PRs** to the [kserve/website](ghttps://github.com/kserve/website) repository.

Your PR should be 100% complete, including:
- All test cases (including e2e tests for new features)
- Documentation changes related to your change
- Verification that the entire CI process works

:::note
For new features, add e2e tests in the [test/e2e directory](https://github.com/kserve/kserve/tree/master/test/e2e).
:::

For additional guidance, see [Writing Good Pull Requests](https://github.com/istio/istio/wiki/Writing-Good-Pull-Requests).

### 9. Respond to Feedback

After submitting a PR:
- CI tests will run automatically
- Maintainers will review your code following the process described in [Reviewing Pull Requests](https://github.com/istio/istio/wiki/Reviewing-Pull-Requests)
- Address any feedback or questions promptly
- Make changes as needed and push to update the PR


## Coding Conventions

### Go Code Standards

- Follow the [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- Use `go fmt` for formatting code
- Run `go vet` to check for common errors
- Use meaningful variable and function names
- Add comments for exported functions

### Python Code Standards

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines
- Use [Black](https://black.readthedocs.io/) for code formatting
- Run `flake8` for linting
- Include docstrings for all functions and classes

### Testing

- Unit tests are required for all code changes
- Ensure existing tests pass with your changes
- For new features, add integration tests
- Aim for good test coverage

## Getting Help

If you need help during the contribution process:
- Ask questions in the [#kserve channel on Kubernetes Slack](https://kubernetes.slack.com/archives/C9VNFNK56)
- Attend KServe community meetings
- Comment on GitHub issues for specific questions
- Reach out to maintainers if you're stuck

## Code Review Process

Understanding the code review process can help your contributions get accepted faster:

1. **Initial Review**: Maintainers perform an initial review to check if the PR meets basic requirements
2. **Technical Review**: Deeper review of the code logic, architecture, and performance implications
3. **Final Review**: Final check before merging, often done by a maintainer with merge privileges

## Contribution Best Practices

### Pull Request Size and Scope

- **Keep PRs focused and small**: Each PR should address a single issue or feature
- **Avoid scope creep**: If you find additional problems while working, create separate issues/PRs
- **Split large changes**: Break large features into smaller, logically complete PRs
- **Aim for 300-500 lines**: Generally, smaller PRs get reviewed faster and have fewer issues

### Code Quality Expectations

- **Pass all CI checks**: All tests, linters, and other checks must pass
- **Maintain test coverage**: Add unit tests for new code and update existing tests
- **Follow Go best practices**: Use [Effective Go](https://golang.org/doc/effective_go.html) as a guide
- **Comment your code**: Add comments for complex logic and public APIs
- **Use meaningful variable names**: Clear, descriptive names make code more maintainable

### Documentation Best Practices

When contributing to the documentation, follow these Docusaurus-specific best practices:

#### File Structure and Organization

- **Place new files** in the appropriate directory under `docusaurus/docs/`
- **Use kebab-case** for file names (e.g., `my-feature-guide.md`)
- **Include frontmatter** at the top of each document:
  ```md
  ---
  title: "Document Title"
  description: "Brief description of the document content"
  ---
  ```

#### Formatting Guidelines

- **Use relative links** for internal references:
  ```md
  <!-- Correct -->
  [link to installation guide](../installation/index.md)
  
  <!-- Incorrect -->
  [link to installation guide](/docs/installation/index.md)
  ```

- **Use Docusaurus admonitions** properly:
  ```md
  :::note
  This is a note admonition for general information.
  :::
  
  :::tip
  This is a tip admonition for helpful hints.
  :::
  
  :::warning
  This is a warning admonition for important cautions.
  :::
  
  :::danger
  This is a danger admonition for critical warnings.
  :::
  ```
  
  :::note
  Use `tip` instead of `success` admonition throughout the documentation.
  :::

#### Code Blocks

- **Specify language** for syntax highlighting:
  ```yaml
  apiVersion: serving.kserve.io/v1beta1
  kind: InferenceService
  ```

- **Use tabbed code blocks** for multiple implementations:

  <Tabs>
  <TabItem value="yaml" label="YAML">

  ```yaml
  apiVersion: serving.kserve.io/v1beta1
  kind: InferenceService
  ```

  </TabItem>
  <TabItem value="python" label="Python">

  ```python
  from kubernetes import client
  ```

  </TabItem>
  </Tabs>

#### Images and Media

- **Store images** in the `docusaurus/static/img/` directory
- **Reference images** using the public URL path:
  ```md
  ![Alt text](/img/example-diagram.png)
  ```
- **Include alt text** for all images for accessibility
- **Optimize images** before adding them to the repository

#### Versioning

- **Be aware of documentation versions** when making changes
- **Check if your changes** need to be applied across multiple versions
- **Update version-specific examples** if they refer to different KServe versions

#### Local Testing

Before submitting documentation PRs:

1. **Build the documentation locally**:
   ```bash
   cd website/docusaurus
   npm install
   npm start
   ```

2. **Verify your changes** in the local preview at `http://localhost:3000`
3. **Check links** to ensure they work correctly
4. **Test on mobile view** using browser developer tools

### PR Review Process

#### What to Expect

1. **Initial review**: Within 1-3 business days of submission
2. **Feedback cycles**: The PR might require multiple iterations based on reviewer feedback
3. **Required approvals**: Most PRs require at least 2 approvals from maintainers
4. **CI validation**: All automated tests and checks must pass

#### Responding to Reviews

- **Be responsive**: Try to address feedback promptly
- **Keep discussions technical**: Focus on the code, not the person
- **Ask clarifying questions**: If feedback isn't clear, ask for clarification
- **Update in batches**: Address all related feedback in a single update when possible

### Handling Your First Contribution

If you're new to KServe:

1. **Start small**: Pick a small bug fix or documentation improvement
2. **Ask questions**: Join the [KServe Slack channel](https://kubernetes.slack.com/archives/CH6E58LNP) for help
3. **Be patient**: Your first PR might take longer to review as you learn the process
4. **Learn from feedback**: Use the review process as a learning opportunity


:::tip
For faster reviews, include screenshots or before/after comparisons when making UI or documentation changes.
:::

## After Your PR is Merged

Once your PR is merged:

1. **Delete your branch**: Clean up your local and remote branches
2. **Update your fork**: Sync your fork with the upstream repository
3. **Celebrate**: You've made a valuable contribution to KServe!
4. **Look for new challenges**: Find another issue to work on

## Project Membership

KServe has different roles for community members based on their level of contribution and involvement. To learn about these roles and the path to becoming a member, see the [Project Membership document](https://github.com/kserve/community/blob/main/membership.md).

The Technical Steering Committee (TSC) periodically reviews contributor activity and proposes membership status changes.

### Becoming a KServe Member

If you're interested in becoming a KServe member:

1. **Contribute regularly**: Show sustained, high-quality contributions
2. **Help others**: Answer questions in the community channels
3. **Review PRs**: Help review other contributors' pull requests
4. **Follow the process**: Read the [KServe governance docs](https://github.com/kserve/community/blob/main/GOVERNANCE.md) for full details

### Contributing Organizations

If your organization uses KServe, consider adding it to the [adopters page](https://kserve.github.io/website/master/community/adopters). There are categories for:
- Providers (who offer hosted/managed KServe services)
- End users (who use and consume KServe)
- Integrations (commercial or open source products that work with KServe)

To add your organization, submit a PR with your logo (preferably in SVG format) to the [website repository](https://github.com/kserve/website/tree/main/docs/adopters).


## Community Engagement

Refer to the [KServe Community](../community/get-involved.md) page for information on how to engage with the KServe community, including:
- Community meetings
- Slack channels
