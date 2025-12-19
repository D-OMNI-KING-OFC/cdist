// src/builder.register.tsx
import { Builder } from '@builder.io/react';
import './builder.setup'; // ensure builder is initialized
import React from 'react';

// import wrappers you just created
import LandingWrapper from './builder-wrappers/LandingWrapper';
import DashboardWrapper from './builder-wrappers/DashboardWrapper';
import BrandDashboardWrapper from './builder-wrappers/BrandDashboardWrapper';
import InfluencerDashboardWrapper from './builder-wrappers/InfluencerDashboardWrapper';
import RoleSelectionWrapper from './builder-wrappers/RoleSelectionWrapper';
import AuthWrapper from './builder-wrappers/AuthWrapper';
import BrandSubmissionsWrapper from './builder-wrappers/BrandSubmissionsWrapper';
import ProfileWrapper from './builder-wrappers/ProfileWrapper';
import CampaignCreationWrapper from './builder-wrappers/CampaignCreationWrapper';
import ViewActiveCampaignsWrapper from './builder-wrappers/ViewActiveCampaignsWrapper';
import MTSV2Wrapper from './builder-wrappers/MTSV2Wrapper';

// helper registration fn
function reg(name: string, component: any, inputs: any[] = []) {
  Builder.registerComponent(component, { name, inputs });
}

// register each component (inputs are what designers can edit in Builder)
reg('Landing Page', LandingWrapper, [
  { name: 'lang', type: 'string', defaultValue: 'en' },
  { name: 'heroTitle', type: 'text', defaultValue: 'Find creators, launch campaigns' },
  { name: 'heroSubtitle', type: 'text', defaultValue: 'Manage influencer partnerships — fast and secure.' },
  { name: 'ctaText', type: 'string', defaultValue: 'Get Started' },
]);

reg('Dashboard (Shell)', DashboardWrapper, [
  { name: 'userRole', type: 'string', defaultValue: '' },
]);

reg('Brand Dashboard', BrandDashboardWrapper, [
  { name: 'showPayments', type: 'boolean', defaultValue: true },
]);

reg('Influencer Dashboard', InfluencerDashboardWrapper, [
  { name: 'showEarnings', type: 'boolean', defaultValue: true },
]);

reg('RoleSelection', RoleSelectionWrapper, [{ name: 'preselect', type: 'string', defaultValue: '' }]);

reg('Auth', AuthWrapper, [
  { name: 'mode', type: 'string', enum: ['login', 'signup'], defaultValue: 'login' },
  { name: 'redirectTo', type: 'string', defaultValue: '/dashboard' },
]);

reg('Brand Submissions', BrandSubmissionsWrapper, [
  { name: 'title', type: 'string', defaultValue: 'Brand Submissions' },
]);

reg('Profile', ProfileWrapper, [
  { name: 'showEmail', type: 'boolean', defaultValue: true },
]);

reg('Campaign Creation', CampaignCreationWrapper, [
  { name: 'mode', type: 'string', enum: ['create', 'edit'], defaultValue: 'create' },
]);

reg('View Active Campaigns', ViewActiveCampaignsWrapper, [
  { name: 'pageSize', type: 'number', defaultValue: 10 },
  { name: 'showFilters', type: 'boolean', defaultValue: true },
]);

reg('MTSV2 - Influencer Search', MTSV2Wrapper, [
  { name: 'query', type: 'string', defaultValue: '' },
  { name: 'pageSize', type: 'number', defaultValue: 20 },
  { name: 'showFilters', type: 'boolean', defaultValue: true },
]);

// export a no-op to ensure the file is importable
export default {};
