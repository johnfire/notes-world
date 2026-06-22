import { IdeaMaturity } from "../types";

// The idea-board maturity order, shared by the web Ideas columns and the mobile
// Ideas board so the two surfaces can't drift on the stage order.
export const IDEA_BOARD_MATURITIES: IdeaMaturity[] = [
  IdeaMaturity.Seed,
  IdeaMaturity.Parked,
  IdeaMaturity.Developing,
  IdeaMaturity.Ready,
];
