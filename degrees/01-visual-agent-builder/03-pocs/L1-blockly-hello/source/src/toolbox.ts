/**
 * toolbox.ts
 *
 * Category toolbox definition for the L1 POC.
 *
 * Categories:
 *   Logic    — controls_if
 *   Math     — math_number, math_arithmetic
 *   Text     — text, text_print
 *   Custom   — greet (our custom block)
 */

export const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Logic',
      categorystyle: 'logic_category',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_compare' },
      ],
    },
    {
      kind: 'category',
      name: 'Math',
      categorystyle: 'math_category',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      categorystyle: 'text_category',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_print' },
      ],
    },
    {
      kind: 'category',
      name: 'Custom',
      colour: '230',
      contents: [
        {
          kind: 'block',
          type: 'greet',
          inputs: {
            NAME: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'Alice' },
              },
            },
          },
        },
      ],
    },
  ],
} as const
