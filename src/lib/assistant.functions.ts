import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAssistantCatalog, getAssistantEnabled } from "./catalog.functions";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200),
});

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: { role: "user" | "assistant"; content: string }[] }) =>
    z.object({ messages: z.array(MessageSchema).min(1).max(12) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!(await getAssistantEnabled())) {
      return { ok: false as const, reply: "The shopping assistant is turned off right now." };
    }
    const catalog = await getAssistantCatalog();
    const lines = catalog
      .map((p) => {
        const cat = (p.categories as { name: string } | null)?.name ?? "General";
        return `- ${p.name} | SKU ${p.sku} | ${cat} | retail ₹${p.retail_price} (min ${p.retailer_moq}) | dealer ₹${p.wholesale_price} (MOQ ${p.dealer_moq}) | stock ${p.stock} ${p.unit}`;
      })
      .join("\n");

    const instructions = `You are the shopping assistant for Crompton Trade Hub, a B2B wholesale store for electrical goods in India.
Help dealers and retailers find products, compare options, understand pricing tiers and minimum order quantities (MOQ), and plan bulk orders.
Rules:
- Only recommend products from the catalog below. Use exact product names so the shop can link them.
- Dealer prices apply to registered Dealer accounts and need the dealer MOQ. Retail prices apply to Retailer accounts.
- Prices exclude GST. Never invent discounts, delivery dates, or stock that are not listed.
- Keep answers short: a few sentences or a compact list. Plain text only, no markdown tables.
- If asked something unrelated to shopping here, politely steer back.

Catalog:
${lines}`;

    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions,
        input: data.messages.map((m) => ({ role: m.role, content: m.content })),
        reasoning: { effort: "low" },
      });
      let text = "";
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content) {
            if (c.type === "output_text") text += c.text;
          }
        }
      }
      return { ok: true as const, reply: text.trim() || "Sorry, I couldn't come up with an answer. Try rephrasing." };
    } catch (err) {
      const { GatewayError, PaymentRequiredError, RateLimitError } = await import("@lovable.dev/ai-gateway");
      if (err instanceof RateLimitError) {
        return { ok: false as const, reply: "I'm getting a lot of questions right now. Please try again in a minute." };
      }
      if (err instanceof PaymentRequiredError) {
        return { ok: false as const, reply: "The assistant is temporarily unavailable." };
      }
      if (err instanceof GatewayError) {
        console.error("assistant gateway error", err.code, err.ids);
        return { ok: false as const, reply: "Something went wrong while answering. Please try again." };
      }
      throw err;
    }
  });
