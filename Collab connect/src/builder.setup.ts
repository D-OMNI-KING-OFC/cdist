// src/builder.setup.ts
import { builder } from '@builder.io/react';

// Initialize builder with Vite env variable
const key = (import.meta as any).env?.VITE_BUILDER_PUBLIC_API_KEY || 'REPLACE_WITH_KEY';
builder.init(key);

// Optional: set default model versioning if you use it
// builder.apiVersion = 'v3';

export default builder;
