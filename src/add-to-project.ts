import * as core from '@actions/core'
import * as github from '@actions/github'

// TODO: Ensure this (and the Octokit client) works for non-github.com URLs, as well.
// https://github.com/orgs|users/<ownerName>/projects/<projectNumber>
const urlParse =
  /^(?:https:\/\/)?github\.com\/(?<ownerType>orgs|users)\/(?<ownerName>[^/]+)\/projects\/(?<projectNumber>\d+)/

interface ProjectNodeIDResponse {
  organization?: {
    projectNext: {
      id: string
    }
  }

  user?: {
    projectNext: {
      id: string
    }
  }
}

interface ProjectAddItemResponse {
  addProjectNextItem: {
    projectNextItem: {
      id: string
    }
  }
}

export async function addToProject(): Promise<void> {
  const projectUrl = core.getInput('project-url', {required: true})
  const ghToken = core.getInput('github-token', {required: true})
  const labeled =
    core
      .getInput('labeled')
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => new RegExp(l)) ?? []
  const labelOperator = core.getInput('label-operator').trim().toLocaleLowerCase()
  const assigned =
    core
      .getInput('assigned')
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(l => new RegExp(l)) ?? []
  const assigneeOperator = core.getInput('assignee-operator').trim().toLocaleLowerCase()

  const octokit = github.getOctokit(ghToken)
  const urlMatch = projectUrl.match(urlParse)
  const issue = github.context.payload.issue ?? github.context.payload.pull_request
  const issueLabels: string[] = (issue?.labels ?? []).map((l: {name: string}) => l.name)
  const issueAssignees: string[] = (issue?.assignees ?? []).map((a: {login: string}) => a.login)

  // Ensure the issue matches our `labeled` filter based on the label-operator.
  if (labelOperator === 'and') {
    if (!labeled.every(lr => issueLabels.some(il => lr.test(il)))) {
      core.info(`Skipping issue ${issue?.number} because it doesn't match all the labels: ${labeled.join(', ')}`)
      return
    }
  } else {
    if (labeled.length > 0 && !issueLabels.some(il => labeled.some(lr => lr.test(il)))) {
      core.info(`Skipping issue ${issue?.number} because it does not have one of the labels: ${labeled.join(', ')}`)
      return
    }
  }

  // Ensure the issue matches our `assigned` filter based on the assignee-operator.
  if (assigneeOperator === 'and') {
    if (!assigned.every(ar => issueAssignees.some(ia => ar.test(ia)))) {
      core.info(`Skipping issue ${issue?.number} because it doesn't match all the assignees: ${assigned.join(', ')}`)
      return
    }
  } else {
    if (assigned.length > 0 && !issueAssignees.some(ia => assigned.some(ar => ar.test(ia)))) {
      core.info(`Skipping issue ${issue?.number} because it does not have one of the assignees: ${assigned.join(', ')}`)
      return
    }
  }

  core.debug(`Project URL: ${projectUrl}`)

  if (!urlMatch) {
    throw new Error(
      `Invalid project URL: ${projectUrl}. Project URL should match the format https://github.com/<orgs-or-users>/<ownerName>/projects/<projectNumber>`
    )
  }

  const ownerName = urlMatch.groups?.ownerName
  const projectNumber = parseInt(urlMatch.groups?.projectNumber ?? '', 10)
  const ownerType = urlMatch.groups?.ownerType
  const ownerTypeQuery = mustGetOwnerTypeQuery(ownerType)

  core.debug(`Org name: ${ownerName}`)
  core.debug(`Project number: ${projectNumber}`)
  core.debug(`Owner type: ${ownerType}`)

  // First, use the GraphQL API to request the project's node ID.
  const idResp = await octokit.graphql<ProjectNodeIDResponse>(
    `query getProject($ownerName: String!, $projectNumber: Int!) { 
      ${ownerTypeQuery}(login: $ownerName) {
        projectNext(number: $projectNumber) {
          id
        }
      }
    }`,
    {
      ownerName,
      projectNumber
    }
  )

  const projectId = idResp[ownerTypeQuery]?.projectNext.id
  const contentId = issue?.node_id

  core.debug(`Project node ID: ${projectId}`)
  core.debug(`Content ID: ${contentId}`)

  // Next, use the GraphQL API to add the issue to the project.
  const addResp = await octokit.graphql<ProjectAddItemResponse>(
    `mutation addIssueToProject($input: AddProjectNextItemInput!) {
      addProjectNextItem(input: $input) {
        projectNextItem {
          id
        }
      }
    }`,
    {
      input: {
        contentId,
        projectId
      }
    }
  )

  core.setOutput('itemId', addResp.addProjectNextItem.projectNextItem.id)
}

export function mustGetOwnerTypeQuery(ownerType?: string): 'organization' | 'user' {
  const ownerTypeQuery = ownerType === 'orgs' ? 'organization' : ownerType === 'users' ? 'user' : null

  if (!ownerTypeQuery) {
    throw new Error(`Unsupported ownerType: ${ownerType}. Must be one of 'orgs' or 'users'`)
  }

  return ownerTypeQuery
}
