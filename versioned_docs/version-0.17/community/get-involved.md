---
title: Get Involved
description: How to contribute to the KServe community
---
# Getting Involved with KServe

Welcome to the KServe community! We're excited to have you contribute to the standard Model Inference Platform on Kubernetes.

Join us🤝!

## Ways to Contribute

### 🐛 Report Issues

Found a bug or have a feature request? Help us improve KServe:

- **Bug Reports**: [Create an issue](https://github.com/kserve/kserve/issues/new?template=bug_report.md).
- **Feature Requests**: [Request a feature](https://github.com/kserve/kserve/issues/new?template=feature_request.md).
- **Documentation**: Help improve our docs by submitting [PRs](https://github.com/kserve/website/pulls).

A good bug report should include:

- **Description**: Clearly state what you were trying to accomplish and what behavior you observed instead
- **Versions**: Specify the versions of relevant components:
   - KServe version
   - Knative version (if using Knative serverless deployment)
   - Kubeflow version (if used with Kubeflow)
   - Kubernetes version
   - Cloud provider details (if applicable)
- **Relevant resource YAMLs, HTTP requests, or log lines**

For documentation issues, please use the [KServe Website repository](https://github.com/kserve/website/issues/new/choose).

For Open Inference Protocol (V2) related issues, please use the [Open Inference Protocol repository](https://github.com/kserve/open-inference-protocol/issues/new).

### 🔒 Vulnerability Reports

We strongly encourage you to report security vulnerabilities privately, before disclosing them in any public forums. Only the active maintainers and KServe security group members will receive the reported security vulnerabilities and the issues are treated as top priority.

You can use the following ways to report security vulnerabilities privately:

- Using the [KServe repository GitHub Security Advisory](https://github.com/kserve/kserve/security/advisories/new) (Recommended)
- Using our private security mailing list: [kserve-security@lists.lfaidata.foundation](mailto:kserve-security@lists.lfaidata.foundation)

Also read the [KServe Security Policy](https://github.com/kserve/kserve/security/policy).

### 💻 Code Contributions

#### Getting Started

1. **Fork the Repository**: [Fork KServe on GitHub](https://github.com/kserve/kserve/fork).
2. **Set Up Development Environment**: Follow our [developer guide](../developer-guide/index.md).
3. **Find an Issue**: Look for [`good first issue`](https://github.com/kserve/kserve/labels/good%20first%20issue) labels.
4. **Submit a Pull Request**: Follow our [contribution guidelines](../developer-guide/index.md).

#### Areas to Contribute

- **Core Platform**: Improve controller and APIs
- **Model Serving Runtimes**: Add support for new ML frameworks
- **Model Operations**: Improve monitoring, logging, and observability
- **Documentation**: Help improve guides and examples

### 📝 Documentation

Help make KServe more accessible:

- **User Guides**: Write tutorials and how-to guides.
- **API Documentation**: Improve API reference documentation.
- **Examples**: Create example applications and use cases.
- **Translations**: Help translate documentation.

### 🗣️ Community Engagement

#### Join Our Discussions

Much of the community meets on [the CNCF Slack](https://slack.cncf.io/), using the following channels:

- **Slack**: 
  - [#kserve](https://cloud-native.slack.com/archives/C06AH2C3K8B): General discussion about KServe usage
  - [#kserve-contributors](https://cloud-native.slack.com/archives/C06KZRPSDS7): Discussion for folks contributing to the KServe project
  - [#kserve-oip-collaboration](https://cloud-native.slack.com/archives/C06P4SYCNRX): Discussion for Open Inference Protocol and API standardization

To join, [create your CNCF Slack account](https://slack.cncf.io/) first.

- **GitHub Discussions**: Participate in [GitHub Discussions](https://github.com/kserve/kserve/discussions)

#### Community Meetings

- **KServe WG Meeting**: [Biweekly on Thursdays at 9:00 AM US/Pacific](https://zoom-lfx.platform.linuxfoundation.org/meeting/96510876294?password=feb2c41a-961a-435f-bfbd-97e2c068d401)
- **Open Inference Protocol WG Meeting**: Monthly on Wednesdays at 10:00 AM US/Pacific

Meeting agendas and notes can be accessed in:
- [KServe WG working group document](https://docs.google.com/document/d/1KZUURwr9MnHXqHA08TFbfVbM8EAJSJjmaMhnvstvi-k)
- [Open Inference Protocol WG working group document](https://docs.google.com/document/d/1f21bja1ejHPrZRmY5ke0UxKVD26j0VntJxx0qGN3fKE)

Access recordings and stay updated with the [community calendar](https://zoom-lfx.platform.linuxfoundation.org/meetings/kserve?view=month) ([iCal export file](https://webcal.prod.itx.linuxfoundation.org/lfx/a092M00001LkOceQAF))

### 🎤 Speaking & Advocacy

Share your KServe experience:

- **Conference Talks**: Present at conferences and meetups
- **Blog Posts**: Write about your KServe implementations
- **Case Studies**: Share your production use cases
- **Social Media**: Help spread awareness about KServe

## Community Guidelines

### Code of Conduct

We follow the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/master/code-of-conduct.md). Please be respectful and inclusive in all interactions.

### Communication

- **Be Respectful**: Treat all community members with respect
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Patient**: Remember that contributors have different experience levels
- **Be Inclusive**: Welcome newcomers and help them get started

## Resources

### Documentation

- **[Developer Guide](../developer-guide/index.md)**: Development setup and guidelines
- **[API Reference](../reference/crd-api.mdx)**: Complete API documentation
- **[Architecture Guide](../concepts/architecture/index.md)**: Understanding KServe architecture

## Getting Help

### For Contributors

- **Slack**: Ask questions in the appropriate Slack channels:
  - [#kserve](https://cloud-native.slack.com/archives/C06AH2C3K8B) for general usage questions
  - [#kserve-contributors](https://cloud-native.slack.com/archives/C06KZRPSDS7) for contribution discussions
  - [#kserve-oip-collaboration](https://cloud-native.slack.com/archives/C06P4SYCNRX) for Open Inference Protocol discussions
- **GitHub Issues**: Create issues for bugs or questions
- **Community Meetings**: Get help during our biweekly or monthly community meetings
- **Developer Guide**: Follow our [developer guide](../developer-guide/index.md) to get started with contributions

### For Users

- **Documentation**: Check our comprehensive guides
- **Slack**: Ask questions in the `#kserve` channel
- **GitHub Discussions**: Ask usage questions

## License

KServe is licensed under the [Apache 2.0 License](https://github.com/kserve/kserve/blob/master/LICENSE). By contributing, you agree to license your contributions under the same license.

## Thank You!

Thank you for your interest in contributing to KServe! Your contributions help make model serving on Kubernetes better for everyone.

Feel free to ask questions, engage in discussions, or get involved in KServe's development. KServe, as an open-source project, thrives on the active participation of its community.

Ready to get started? Check out our [developer guide](../developer-guide/index.md) or join our [Slack community](https://cloud-native.slack.com/archives/C06AH2C3K8B)!
