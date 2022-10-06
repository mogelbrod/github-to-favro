import { EmitterWebhookEvent, Webhooks } from '@octokit/webhooks'
import type { User, Repository } from '@octokit/webhooks-types'

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

const FAVRO_ORG = '86ba35bfb4e08917e2b8226e'
const FAVRO_AUTH = ''
const GITHUB_WEBHOOK_SECRET = ''

const webhooks = new Webhooks({
  secret: GITHUB_WEBHOOK_SECRET,
})

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const headers = Object.fromEntries(req.headers.entries())
    const data = await req.json()
    try {
      await webhooks.verifyAndReceive({
        id: req.headers.get('x-github-delivery')!,
        name: req.headers.get('x-github-event')! as any,
        signature: req.headers.get('x-hub-signature-256')!,
        payload: data as any,
      })
      console.log('webhook received')
      return jsonResponse({ ok: true })
    } catch (error) {
      console.error(error)
      return jsonResponse({ ok: false, error }, 500)
    }
  },
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

webhooks.onAny(async (event): Promise<any> => {
  switch (event.name) {
    /** Discussion comment created, edited, or deleted. */
    case 'discussion_comment':
    /** Commit or diff commented on. */
    case 'commit_comment':
    /** Issue comment created, edited, or deleted. */
    case 'issue_comment': {
			if (event.payload.action !== 'created') { return }
      const ref = event.payload.comment
      return maybePostFavroComments({
				type: event.name.replace(/_comment$/, '') + ' comment',
				url: ref.html_url,
				preview: ref.body,
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /**
     * Discussion created, edited, pinned, unpinned, locked, unlocked,
     * transferred, answered, unanswered, labeled, unlabeled, had its category
     * changed, or was deleted.
     */
    case 'discussion': {
			if (event.payload.action !== 'created') { return }
      const ref = event.payload.discussion
      return maybePostFavroComments({
				type: 'discussion',
				url: ref.html_url,
				preview: ref.title,
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /**
     * Issue opened, edited, deleted, transferred, pinned, unpinned, closed,
     * reopened, assigned, unassigned, labeled, unlabeled, milestoned,
     * demilestoned, locked, or unlocked.
     */
    case 'issues': {
			if (event.payload.action !== 'opened') { return }
      const ref = event.payload.issue
      return maybePostFavroComments({
				type: 'issue',
				url: ref.html_url,
				preview: ref.title,
				haystack: ref.title + ' ' + ref.body,
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /** Project card created, updated, or deleted. */
    case 'project_card': {
			if (event.payload.action !== 'created') { return }
      const ref = event.payload.project_card
      return maybePostFavroComments({
				type: 'project card',
				url: ref.url,
				preview: ref.note || '',
				author: ref.creator,
				repo: event.payload.repository,
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
			if (event.payload.action !== 'opened') { return }
      const ref = event.payload.pull_request
      return maybePostFavroComments({
				type: 'PR',
				url: ref.html_url,
				preview: ref.title,
				haystack: ref.title + ' ' + ref.body,
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /** Pull request review submitted, edited, or dismissed. */
    case 'pull_request_review': {
			if (event.payload.action !== 'submitted') { return }
      const ref = event.payload.review
      return maybePostFavroComments({
				type: 'PR review',
				url: ref.html_url,
				preview: ref.body || '',
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /** Pull request diff comment created, edited, or deleted. */
    case 'pull_request_review_comment': {
			if (event.payload.action !== 'created') { return }
      const ref = event.payload.comment
      return maybePostFavroComments({
				type: 'PR review comment',
				url: ref.html_url,
				preview: ref.body,
				author: ref.user,
				repo: event.payload.repository,
			})
    }

    /** Git push to a repository. */
    case 'push': {
			const promises: Promise<any>[] = []
			for (let ref of event.payload.commits) {
				if (!ref.distinct) { continue }
				const author = ref.author.name || ref.author.username || ref.author.email
				promises.push(maybePostFavroComments({
					type: 'commit',
					url: ref.url,
					preview: ref.message,
					author: ref.author,
					repo: event.payload.repository,
				}))
			}
			return Promise.all(promises)
    }

    /** Release created, edited, published, unpublished, or deleted. */
    case 'release': {
			if (event.payload.action !== 'created') { return }
      const ref = event.payload
			// TODO: Should this be shared? Maybe not given that release notes often
			// include commit titles that could reference many favro cards.
      return null
    }
  }

  return null
})

/*
curl -H 'organizationId: 86ba35bfb4e08917e2b8226e' -u 'victor@soundtrackyourbrand.com:btGYdofgybODGJc7w1HppMvoL-md4NB9X6dtxJC30Bu' 'https://favro.com/api/v1/cards?cardSequentialId=Sou-47482' | jq '.entities[].cardCommonId'

curl -H 'organizationId: 86ba35bfb4e08917e2b8226e' -u 'victor@soundtrackyourbrand.com:btGYdofgybODGJc7w1HppMvoL-md4NB9X6dtxJC30Bu' \
    -X POST "https://favro.com/api/v1/comments" \
    -H "Content-Type: application/json" \
    -d '{
        "cardCommonId": "cc0e60cce4ff112619940619",
        "comment": "Sent from *bold*, [link](https://google.com).\\nNew line.\\n\\nNew paragraph."
    }'
*/

async function maybePostFavroComments(opts: {
	type: string,
	url: string,
	preview?: string,
	haystack?: string,
	repo?: Repository,
	author: User | { name?: string | null, username?: string | null, email?: string | null } | string,
	authorUrl?: string,
}) {
	const haystack = opts.haystack || opts.preview || ''

	// TODO: Find and post to all references
  const cardId = findFavroReference(haystack)
  if (cardId == null) {
		console.log('No favro reference found in', opts.type, opts.url)
    return false
  }

	let { author, authorUrl } = opts
	if (typeof author === 'object') {
		const authorAny = author as any
		author = author.name || authorAny.login || authorAny.username || author.email
		authorUrl ??= authorAny.html_url || authorAny.url
	}
	author = `*${author || 'unknown'}*`
	if (authorUrl) {
		author = `[${author}](${opts.authorUrl})`
	}

	const comment = [
		`[**Github ${opts.type}**](${opts.url})`,
		!!opts.repo && `in [${opts.repo.full_name}](${opts.repo.html_url})`,
		!!author && `by ${author}:`,
		!!opts.preview && `\n${opts.preview}`,
	].filter(Boolean).join(' ')

	console.log(`Generated comment for ${cardId}:\n${comment}\n`)

  const reqCards = (await favroRequest({
    path: '/cards',
    query: { cardSequentialId: cardId },
  })) as any
  const cardCommonId = reqCards.entities?.[0].cardCommonId
  const reqComment = await favroRequest({
    method: 'POST',
    path: '/comments',
    payload: { cardCommonId, comment },
  })

	console.log(`Posted comment to ${cardId} with common id ${cardCommonId}`)
  return true
}

function favroRequest(opts: {
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
    organizationId: FAVRO_ORG,
    authorization: 'Basic ' + btoa(FAVRO_AUTH),
  }
  const hasPayload = method !== 'GET' && opts.payload
  if (hasPayload) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(`https://favro.com/api/v1${path}`, {
    method,
    headers: headers as any,
    body: hasPayload ? JSON.stringify(opts.payload) : undefined,
  }).then((res) => res.json())
}

function findFavroReference(message: string) {
  const match = message.match(/(?:^|[^a-z_-])Sou-([0-9]+)(?:$|[^a-z_-])/i)
  return match?.[1]
}
