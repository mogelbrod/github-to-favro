import { EmitterWebhookEvent } from '@octokit/webhooks'
import type { User, Repository } from '@octokit/webhooks-types'

export type FavroComment = {
  /** Common card ID */
  id: string
  /** Comment body */
  body: string
}

export type Favro = {
  /** Card ID prefix */
  prefix: string
  /** Favro organisation ID */
  org?: string
  /** Favro `email:access-token` */
  auth?: string
}

export async function githubEventToComments(
  event: EmitterWebhookEvent,
  favro: Favro,
): Promise<FavroComment[]> {
  switch (event.name) {
    /** Git push to a repository. */
    case 'push': {
			const promises: Promise<any>[] = []

      // Created branch
      if (event.payload.created) {
        const ref = event.payload
        const branch = ref.ref.replace(/^refs\/heads\//i, '')
				promises.push(maybePostFavroComments({
					type: 'branch',
					url: ref.compare,
					title: branch,
					author: ref.sender,
          repo: event.payload.repository,
          favro,
				}))
      }

      // Pushed commits
			for (let ref of event.payload.commits) {
				if (!ref.distinct) { continue }
        const msgParts = ref.message.match(/^([^\n]*)(?:\n{1,}(.+))?/s)
				promises.push(maybePostFavroComments({
					type: 'commit',
					url: ref.url,
					title: msgParts?.[1] || ref.message,
          body: msgParts?.[2],
					author: ref.author,
          repo: event.payload.repository,
          favro,
				}))
			}

			return Promise.all(promises).then(results => results.flat())
    }

    /** Discussion comment created, edited, or deleted. */
    case 'discussion_comment':
    /** Commit or diff commented on. */
    case 'commit_comment':
    /** Issue comment created, edited, or deleted. */
    case 'issue_comment': {
			if (event.payload.action !== 'created') { break }
      const ref = event.payload.comment
      return maybePostFavroComments({
				type: event.name.replace(/_comment$/, '') + ' comment',
				url: ref.html_url,
				body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /**
     * Discussion created, edited, pinned, unpinned, locked, unlocked,
     * transferred, answered, unanswered, labeled, unlabeled, had its category
     * changed, or was deleted.
     */
    case 'discussion': {
			if (event.payload.action !== 'created') { break }
      const ref = event.payload.discussion
      return maybePostFavroComments({
				type: 'discussion',
				url: ref.html_url,
				title: ref.title,
        body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /**
     * Issue opened, edited, deleted, transferred, pinned, unpinned, closed,
     * reopened, assigned, unassigned, labeled, unlabeled, milestoned,
     * demilestoned, locked, or unlocked.
     */
    case 'issues': {
      const ref = event.payload.issue
      return maybePostFavroComments({
				type: 'issue',
				url: ref.html_url,
				title: ref.title,
				body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /** Project card created, updated, or deleted. */
    case 'project_card': {
			if (event.payload.action !== 'created') { break }
      const ref = event.payload.project_card
      return maybePostFavroComments({
				type: 'project card',
				url: ref.url,
				title: ref.note,
				author: ref.creator,
        repo: event.payload.repository,
        favro,
			})
    }

    /**
     * Pull request assigned, auto merge disabled, auto merge enabled, closed,
     * converted to draft, demilestoned, dequeued, edited, enqueued, labeled,
     * locked, milestoned, opened, ready for review, reopened, review request
     * removed, review requested, synchronized, unassigned, unlabeled, or
     * unlocked.
     */
    case 'pull_request': {
			if (event.payload.action !== 'opened') { break }
      const ref = event.payload.pull_request
      return maybePostFavroComments({
				type: 'PR',
				url: ref.html_url,
				title: ref.title,
				body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /** Pull request review submitted, edited, or dismissed. */
    case 'pull_request_review': {
			if (event.payload.action !== 'submitted') { break }
      const ref = event.payload.review
      return maybePostFavroComments({
				type: 'PR review',
				url: ref.html_url,
				body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /** Pull request diff comment created, edited, or deleted. */
    case 'pull_request_review_comment': {
			if (event.payload.action !== 'created') { break }
      const ref = event.payload.comment
      return maybePostFavroComments({
				type: 'PR review comment',
				url: ref.html_url,
				body: ref.body,
				author: ref.user,
        repo: event.payload.repository,
        favro,
			})
    }

    /** Release created, edited, published, unpublished, or deleted. */
    case 'release': {
			if (event.payload.action !== 'created') { break }
      const ref = event.payload
			// TODO: Should this be shared? Maybe not given that release notes often
			// include commit titles that could reference many favro cards.
      return []
    }
  }

  return []
}

export async function maybePostFavroComments(opts: {
  favro: Favro,
	type: string,
	url: string,
	title?: string | null,
	body?: string | null,
	repo?: Repository,
	author: User | { name?: string | null, username?: string | null, email?: string | null } | string,
	authorUrl?: string,
}): Promise<FavroComment[]> {
  const favro = opts.favro.org && opts.favro.auth
    ? opts.favro as { org: string, auth: string }
    : undefined

	let haystack = opts.title || ''
	if (opts.body) {
		haystack += ' ' + opts.body
	}

  const idRegexp = new RegExp(`(?:^|[^a-z_-])${opts.favro.prefix}-([0-9]+)(?:$|[^a-z_-])`, 'gi')
  const cardIds = [...haystack.matchAll(idRegexp)].map(m => m[1])

  if (!cardIds.length) {
		favro && console.log('No favro reference found in', opts.type, opts.url)
    return []
  } else {
    favro && console.log(
      'Found favro reference(s) in',
      opts.type,
      opts.url,
      '\n' + cardIds.join(', ')
    )
  }

	let { author, authorUrl } = opts
	if (typeof author === 'object') {
		const authorAny = author as any
    // User object unfortunately doesn't include name, only login
		author = author.name || authorAny.login || authorAny.username || author.email
		authorUrl ??= authorAny.html_url || authorAny.url
    if (!authorUrl && (authorAny.login || authorAny.username)) {
      authorUrl = 'https://github.com/' + (authorAny.login || authorAny.username)
    }
	}
	author ||= 'unknown'
	if (authorUrl) {
		author = `[${author}](${authorUrl})`
	}

  // Capitalize first letter of type for proper sentence casing
  const type = opts.type.charAt(0).toUpperCase() + opts.type.slice(1)

	const comment = [
		`[${type}](${opts.url})`,
		!!opts.repo && `*in [${opts.repo.full_name}](${opts.repo.html_url})*`,
		!!author && `*by ${author}*:`,
		!!opts.title && `\n[**${opts.title}**](${opts.url})`,
		!!opts.body && `\n${opts.body}`,
	].filter(Boolean).join(' ')

  if (favro) {
    console.log(`Generated comment:\n${comment}\n`)

    await Promise.all(cardIds.map(async cardId => {
      const reqCards = (await favroRequest({
        favro,
        path: '/cards',
        query: { cardSequentialId: cardId },
      })) as any
      const cardCommonId = reqCards.entities?.[0].cardCommonId
      if (!cardCommonId) {
        console.log(`Couldn't map ${cardId} to common id, aborting`)
        return
      }
      const reqComment = await favroRequest({
        favro,
        method: 'POST',
        path: '/comments',
        payload: { cardCommonId, comment },
      }) as any
      console.log(`Posted comment ${reqComment.commentId} to card ${cardId} (common id ${cardCommonId})`)
    }))
  }

  return cardIds.map(id => ({ id, body: comment }))
}

export function favroRequest(opts: {
  favro: { org: string, auth: string },
  method?: string
  path: string
  query?: Record<string, string | number | undefined>
  payload?: Record<string, any>
}) {
  const method = opts.method || 'GET'
  let path = opts.path
  if (opts.query) {
    path += '?' + new URLSearchParams(opts.query as any).toString()
  }
  const headers: Record<string, string | number> = {
    organizationId: opts.favro.org,
    authorization: 'Basic ' + btoa(opts.favro.auth),
  }
  const hasPayload = method !== 'GET' && opts.payload
  if (hasPayload) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(`https://favro.com/api/v1${path}`, {
    method,
    headers: headers as any,
    body: hasPayload ? JSON.stringify(opts.payload) : undefined,
  }).then((res) => {
    if (!res.ok || res.status >= 400) {
      throw Object.assign(
        new Error(`Favro request error: ${res.status} ${res.statusText}`),
        res,
      )
    }
    return res.json()
  })
}
