# github-to-favro

A [Cloudflare worker](https://developers.cloudflare.com/workers/) that posts
[Favro card comments](https://favro.com/developer/) in response to receiving various
[Github webhook](https://docs.github.com/en/developers/webhooks-and-events/webhooks/) requests.

Inspects incoming webhook requests for references to Favro card IDs. If any are
detected the worker will then attempt to post a comment to the corresponding
Favro card with a link to the commit/issue/PR/etc. which referenced it.

<img width="393" alt="Screenshot of Favro card with comment posted by worker" src="https://user-images.githubusercontent.com/150084/194759250-4b714388-71cc-4f49-9154-ef4e6b74f816.png">

## Getting started

You'll need [`node`](https://nodejs.org/en/download/) and
`npm` (or another compatible package manager) first.

```shell
git clone git@github.com:mogelbrod/github-to-favro.git
cd github-to-favro
npm install
```

Installing `wrangler` via NPM on ARM Macs is not supported as of October 2022,
instead follow the instructions in
[the wrangler repository](https://github.com/cloudflare/wrangler#installation).

### Authenticate `wrangler`

Log in using the cloudflare credentials available via 1password:
```shell
wrangler login
```

If you're having trouble with the CLI never retrieving the token
(stuck in infinite polling after issuing the command), then log
out of cloudflare from the web and retry `wrangler login`,
or follow [these instructions](https://github.com/cloudflare/wrangler/issues/1703#issuecomment-754219928).

You can verify that the auth succeeded using `wrangler whoami`.

### Create the worker

Use `wrangler` to create the worker (same command as updating an existing worker):

```shell
wrangler publish
```

Note down the URL of the created worker - you'll need to provide it when setting
up each Github webhook.

### Worker secrets

The worker requires these environment variables to be defined to function:

- `FAVRO_PREFIX`: The Favro card ID prefix used to identify cards:
  `ABC` if card IDs follow the pattern `ABC-123`.
  `https://favro.com/organization/{FAVRO_ORG}/...`
- `FAVRO_ORG`: The Favro organization ID, can be determined from the Favro web URL:
  `https://favro.com/organization/{FAVRO_ORG}/...`
- `FAVRO_AUTH`: Favro API Authentication header for the user to impersonate.
  Authentication is currently possible using either password (`email:password`) or
  Favro access tokens (`email:access-token`):
  `favro-user@domain.com:access-token`
- `GITHUB_WEBHOOK_SECRET`: An arbitrary string used to authenticate the incoming
  Github webhooks.

These can quickly be saved to Cloudflare using `wrangler`:

```shell
wrangler secret put FAVRO_PREFIX
wrangler secret put FAVRO_ORG
wrangler secret put FAVRO_AUTH
wrangler secret put GITHUB_WEBHOOK_SECRET
```

## Configure Github webhook(s)

Once the worker is online you'll need to set up a webhook for each Github
repository that you wish to subscribe to.  This can be done from the Github web
UI by navigating to
<https://github.com/OWNER/REPO/settings/hooks/new> (replace `OWNER` & `REPO`).

Enter the following in the form:

* Payload URL: URL to the published Cloudflare worker (output when running `wrangler publish`)
* Content type: `application/json`
* Secret: The value of the `GITHUB_WEBHOOK_SECRET` chosen in [Worker secrets](#worker-secrets)
* Events to trigger the webhook: _everything_, or the individual events you're interested in.

Once the webhook has been created everything should be set up.  You can now try
out the integration by pushing a commit that references an existing Favro card
in the `FAVRO_ORG` that is accessible to `FAVRO_AUTH`. If everything works then
the worker should post a comment to the card in question within seconds after
the commit is pushed.

## Developing

The worker is written in TypeScript, and is built & published through `wrangler`.

* `wrangler dev` starts up a locally served version of the worker that is
  reloaded on local file changes. *It actually runs on cloudflares servers*, and so
  has full access to all features (such as secrets and KV namespaces).
* `wrangler publish` will generate a production build of the worker and then deploy it.
* `wrangler tail` will stream logs from the published (live) worker to your terminal.
* `npm start` - alias for `wrangler dev`
* `npm run deploy` - alias for `wrangler publish`
* `npm run deploy:watch` - watches for changes to `src/**`, re-running `wrangler dev && wrangler tail`
* `npm test` - runs local "test suite"
* `npm test:watch` - runs local "test suite" whenever `src/**` changes
