/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminActions from "../adminActions.js";
import type * as agentAccess from "../agentAccess.js";
import type * as agentHttp from "../agentHttp.js";
import type * as agentProjection from "../agentProjection.js";
import type * as agentProtocol from "../agentProtocol.js";
import type * as agentValidators from "../agentValidators.js";
import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as emailActions from "../emailActions.js";
import type * as homes from "../homes.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as mobileContracts from "../mobileContracts.js";
import type * as passwordReset from "../passwordReset.js";
import type * as passwordResetAuth from "../passwordResetAuth.js";
import type * as people from "../people.js";
import type * as router from "../router.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminActions: typeof adminActions;
  agentAccess: typeof agentAccess;
  agentHttp: typeof agentHttp;
  agentProjection: typeof agentProjection;
  agentProtocol: typeof agentProtocol;
  agentValidators: typeof agentValidators;
  auth: typeof auth;
  documents: typeof documents;
  emailActions: typeof emailActions;
  homes: typeof homes;
  http: typeof http;
  invites: typeof invites;
  mobileContracts: typeof mobileContracts;
  passwordReset: typeof passwordReset;
  passwordResetAuth: typeof passwordResetAuth;
  people: typeof people;
  router: typeof router;
  users: typeof users;
  vehicles: typeof vehicles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
