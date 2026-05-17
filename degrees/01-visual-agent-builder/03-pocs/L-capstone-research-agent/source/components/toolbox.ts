/**
 * toolbox.ts — L5
 *
 * Blockly toolbox definition for the L5 workspace.
 * Carries forward all L4 blocks.
 */

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'AI Models',
      colour: 160,
      contents: [
        { kind: 'block', type: 'ai_model' },
      ],
    },
    {
      kind: 'category',
      name: 'Prompts',
      colour: 210,
      contents: [
        { kind: 'block', type: 'ai_prompt' },
      ],
    },
    {
      kind: 'category',
      name: 'Generate',
      colour: 160,
      contents: [
        { kind: 'block', type: 'ai_generate_text' },
        { kind: 'block', type: 'ai_generate_object' },
        { kind: 'block', type: 'ai_output_sink' },
      ],
    },
    {
      kind: 'category',
      name: 'Stream',
      colour: 90,
      contents: [
        { kind: 'block', type: 'ai_stream_text' },
        { kind: 'block', type: 'ai_stream_sink' },
      ],
    },
    {
      kind: 'category',
      name: 'Agent',
      colour: 30,
      contents: [
        { kind: 'block', type: 'ai_agent' },
        { kind: 'block', type: 'ai_stop_condition' },
      ],
    },
    {
      kind: 'category',
      name: 'Tools',
      colour: 270,
      contents: [
        { kind: 'block', type: 'ai_tool' },
        { kind: 'block', type: 'ai_tool_return' },
        { kind: 'block', type: 'ai_use_tools' },
      ],
    },
    {
      kind: 'category',
      name: 'Schema',
      colour: 290,
      contents: [
        { kind: 'block', type: 'ai_zod_object' },
        { kind: 'block', type: 'ai_zod_field' },
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      colour: 120,
      contents: [
        { kind: 'block', type: 'ai_for_each' },
      ],
    },
  ],
}
