# Structured Output (generateObject Replacement) — v6

## Critical: generateObject is Deprecated in v6

`generateObject` and `streamObject` are **deprecated** as of v6.0.0-beta.127. Use `generateText`/`streamText` with the `output` property instead.

**Evidence:** CHANGELOG: "deprecate generateObject and streamObject" in v6.0.0-beta.127.

Both still work but emit deprecation warnings. All new code should use the `output` property pattern.

---

## Output Modes

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

// Object — single typed object
output: Output.object({ schema: z.object({...}) })

// Array — array of typed elements; supports elementStream
output: Output.array({ element: z.object({...}) })

// Choice — classification; model must return one of provided options
output: Output.choice({ options: ['positive', 'negative', 'neutral'] })

// JSON — valid JSON, no structural validation
output: Output.json()

// Text (default) — plain string, no schema
output: Output.text()
```

---

## Object Output Example

```ts
import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const researchSummarySchema = z.object({
  title: z.string().describe('Short title for the research topic'),
  keyFindings: z.array(z.string()).describe('3-5 bullet points of key findings'),
  confidenceScore: z.number().min(0).max(1).describe('How confident the model is in its summary'),
  relatedTopics: z.array(z.object({
    name: z.string(),
    relevance: z.enum(['high', 'medium', 'low']),
  })).describe('Related research areas'),
  limitations: z.string().describe('Known limitations or caveats of this summary'),
  suggestedNextSteps: z.array(z.string()),
});

const { output } = await generateText({
  model: anthropic('claude-haiku-4-5'),
  output: Output.object({
    schema: researchSummarySchema,
    name: 'ResearchSummary',
    description: 'Structured summary of a research topic',
  }),
  prompt: 'Summarize the key research findings on transformer attention mechanisms.',
  temperature: 0,  // Use 0 for structured output — more deterministic
});

// output is fully typed as z.infer<typeof researchSummarySchema>
console.log(output.title);              // string
console.log(output.keyFindings);        // string[]
console.log(output.confidenceScore);   // number
```

---

## Streaming Object Output

```ts
import { streamText, Output } from 'ai';
import { z } from 'zod';

const { partialOutputStream } = streamText({
  model: anthropic('claude-haiku-4-5'),
  output: Output.object({
    schema: z.object({
      name: z.string(),
      ingredients: z.array(z.object({ item: z.string(), amount: z.string() })),
      instructions: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a chocolate chip cookie recipe.',
  temperature: 0,
});

for await (const partial of partialOutputStream) {
  // partial is DeepPartial<schema type> — fields may be undefined until complete
  console.log('Partial:', JSON.stringify(partial));
}
```

**CAVEAT:** Partial objects CANNOT be schema-validated because incomplete data may not conform. Only the final object is validated.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/generating-structured-data` — "Partial outputs streamed via streamText cannot be validated against your provided schema, as incomplete data may not yet conform to it."

---

## Array Output with elementStream

```ts
import { streamText, Output } from 'ai';

const { elementStream } = streamText({
  model: openai('gpt-4o-mini'),
  output: Output.array({
    element: z.object({
      city: z.string(),
      country: z.string(),
      population: z.number(),
    }),
    name: 'CityList',
  }),
  prompt: 'List the top 5 largest cities in Europe with their populations.',
  temperature: 0,
});

for await (const city of elementStream) {
  // Each emitted element IS complete and validated
  console.log(`${city.city}, ${city.country}: ${city.population.toLocaleString()}`);
}
```

**Key difference from partialOutputStream:** Each element from `elementStream` is complete and validated. You don't get partial elements — you get whole objects as they're generated.

---

## Classification Example with Output.choice

```ts
const { output: sentiment } = await generateText({
  model: anthropic('claude-haiku-4-5'),
  output: Output.choice({ options: ['positive', 'negative', 'neutral', 'mixed'] }),
  prompt: 'Classify the sentiment: "The product is mostly great but the shipping was slow."',
  temperature: 0,
});

console.log(sentiment); // 'mixed'
```

---

## Error Handling

```ts
import { generateText, Output, NoObjectGeneratedError } from 'ai';

try {
  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: mySchema }),
    prompt: 'Generate structured data.',
  });
  console.log(output);
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    console.error('Failed to generate valid object:');
    console.error('  Cause:', error.cause);
    console.error('  Raw text:', error.text);     // what the model actually returned
    console.error('  Usage:', error.usage);
    console.error('  Response:', error.response);
    // Inspect error.text to debug schema mismatches
  } else {
    throw error;
  }
}
```

Error triggers:
1. Model returned response that couldn't be parsed as JSON
2. Model returned valid JSON but it didn't match the schema
3. Model failed to generate a response at all

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/generating-structured-data` — "When the model can't produce a valid object, generateText throws AI_NoObjectGeneratedError."

---

## Schema Design Tips

```ts
// DO: use .describe() on all fields for better generation
z.object({
  name: z.string().describe('Full legal name of the person'),
  age: z.number().int().min(0).max(150).describe('Age in years'),
})

// DO: use .nullable() not .optional() for OpenAI strict mode
z.object({
  middleName: z.string().nullable().describe('Middle name, or null if not present'),
})
// NOT:
// middleName: z.string().optional()  ← may fail with OpenAI strict structured output

// DO: keep schemas flat and simple — avoid deep nesting
// Avoid unions with complex discriminated types (confuses weaker models)

// DO: use temperature: 0 for structured output
// DO: add a name and description to Output.*
output: Output.object({ schema, name: 'MySchema', description: 'What this schema represents' })

// DO: use z.enum() for categorical fields
status: z.enum(['active', 'inactive', 'pending'])

// AVOID: z.Date() — models return strings, not Date objects
// USE: z.string().date() with a transformer if needed

// AVOID: very large arrays (the model may hallucinate items)
// BETTER: z.array(z.string()).max(10) to cap
```

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/prompt-engineering` — "Zod Dates: Use z.string().date() plus a transformer" and "OpenAI strict structured outputs: optional fields can fail validation. Use .nullable() over .optional()."

---

## Combining Structured Output with Tools

You CAN use `output` and `tools` together in the same `generateText` call:

```ts
const { output, toolResults } = await generateText({
  model: openai('gpt-4o'),
  tools: { search: searchTool },
  output: Output.object({ schema: researchSummarySchema }),
  stopWhen: stepCountIs(5),
  prompt: 'Research transformer attention mechanisms and summarize your findings.',
});
```

**Note:** "Structured output generation counts as a step" in the loop. Leave room in your `stepCountIs` budget for both tool calls and the final output step.

**Evidence:** `ai-sdk.dev/docs/ai-sdk-core/generating-structured-data` — "Structured output generation counts as a step in the multi-turn loop, so set stopWhen to leave room for both tool calls and the final output step."
