import "./env.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getArtifactSharePublicOrigin,
  publishArtifactShare
} from "./artifactShares.js";

const server = new McpServer({
  name: "chathtml-html-host",
  version: "0.1.0"
});

server.registerTool(
  "publish_html",
  {
    title: "Publish HTML",
    description:
      "Host a complete HTML document or snippet and return a public ChatHTML link.",
    inputSchema: {
      html: z
        .string()
        .min(1)
        .max(5_000_000)
        .describe("The HTML document or snippet to host."),
      title: z
        .string()
        .trim()
        .max(120)
        .optional()
        .describe("Optional display title for the hosted artifact."),
      sourceMessageId: z
        .string()
        .trim()
        .max(180)
        .optional()
        .describe(
          "Optional stable source id. Reusing it updates the same public link."
        ),
      themeMode: z
        .enum(["day", "night"])
        .optional()
        .describe("Optional wrapper theme for the public artifact page.")
    },
    outputSchema: {
      id: z.string(),
      path: z.string(),
      reused: z.boolean(),
      url: z.string().url()
    }
  },
  async ({ html, sourceMessageId, themeMode, title }) => {
    try {
      const result = await publishArtifactShare({
        html,
        sourceMessageId,
        themeMode,
        title
      });
      const output = {
        id: result.id,
        path: result.path,
        reused: result.reused,
        url: result.url
      };

      return {
        content: [
          {
            type: "text",
            text: output.url
          }
        ],
        structuredContent: output
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to publish HTML.";
      return {
        content: [
          {
            type: "text",
            text: message
          }
        ],
        isError: true
      };
    }
  }
);

async function main(): Promise<void> {
  const publicOrigin = getArtifactSharePublicOrigin();
  console.error(`ChatHTML HTML host MCP server using ${publicOrigin}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
