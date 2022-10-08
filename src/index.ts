import { EmitterWebhookEvent, Webhooks } from '@octokit/webhooks'
import { githubEventToComments } from './commenter'

export interface Env {
  FAVRO_PREFIX: string
  FAVRO_ORG: string
  FAVRO_AUTH: string
  GITHUB_WEBHOOK_SECRET: string

  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

export default {
  async fetch(
    req: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const headers = Object.fromEntries(req.headers.entries())
    const params = {
      id: headers['x-github-delivery'],
      name: headers['x-github-event'] as any,
      payload: undefined as any,
    }

    try {
      params.payload = await req.json()
      console.log('request received:', params.name, params.id)
      // console.log(JSON.stringify(params, null, 2))

      const webhooks = new Webhooks({
        secret: env.GITHUB_WEBHOOK_SECRET,
      })
      webhooks.onAny((event) =>
        githubEventToComments(event, {
          prefix: env.FAVRO_PREFIX,
          org: env.FAVRO_ORG,
          auth: env.FAVRO_AUTH,
        }).then((comments) => {
          console.log(comments)
        }),
      )
      await webhooks.verifyAndReceive({
        ...params,
        signature: headers['x-hub-signature-256'],
      })

      console.log('request handled:', params.name, params.id)
      return jsonResponse({ ok: true })
    } catch (error) {
      console.error('request error:', params.name, params.id)
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
