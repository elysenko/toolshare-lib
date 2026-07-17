import { Route } from '@angular/router';

// Shape of the `data.flow` node consumed by the colossus flow-graph extractor
// and the runtime navbar. See app.routes.ts for authoring rules.
export interface FlowMeta {
  flowId: string;
  node: string;
  entry?: boolean;
  edgesTo?: string[];
  label?: string;
  showInNavbar?: boolean;
  scope?: 'all' | 'admin' | 'user';
}

export type FlowRoute = Omit<Route, 'children' | 'data'> & {
  data?: { flow?: FlowMeta } & Record<string, unknown>;
  children?: FlowRoute[];
};
