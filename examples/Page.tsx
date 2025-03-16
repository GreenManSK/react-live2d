import type {PropsWithChildren} from 'react';
import {useEffect} from 'react';

type PageProps = {
    title: string;
};

export const Page = ({title, children}: PropsWithChildren<PageProps>) => {
    useEffect(() => {
        document.title = title;
    }, [title]);
    return children;
};
