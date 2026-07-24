/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
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

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
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
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
