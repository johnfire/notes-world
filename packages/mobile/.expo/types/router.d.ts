/* eslint-disable */
import * as Router from "expo-router";

export * from "expo-router";

declare module "expo-router" {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(auth)"}/welcome` | `/welcome`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(auth)"}/login` | `/login`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(tabs)"}/capture` | `/capture`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${"/(tabs)"}` | `/`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(tabs)"}/tags` | `/tags`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(tabs)"}/account` | `/account`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `/item/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          }
        | {
            pathname: `/tag/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          };
      hrefOutputParams:
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownOutputParams;
          }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${"/(auth)"}/welcome` | `/welcome`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(auth)"}/login` | `/login`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}/capture` | `/capture`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}` | `/`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}/tags` | `/tags`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}/account` | `/account`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `/item/[id]`;
            params: Router.UnknownOutputParams & { id: string };
          }
        | {
            pathname: `/tag/[id]`;
            params: Router.UnknownOutputParams & { id: string };
          };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/_sitemap${`?${string}` | `#${string}` | ""}`
        | `${"/(auth)"}/welcome${`?${string}` | `#${string}` | ""}`
        | `/welcome${`?${string}` | `#${string}` | ""}`
        | `${"/(auth)"}/login${`?${string}` | `#${string}` | ""}`
        | `/login${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}/capture${`?${string}` | `#${string}` | ""}`
        | `/capture${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}${`?${string}` | `#${string}` | ""}`
        | `/${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}/tags${`?${string}` | `#${string}` | ""}`
        | `/tags${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}/account${`?${string}` | `#${string}` | ""}`
        | `/account${`?${string}` | `#${string}` | ""}`
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(auth)"}/welcome` | `/welcome`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(auth)"}/login` | `/login`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(tabs)"}/capture` | `/capture`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${"/(tabs)"}` | `/`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(tabs)"}/tags` | `/tags`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(tabs)"}/account` | `/account`;
            params?: Router.UnknownInputParams;
          }
        | `/item/${Router.SingleRoutePart<T>}`
        | {
            pathname: `/item/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          }
        | `/tag/${Router.SingleRoutePart<T>}`
        | {
            pathname: `/tag/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          };
    }
  }
}
