# Gotcha: Blockly expression-block generator must return `[code, Order]`, not a string

**Category:** gotcha — Blockly codegen

## Symptom

An expression block (Model, Prompt, StopCondition, ToolCall, etc.) renders to JavaScript with broken operator precedence. For example, `1 + 2 * 3` may serialize as `(1 + 2) * 3`. Or the surrounding parentheses are wrong/missing. Sometimes the code "looks right" but evaluates wrong.

## Root cause

Blockly's JavaScript generator distinguishes **statement** generators (return `string`) from **expression** generators (return `[code, Order]` where `Order` is a precedence enum like `Order.AWAIT`, `Order.FUNCTION_CALL`, `Order.ATOMIC`). Returning a bare string from an expression generator strips precedence info, so Blockly cannot decide whether to wrap the snippet in parens when it is embedded into a larger expression.

## Fix

Every expression generator must return a 2-tuple:

```ts
// Expression block (used inside value inputs):
javascriptGenerator.forBlock['ai_model'] = (block) => {
  const code = `${provider}('${name}')`;
  return [code, Order.FUNCTION_CALL];
};

// Statement block (no return-into-an-expression):
javascriptGenerator.forBlock['ai_output_sink'] = (block) => {
  const value = generator.valueToCode(block, 'VALUE', Order.NONE);
  return `__sink?.('output', ${value});\n`;
};
```

L4's new blocks codify this: `StopCondition` returns `[code, Order.FUNCTION_CALL]`; `StreamText` returns `[code, Order.FUNCTION_CALL]`; `Agent` returns `[code, Order.AWAIT]`; `ToolCall` returns `[code, Order.AWAIT]`.

## Evidence

- `01-research/known-failure-modes.md` line 10: "Generator returns string for expression block. Symptom: precedence bug, e.g. `1+2*3` rendered as `(1+2)*3`. Fix: return `[code, javascriptGenerator.ORDER_*]` tuple from expression generators."
- `03-pocs/L4-multi-step-agent-and-stream/implementation-notes.md` lines 9-16: the new-blocks table — every expression block declares its `Order.*`. Statement blocks return `string`.
- `03-pocs/L-capstone-research-agent/implementation-notes.md` lines 62-67: `ai_tool_call` "is an expression block … It returns `[code, Order.AWAIT]`."
- `03-pocs/L3-tool-and-object-blocks/implementation-notes.md` lines 10-11: tool body codegen "returned with `Order.FUNCTION_CALL`."
