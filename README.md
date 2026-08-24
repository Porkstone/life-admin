# Life Admin

This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).

This project is connected to the Convex deployment named [`colorless-chickadee-470`](https://dashboard.convex.dev/d/colorless-chickadee-470).

## Project structure

The frontend code is in the `src` directory and is built with [Vite](https://vitejs.dev/).

The backend code is in the `convex` directory.

## Hosting architecture

The production frontend is currently deployed on Vercel at
[`https://life-admin-ui.vercel.app/`](https://life-admin-ui.vercel.app/). It is
not hosted by Convex. Convex hosts the backend functions, database, and
authentication endpoints only.

The Vercel deployment's `VITE_CONVEX_URL` must point to the intended Convex
backend deployment. On the Convex deployment, `SITE_URL` must be set to the
Vercel frontend URL so authentication callbacks and emailed sign-in links
return users to the correct application.

## Supported browsers

The application supports current versions of:

- Google Chrome
- Apple Safari

Other browsers are not part of the supported test matrix.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

The normal workflow is deployment-first: deploy the application and test it in the target environment.

For occasional local diagnosis, run the frontend and backend separately in two terminals:

```sh
npm run dev:frontend
npm run dev:backend
```

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
