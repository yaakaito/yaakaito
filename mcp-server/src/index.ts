import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	articles,
} from "./articles";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator and Blog",
		version: "1.0.0",
	});

	async init() {
		for (const article of articles) {
			this.server.resource(
				article.title,
				`articles://${article.id}.md`,
				 { mimeType: 'text/plain', description: `${article.title} - ${article.content.substring(0, 50)}` },
				() => {
					return {
						contents: [{
							uri: `article://${article.id}.md`,
							mimeType: 'text/plain',
							text: article.content,
						}]
					};
				}
			);
		}

	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
