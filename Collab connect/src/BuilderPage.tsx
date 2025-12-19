// src/pages/BuilderPage.tsx
import  { useEffect, useState } from 'react';
import { BuilderComponent, builder } from '@builder.io/react';
import './builder.setup';

export default function BuilderPage() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    // load content for the current path
    builder
      .get('page', { userAttributes: { urlPath: window.location.pathname } })
      .promise()
      .then((res: any) => setContent(res))
      .catch(() => setContent(null));
  }, [typeof window !== 'undefined' ? window.location.pathname : '/']);

  if (!content) return <div style={{ padding: 40 }}>Loading Builder content…</div>;
  return <BuilderComponent model="page" content={content} />;
}
