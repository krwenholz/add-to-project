# krwenholz/add-to-project

Based off the original by GitHub. This iteration includes changes to

1. support GitHub Apps as the auth mechanism
2. support regexes
3. work off labels _and_ assignees

These changes were primarily made to support planning workflows at ngrok. In supporting #1, we decided not to make this generic with one app for many other orgs, but to use a specific app internal to our org. This may change in the future.

For installation, we recommend pointing at a specific SHA, as this is both beta software.

## Usage

_See [action.yml](action.yml) for [metadata](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions) that defines the inputs, outputs, and runs configuration for this action._

_For more information about workflows, see [Using workflows](https://docs.github.com/en/actions/using-workflows)._

Create a workflow that runs when Issues or Pull Requests are opened, labeled, or assigned in your repository; this workflow also supports adding Issues to your project which are transferred into your repository. Optionally configure any filters you may want to add, such as only adding issues with certain labels, you may match labels and assignees with an `AND` or an `OR` operator.

Once you've configured your workflow, save it as a `.yml` file in your target Repository's `.github/workflows` directory.

##### Example Usage: Issue opened with labels `bug` OR `needs-triage`

```yaml
name: Add bugs to bugs project

on:
  issues:
    types:
      - opened

jobs:
  add-to-project:
    name: Add issue to project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@main
        with:
          project-url: https://github.com/orgs/<orgName>/projects/<projectNumber>
          github-app-id: ${{ secrets.APP_ID }}
          github-app-private-key: ${{ secrets.APP_PRIVATE_KEY }}
          github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
          labeled: bug, needs-triage
          label-operator: OR
```

##### Example Usage: Pull Requests labeled with `needs-review` and `size/XL`

```yaml
name: Add needs-review and size/XL pull requests to projects

on:
  pull_request:
    types:
      - labeled

jobs:
  add-to-project:
    name: Add issue to project
    runs-on: ubuntu-latest
    steps:
      - uses: krwenholz/add-to-project@main
        with:
          project-url: https://github.com/orgs/<orgName>/projects/<projectNumber>
          github-token: ${{ secrets.ADD_TO_PROJECT_PAT }}
          labeled: needs-review, size/XL
          label-operator: AND
```

#### Further reading and additional resources

- [Inputs](#inputs)
- [Supported Events](#supported-events)
- [Auth](#auth)
- [Development](#development)
- [Publish to a distribution branch](#publish-to-a-distribution-branch)

## Inputs

See `action.yml`.

## Supported Events

Currently this action supports the following [`issues` events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#issues):

- `opened`
- `labeled`
- `assigned`

and the following [`pull_request` events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request):

- `opened`
- `labeled`
- `assigned`

Using these events ensure that a given issue or pull request, in the workflow's repo, is added to the [specified project](#project-url). If [labeled input(s)](#labeled) are defined, then issues will only be added if they contain at least _one_ of the labels in the list.

## How to point the action to a commit sha

Recommended: point to a full [commit SHA](https://docs.github.com/en/get-started/quickstart/github-glossary#commit):

```yaml
jobs:
  add-to-project:
    name: Add issue to project
    runs-on: ubuntu-latest
    steps:
      - uses: krwenholz/add-to-project@<commitSHA>
        with:
          project-url: https://github.com/orgs/<orgName>/projects/<projectNumber>
          ...
```

## Auth

Create a GitHub app and install it in your organization. You'll need to grant permissions to read issues and PRs and write to projects. Then, generate a private key from the app settings page and save this as a secret accessible to your actions. Also add a secret, or hard code, the app id (available on the app's main page) and the installation id (available in the URL on the installation page).

## Development

To get started contributing to this project, clone it and install dependencies.
Note that this action runs in Node.js 16.x, so we recommend using that version
of Node (see "engines" in this action's package.json for details).

```shell
> git clone https://github.com/krwenholz/add-to-project
> cd add-to-project
> npm install
```

Or, use [GitHub Codespaces](https://github.com/features/codespaces).

See the [toolkit
documentation](https://github.com/actions/toolkit/blob/master/README.md#packages)
for the various packages used in building this action.

## Publish to a distribution branch

Actions are run from GitHub repositories, so we check in the packaged action in
the "dist/" directory.

```shell
> npm run build
> git add lib dist
> git commit -a -m "Build and package"
> git push origin releases/v1
```

Now, a release can be created from the branch containing the built action.

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
