import type {Meta, StoryObj} from '@storybook/react';

import {Live2DCanvas} from './Live2DCanvas';

const meta = {
    title: 'Example/Live2DCanvas',
    component: Live2DCanvas,
    parameters: {
        // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
        layout: 'fullscreen',
    },
} as Meta<typeof Live2DCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    render: args => {
        return <Live2DCanvas {...args} />;
    },
    args: {},
};

export const WithCode: Story = {
    render: args => {
        // here comes the code
        return <Live2DCanvas {...args} />;
    },
};

WithCode.args = {};

WithCode.argTypes = {};

WithCode.parameters = {
    docs: {
        source: {
            language: 'tsx',
            type: 'code',
        },
    },
};
