import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "whoami",
  title: "Quem sou eu",
  description:
    "Retorna o e-mail e o id do usuário autenticado no Peticiona.AI. Útil para verificar a conexão MCP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    const user = { id: ctx.getUserId(), email: ctx.getUserEmail() };
    return {
      content: [{ type: "text", text: `Autenticado como ${user.email ?? user.id}.` }],
      structuredContent: user,
    };
  },
});