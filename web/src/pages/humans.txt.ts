import * as humans from "../../humans.md";

export async function GET() {
  return new Response(humans.rawContent(), {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
