export type GithubWebhookEvent = {
  ref: string
  before: string
  after: string
  repository: {
    id: number
    node_id: string
    name: string
    full_name: string
    private: true
    owner: {
      name: string
      email: string
      login: string
      id: number
      node_id: string
      avatar_url: string
      gravatar_id: string
      url: string
      html_url: string
      followers_url: string
      following_url: string
      gists_url: string
      starred_url: string
      subscriptions_url: string
      organizations_url: string
      repos_url: string
      events_url: string
      received_events_url: string
      type: string
      site_admin: false
    }
    html_url: string
    description: null
    fork: false
    url: string
    forks_url: string
    keys_url: string
    collaborators_url: string
    teams_url: string
    hooks_url: string
    issue_events_url: string
    events_url: string
    assignees_url: string
    branches_url: string
    tags_url: string
    blobs_url: string
    git_tags_url: string
    git_refs_url: string
    trees_url: string
    statuses_url: string
    languages_url: string
    stargazers_url: string
    contributors_url: string
    subscribers_url: string
    subscription_url: string
    commits_url: string
    git_commits_url: string
    comments_url: string
    issue_comment_url: string
    contents_url: string
    compare_url: string
    merges_url: string
    archive_url: string
    downloads_url: string
    issues_url: string
    pulls_url: string
    milestones_url: string
    notifications_url: string
    labels_url: string
    releases_url: string
    deployments_url: string
    created_at: number
    updated_at: string
    pushed_at: number
    git_url: string
    ssh_url: string
    clone_url: string
    svn_url: string
    homepage: null
    size: number
    stargazers_count: number
    watchers_count: number
    language: null
    has_issues: true
    has_projects: true
    has_downloads: true
    has_wiki: true
    has_pages: false
    forks_count: number
    mirror_url: null
    archived: false
    disabled: false
    open_issues_count: number
    license: null
    allow_forking: true
    is_template: false
    web_commit_signoff_required: false
    topics: []
    visibility: string
    forks: number
    open_issues: number
    watchers: number
    default_branch: string
    stargazers: number
    master_branch: string
  }
  pusher: {
    name: string
    email: string
  }
  sender: {
    login: string
    id: number
    node_id: string
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    followers_url: string
    following_url: string
    gists_url: string
    starred_url: string
    subscriptions_url: string
    organizations_url: string
    repos_url: string
    events_url: string
    received_events_url: string
    type: string
    site_admin: false
  }
  created: true
  deleted: false
  forced: false
  base_ref: null
  compare: string
  commits: [
    {
      id: string
      tree_id: string
      distinct: true
      message: string
      timestamp: string
      url: string
      author: {
        name: string
        email: string
        username: string
      }
      committer: {
        name: string
        email: string
        username: string
      }
      added: string[]
      removed: []
      modified: []
    },
  ]
  head_commit: {
    id: string
    tree_id: string
    distinct: true
    message: string
    timestamp: string
    url: string
    author: {
      name: string
      email: string
      username: string
    }
    committer: {
      name: string
      email: string
      username: string
    }
    added: string[]
    removed: []
    modified: []
  }
}
