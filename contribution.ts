/**
 * User Generated Content (UGC) Contributions Management System. Can be used for
 * a variety of use-cases such as commenting system (e.g. blog comments), forum
 * messages, chats, etc.
 *
 * Schemas and Types:
 *    - Using Zod for defining and inferring types for entities like Parties,
 *      Contributions, and their relationships so that user-supplied can be
 *      parsed and validated before persisting.
 *
 * Entities
 *    - Party: An entity which can be a Person or an Organization.
 *    - Contribution: User-generated content with optional parent linking,
 *      making it hierarchical.
 *    - Contribution Target: The target entity to which a contribution is related.
 *      This could be a URL for a content (e.g. a blog post comment), it could
 *      be another thread (in case one message is a reply to another like in
 *      Discord, etc.).
 *    - Contribution Session: Represents user activity with authentication and
 *      user agent details.
 *    - Contribution Reaction: a `like` or other reaction to a contribution.
 *    - TODO: Contribution Folksonomy: tagging and other organizing capabilities.
 *
 * Persistence Strategies
 *    - ContributionSessionPersistenceStrategy: Interface defining CRUD operations
 *      on authenticated sessions.
 *    - ContributionPersistenceStrategy: Interface defining CRUD operations on
 *      contributions.
 *    - ContributionTargetRelationshipPersistenceStrategy: Interface defining CRUD
 *      operations on the relationship between contributions and their targets.
 *
 * Interaction and Presentation Strategies
 *    - ContributionInteractionStrategy: Interface defining methods for posting
 *      and fetching contributions (this is the "business logic").
 *    - ContributionPresentationStrategy: Interface for rendering contributions
 *      and threads (this is the "presentation logic").
 *
 * In-memory Implementations (mainly for demonstrations and examples)
 *    - ContributionMemoryPersistence: An in-memory data store and CRUD implementation
 *      for contributions.
 *    - ContributionTargetRelationshipMemoryPersistence: An in-memory data store and
 *      CRUD implementation for contribution-target relationships.
 *    - TypicalContributionInteraction: A class implementing both interaction and
 *      presentation strategies. It uses in-memory stores by default.
 *
 * Notes:
 *    - Try and keep this file runtime-dependencies free (meaning no Deno, NodeJS, or
 *      Bun-specific functionality). Put Deno, NodeJS, and Bun deps into separate files.
 *    - Contributions are stored flat with reference to parent IDs but can be
 *      read hierarchically. This strategy is useful so that contributions may be
 *      easily stored in memory, in Key/Value databases, in relational databases, or
 *      in document databases -- making the persistence truly independent.
 *    - Uses asynchronous methods to simulate real-world database operations.
 *    - Provides rendering logic to represent contributions in a simple string
 *      format (for debugging).
 */

import { z } from "zod";

export const partyIDSchema = z.string();
export type PartyID = z.infer<typeof partyIDSchema>;

export const contributionSessionIDSchema = z.string();
export type ContributionSessionID = z.infer<typeof contributionSessionIDSchema>;

export const contributionIDSchema = z.string();
export type ContributionID = z.infer<typeof contributionIDSchema>;

export const contributionTargetIDSchema = z.string();
export type ContributionTargetID = z.infer<typeof contributionTargetIDSchema>;

export const partySchema = z.object({
  partyID: partyIDSchema,
});
export type Party = z.infer<typeof partySchema>;

export const personSchema = partySchema.extend({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  profilePicture: z.string().optional(),
});
export type Person = z.infer<typeof personSchema>;

export const organizationSchema = partySchema.extend({
  name: z.string(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const userAgentSchema = z.object({
  ipAddress: z.string(),
  host: z.string().optional(),
});
export type UserAgent = z.infer<typeof userAgentSchema>;

export const contributionSessionAuthSchema = z.union([
  z.object({
    type: z.literal("apiTokenAuth"),
    apiToken: z.string(),
  }),
  z.object({
    type: z.literal("oAuthDelegatedAuth"),
    oAuthSessionId: z.string(),
  }),
  z.object({
    type: z.literal("emailAuth"),
    email: z.string(),
  }),
]);
export type ContributionSessionAuth = z.infer<
  typeof contributionSessionAuthSchema
>;

export const contributionSessionSchema = z.object({
  id: contributionSessionIDSchema,
  auth: contributionSessionAuthSchema,
  userAgent: userAgentSchema,
  person: personSchema.optional(),
  organization: organizationSchema.optional(),
});
export type ContributionSession = z.infer<typeof contributionSessionSchema>;

export const contributionSchema = z.object({
  // TODO: add discriminated union to support all kinds of UGC like blog post
  //       comments, audio/video, chat messages, and other Disqus- and discord-like
  //       capabilities
  id: contributionIDSchema,
  content: z.string(),
  session: contributionSessionSchema,
  parentId: contributionIDSchema.optional(),
  timestamp: z.date(),
});
export type Contribution = z.infer<typeof contributionSchema>;

export const contributionReactionSchema = z.object({
  reactionId: contributionIDSchema,
  contributionId: contributionIDSchema,
  reaction: z.string(),
  session: contributionSessionSchema,
  timestamp: z.date(),
});
export type ContributionReaction = z.infer<typeof contributionReactionSchema>;
export type ContributionReactions = ContributionReaction[];

export type HierarchicalContribution = Contribution & {
  subContributions: ContributionThread;
  reactions?: ContributionReaction[];
};
export type ContributionThread = HierarchicalContribution[];

export const contributionTargetSchema = z.object({
  targetID: contributionTargetIDSchema,
});
export type ContributionTarget = z.infer<typeof contributionTargetSchema>;

export const contributionTargetRelationshipSchema = z.object({
  contribution: contributionSchema,
  target: contributionTargetSchema,
});
export type ContributionTargetRelationship = z.infer<
  typeof contributionTargetRelationshipSchema
>;

export interface ContributionSessionPersistenceStrategy {
  readonly createSession: (
    auth: ContributionSessionAuth,
    userAgent: UserAgent,
  ) => Promise<ContributionSession>;
  readonly getSession: (
    sessionId: ContributionSessionID,
  ) => Promise<ContributionSession | null>;
  readonly timeoutSession: (
    session: ContributionSession,
  ) => Promise<ContributionSession>;
}

export interface ContributionPersistenceStrategy {
  readonly saveContribution: (
    contribution: Contribution,
  ) => Promise<Contribution>;
  readonly saveReaction: (
    ...reaction: ContributionReaction[]
  ) => Promise<ContributionReaction[]>;
  readonly getContribution: (
    id: ContributionID,
    options?: { includeReactions?: boolean },
  ) => Promise<
    Contribution | (Contribution & { reactions: ContributionReactions }) | null
  >;
  readonly getThread: (
    rootContributionId: ContributionID,
    options?: { includeReactions?: boolean },
  ) => Promise<HierarchicalContribution | null>;
  // TODO: soft delete and hard delete contributions
  // TODO: delete all reactions for a contribution
  // TODO: toggle reactions for a contribution (e.g. like/unlike)
}

export interface ContributionTargetRelationshipPersistenceStrategy {
  readonly saveRelationship: (
    relationship: ContributionTargetRelationship,
  ) => Promise<ContributionTargetRelationship>;
  readonly getRelationshipsByTargetID: (
    targetID: ContributionTargetID,
  ) => Promise<ContributionTargetRelationship[]>;
  readonly getRelationshipsByContributionID: (
    contributionID: ContributionID,
  ) => Promise<ContributionTargetRelationship[]>;
  // TODO: soft delete and hard delete relationships
}

export interface ContributionInteractionStrategy {
  readonly postContribution: (
    contribution: Contribution | ContributionTargetRelationship,
  ) => Promise<Contribution | ContributionTargetRelationship>;
  readonly postReaction: (
    ...reaction: ContributionReaction[]
  ) => Promise<ContributionReaction[]>;
  readonly getContribution: (
    id: ContributionID,
    options?: { includeReactions?: boolean },
  ) => Promise<
    Contribution | (Contribution & { reactions: ContributionReactions }) | null
  >;
  readonly getThread: (
    rootContributionId: ContributionID,
    options?: { includeReactions?: boolean },
  ) => Promise<HierarchicalContribution | null>;
  // TODO: soft delete and hard delete contributions
  // TODO: delete all reactions for a contribution
  // TODO: toggle reactions for a contribution (e.g. like/unlike)
  // TODO: soft delete and hard delete relationships
}

export interface ContributionPresentationStrategy {
  readonly renderContribution: (contribution: Contribution) => string;
  readonly renderThread: (contribution: HierarchicalContribution) => string;
}

export class ContributionSessionMemoryPersistence
  implements ContributionSessionPersistenceStrategy {
  protected sessions: Record<string, ContributionSession> = {};

  getRandomString(s: number) {
    if (s % 2 == 1) {
      throw new Deno.errors.InvalidData("Only even sizes are supported");
    }
    const buf = new Uint8Array(s / 2);
    crypto.getRandomValues(buf);
    let ret = "";
    for (let i = 0; i < buf.length; ++i) {
      ret += ("0" + buf[i].toString(16)).slice(-2);
    }
    return ret;
  }

  // deno-lint-ignore require-await
  async createSession(
    auth: ContributionSessionAuth,
    userAgent: UserAgent,
  ): Promise<ContributionSession> {
    return {
      id: this.getRandomString(10),
      auth,
      userAgent,
    };
  }

  // deno-lint-ignore require-await
  async getSession(
    sessionId: ContributionSessionID,
  ): Promise<ContributionSession | null> {
    return this.sessions[sessionId];
  }

  // deno-lint-ignore require-await
  async timeoutSession(
    session: ContributionSession,
  ): Promise<ContributionSession> {
    delete this.sessions[session.id];
    return session;
  }
}

export class ContributionMemoryPersistence
  implements ContributionPersistenceStrategy {
  protected contributions: Record<ContributionID, Contribution> = {};
  protected reactions: Record<ContributionID, ContributionReaction[]> = {};

  // deno-lint-ignore require-await
  async saveContribution(contribution: Contribution): Promise<Contribution> {
    this.contributions[contribution.id] = contribution;
    return contribution;
  }

  // deno-lint-ignore require-await
  async saveReaction(
    ...reaction: ContributionReaction[]
  ): Promise<ContributionReaction[]> {
    for (const r of reaction) {
      let reactions = this.reactions[r.contributionId];
      if (!reactions) {
        reactions = [];
        this.reactions[r.contributionId] = reactions;
      }
      reactions.push(r);
    }
    return reaction;
  }

  // deno-lint-ignore require-await
  async getContribution(
    id: ContributionID,
    options?: { includeReactions?: boolean },
  ): Promise<
    Contribution | (Contribution & { reactions: ContributionReactions }) | null
  > {
    const contribution = this.contributions[id];
    if (contribution && options?.includeReactions) {
      return {
        ...contribution,
        reactions: this.reactions[id],
      };
    }
    return contribution || null;
  }

  // deno-lint-ignore require-await
  async getThread(
    rootContributionId: ContributionID,
    options?: { includeReactions?: boolean },
  ): Promise<HierarchicalContribution | null> {
    const recursiveFetch = (
      find: ContributionID,
      parent?: HierarchicalContribution,
    ) => {
      const found = this.contributions[find];
      if (found) {
        const foundHC: HierarchicalContribution = {
          ...found,
          reactions: options?.includeReactions
            ? this.reactions[find]
            : undefined,
          subContributions: [],
        };
        if (parent) parent.subContributions.push(foundHC);
        for (
          const [childId, childContrib] of Object.entries(
            this.contributions,
          )
        ) {
          if (childContrib.parentId == find) {
            recursiveFetch(childId, foundHC);
          }
        }
        return foundHC;
      } else {
        return null;
      }
    };

    return recursiveFetch(rootContributionId);
  }
}

export class ContributionTargetRelationshipMemoryPersistence
  implements ContributionTargetRelationshipPersistenceStrategy {
  protected relationships: ContributionTargetRelationship[] = [];

  // deno-lint-ignore require-await
  async saveRelationship(
    relationship: ContributionTargetRelationship,
  ): Promise<ContributionTargetRelationship> {
    this.relationships.push(relationship);
    return relationship;
  }

  // deno-lint-ignore require-await
  async getRelationshipsByTargetID(
    targetID: ContributionTargetID,
  ): Promise<ContributionTargetRelationship[]> {
    return this.relationships.filter((rel) => rel.target.targetID === targetID);
  }

  // deno-lint-ignore require-await
  async getRelationshipsByContributionID(
    contributionID: ContributionID,
  ): Promise<ContributionTargetRelationship[]> {
    return this.relationships.filter(
      (rel) => rel.contribution.id === contributionID,
    );
  }
}

export class TypicalContributionInteraction
  implements ContributionInteractionStrategy, ContributionPresentationStrategy {
  constructor(
    readonly csps: ContributionSessionPersistenceStrategy =
      new ContributionSessionMemoryPersistence(),
    readonly cps: ContributionPersistenceStrategy =
      new ContributionMemoryPersistence(),
    readonly ctrps: ContributionTargetRelationshipPersistenceStrategy =
      new ContributionTargetRelationshipMemoryPersistence(),
  ) {}

  async postContribution(
    contribution: Contribution | ContributionTargetRelationship,
  ): Promise<Contribution | ContributionTargetRelationship> {
    if ("contribution" in contribution) {
      return await this.ctrps.saveRelationship(contribution);
    } else {
      return await this.cps.saveContribution(contribution);
    }
  }

  async postReaction(
    ...reaction: ContributionReaction[]
  ): Promise<ContributionReaction[]> {
    await this.cps.saveReaction(...reaction);
    return reaction;
  }

  // deno-lint-ignore require-await
  async getContribution(
    id: ContributionID,
    options?: { includeReactions?: boolean },
  ): Promise<
    Contribution | (Contribution & { reactions: ContributionReactions }) | null
  > {
    return this.cps.getContribution(id, options);
  }

  // deno-lint-ignore require-await
  async getThread(
    rootContributionId: ContributionID,
    options?: { includeReactions?: boolean },
  ): Promise<HierarchicalContribution | null> {
    return this.cps.getThread(rootContributionId, options);
  }

  renderContribution(contribution: Contribution): string {
    let renderedText = `Contribution ID: ${contribution.id}\n`;

    if (contribution.content) {
      renderedText += `Content: ${contribution.content}\n`;
    }

    return renderedText;
  }

  renderThread(contribution: HierarchicalContribution): string {
    const renderSingle = (
      contribution: HierarchicalContribution,
      level = 0,
    ) => {
      const levelText = level ? "  ".repeat(level) : "";
      let renderedText = `${levelText}Contribution ID: ${contribution.id}\n`;

      if (contribution.content) {
        renderedText += `${levelText}Content: ${contribution.content}`;
      }

      if (contribution.subContributions?.length) {
        renderedText += `\n${levelText}${contribution.id} Subcontributions:\n`;
        for (const sub of contribution.subContributions) {
          renderedText += renderSingle(sub, level + 1);
        }
      }

      return renderedText;
    };

    return renderSingle(contribution);
  }
}
