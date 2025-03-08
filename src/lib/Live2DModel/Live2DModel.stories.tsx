import type {Meta, StoryObj} from '@storybook/react';

import {Live2DModel} from './Live2DModel';

const meta = {
    title: 'Example/Live2DModel',
    component: Live2DModel,
    parameters: {
        // More on how to position stories at: https://storybook.js.org/docs/react/configure/story-layout
        layout: 'fullscreen',
    },
} as Meta<typeof Live2DModel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    render: (args) => {
        return <Live2DModel {...args} />;
    },
    args: {},
};

export const WithCode: Story = {
    render: (args) => {
        // here comes the code
        return <Live2DModel {...args} />;
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
