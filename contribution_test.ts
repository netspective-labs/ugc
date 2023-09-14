import { assert, assertEquals } from "asserts";
import {
  Contribution,
  ContributionTarget,
  ContributionTargetRelationship,
  TypicalContributionInteraction,
  UserAgent,
} from "./contribution.ts"; // Change to your actual module path

Deno.test(
  "Test TypicalContributionInteraction with multiple message threads",
  async () => {
    // Setup
    const interaction = new TypicalContributionInteraction();
    const userAgent: UserAgent = { ipAddress: "127.0.0.1" };
    const apiSession = await interaction.csps.createSession(
      {
        type: "apiTokenAuth",
        apiToken: "token123",
      },
      userAgent,
    );
    const emailSession = await interaction.csps.createSession(
      {
        type: "emailAuth",
        email: "test@example.com",
      },
      userAgent,
    );
    const oAuthSession = await interaction.csps.createSession(
      {
        type: "oAuthDelegatedAuth",
        oAuthSessionId: "session123",
      },
      userAgent,
    );

    // Sample contributions as fixtures
    const rootContribution: Contribution = {
      id: "root1",
      content: "Root message",
      session: emailSession,
      timestamp: new Date(),
    };

    const subContribution1: Contribution = {
      id: "sub1",
      content: "Sub message 1",
      parentId: "root1",
      session: apiSession,
      timestamp: new Date(),
    };

    const subContribution2: Contribution = {
      id: "sub2",
      content: "Sub message 2",
      parentId: "sub1",
      session: oAuthSession,
      timestamp: new Date(),
    };

    // Inserting contributions
    await interaction.postContribution(rootContribution);
    await interaction.postContribution(subContribution1);
    await interaction.postContribution(subContribution2);

    await interaction.postReaction({
      contributionId: subContribution1.id,
      reactionId: "sub1-react1",
      reaction: "like",
      session: subContribution1.session,
      timestamp: new Date(),
    });

    assertEquals(
      (await interaction.getContribution("root1"))?.content,
      "Root message",
    );

    const sub1WithR = await interaction.getContribution("sub1", {
      includeReactions: true,
    });
    assert(sub1WithR);
    assert("reactions" in sub1WithR);
    assertEquals(sub1WithR.content, "Sub message 1");
    assertEquals(sub1WithR.reactions.length, 1);
    assertEquals(sub1WithR.reactions[0].reaction, "like");
    assertEquals(
      (await interaction.getContribution("sub2"))?.content,
      "Sub message 2",
    );

    // Fetch thread and test
    const thread = await interaction.getThread("root1");
    assertEquals(thread?.content, "Root message");
    assertEquals(thread?.subContributions.length, 1);
    assertEquals(thread?.subContributions[0]?.content, "Sub message 1");
    assertEquals(thread?.subContributions[0]?.subContributions.length, 1);
    assertEquals(
      thread?.subContributions[0]?.subContributions[0]?.content,
      "Sub message 2",
    );

    assertEquals(
      `Contribution ID: root1
Content: Root message
root1 Subcontributions:
  Contribution ID: sub1
  Content: Sub message 1
  sub1 Subcontributions:
    Contribution ID: sub2
    Content: Sub message 2`,
      interaction.renderThread(thread!),
    );
  },
);

Deno.test(
  "Test TypicalContributionInteraction with ContributionTargetRelationship",
  async () => {
    const interaction = new TypicalContributionInteraction();
    const userAgent: UserAgent = { ipAddress: "127.0.0.1" };
    const emailSession = await interaction.csps.createSession(
      {
        type: "emailAuth",
        email: "test@example.com",
      },
      userAgent,
    );

    // Sample contribution
    const sampleContribution: Contribution = {
      id: "contribution1",
      content: "Sample contribution",
      session: emailSession,
      timestamp: new Date(),
    };

    await interaction.postContribution(sampleContribution);

    // Sample target
    const sampleTarget: ContributionTarget = {
      targetID: "target1",
    };

    // Create a relationship between the contribution and the target
    const relationship: ContributionTargetRelationship = {
      contribution: sampleContribution,
      target: sampleTarget,
    };

    await interaction.postContribution(relationship);

    // Fetch the relationships by target ID
    const relationshipsByTarget = await interaction.ctrps
      .getRelationshipsByTargetID("target1");
    assertEquals(relationshipsByTarget.length, 1);
    assertEquals(relationshipsByTarget[0].contribution.id, "contribution1");
    assertEquals(relationshipsByTarget[0].target.targetID, "target1");

    // Fetch the relationships by contribution ID
    const relationshipsByContribution = await interaction.ctrps
      .getRelationshipsByContributionID("contribution1");
    assertEquals(relationshipsByContribution.length, 1);
    assertEquals(
      relationshipsByContribution[0].contribution.id,
      "contribution1",
    );
    assertEquals(relationshipsByContribution[0].target.targetID, "target1");
  },
);
