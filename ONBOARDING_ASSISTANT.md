# RMAP Onboarding Assistant Specification

## Executive Summary

A context-aware, intelligent onboarding assistant for the RMAP platform that provides personalized guidance based on user location, role, subscription tier, and expertise level. The assistant is always available but non-intrusive, helping users navigate complex workflows while preparing them for next steps.

## Core Requirements

### 1. Availability & Interaction
- **Always Available**: Persistent UI element that can be minimized/expanded
- **Non-Intrusive**: Respects user preferences and workflow
- **Context-Aware**: Knows current location, workflow state, and user intent
- **Proactive**: Suggests next actions based on context
- **Forward-Thinking**: Prepares users for upcoming steps

### 2. Multi-Tenant Considerations
- Respects tenant boundaries and data isolation
- Adapts to subscription tier limitations
- Shows/hides features based on plan
- Tracks usage against tenant limits
- Personalizes based on industry/vertical

### 3. User Segmentation
- **Roles**: owner, admin, manager, member, viewer
- **Expertise**: beginner, intermediate, expert
- **Intent**: demo/trial, onboarding, daily use, troubleshooting
- **Tenure**: first day, first week, first month, experienced

## Technical Architecture

### Component Structure

```typescript
// Core Assistant State (Zustand store)
interface AssistantState {
  // UI State
  isMinimized: boolean
  position: 'bottom-right' | 'bottom-left' | 'sidebar'
  theme: 'light' | 'dark' | 'auto'
  size: 'compact' | 'expanded'
  status: 'idle' | 'playing' | 'paused' // Prevents conflicts
  
  // Context State
  currentContext: AssistantContext
  userProfile: UserOnboardingProfile
  
  // Demo Mode
  isDemoMode: boolean
  demoScenario?: DemoScenario
  
  // Guide Management
  activeGuide?: Guide
  guideQueue: string[] // IDs of guides waiting
  completedGuides: Set<string>
  
  // Actions
  actions: AssistantActions
}

interface AssistantContext {
  currentView: string // route path
  workflow?: WorkflowType
  userIntent: InferredIntent
  availableActions: Action[]
  nextSteps: Step[]
  completionStatus: CompletionMetrics
  anchorElement?: HTMLElement // Current focus element
}

interface UserOnboardingProfile {
  userId: string
  tenantId: string
  role: UserRole
  expertiseLevel: 'beginner' | 'intermediate' | 'expert'
  preferredLearningStyle: 'visual' | 'text' | 'interactive'
  completedMilestones: string[]
  dismissedGuides: string[]
  lastInteraction: Date
}
```

### Content Management Strategy

#### Decoupled Content Architecture (Critical)

Instead of hardcoding guide content in components, use a centralized content registry:

```json
// guides/content.json
{
  "dashboard-welcome": {
    "id": "dashboard-welcome",
    "trigger": "route",
    "route": "/dashboard",
    "userExpertise": ["beginner"],
    "steps": [
      {
        "title": "Welcome to RMAP!",
        "content": "This is your command center for retail media campaigns.",
        "selector": "#dashboard-header",
        "action": "highlight"
      },
      {
        "title": "Workflow Selection",
        "content": "Choose a workflow to begin planning your campaigns.",
        "selector": ".workflow-grid",
        "action": "spotlight"
      }
    ],
    "nextGuides": ["create-first-campaign"]
  },
  
  "create-first-campaign": {
    "id": "create-first-campaign",
    "trigger": "component",
    "componentId": "campaign-creator",
    "steps": [
      {
        "title": "Create Your First Campaign",
        "content": "Let's set up your first retail media campaign.",
        "selector": "#campaign-name-input",
        "action": "focus"
      }
    ]
  }
}
```

#### Guide Registration Pattern

```typescript
// Refactored component usage
const Dashboard: React.FC = () => {
  // Register guide by ID only, not content
  useRegisterGuide('dashboard-welcome', 'onMount');
  
  return (
    <div id="dashboard-header">
      {/* Component content */}
    </div>
  );
};

// Hook implementation
export const useRegisterGuide = (
  guideId: string, 
  activation: 'onMount' | 'onClick' | 'manual'
) => {
  const { registerGuide, startGuide, status } = useAssistantStore();
  const guideContent = useGuideContent(guideId); // Fetch from registry
  
  useEffect(() => {
    if (!guideContent) return;
    
    registerGuide(guideId, guideContent);
    
    if (activation === 'onMount' && status === 'idle') {
      startGuide(guideId);
    }
  }, [guideId, activation, status]);
  
  return {
    triggerGuide: () => status === 'idle' && startGuide(guideId)
  };
};
```

### Context Detection Engine

```typescript
// Route-based context detection
const contextMap: ContextMap = {
  '/dashboard': {
    workflow: null,
    suggestedActions: ['view-workflows', 'check-usage'],
    nextSteps: ['select-workflow', 'invite-team']
  },
  '/workflows/retail-media': {
    workflow: 'retail_media',
    suggestedActions: ['create-audience', 'plan-campaign'],
    nextSteps: ['define-segments', 'set-budget']
  },
  '/settings/team': {
    workflow: null,
    suggestedActions: ['invite-member', 'set-permissions'],
    nextSteps: ['configure-sso', 'setup-integrations']
  }
};

// Context provider
const AssistantProvider: React.FC = ({ children }) => {
  const location = useLocation();
  const { user, tenant } = useAuth();
  
  useEffect(() => {
    const context = detectContext(location.pathname, user, tenant);
    updateAssistantContext(context);
    
    // Check for available guides for this context
    const availableGuides = findGuidesForContext(context);
    if (availableGuides.length > 0 && !hasSeenGuide(availableGuides[0])) {
      queueGuide(availableGuides[0]);
    }
  }, [location.pathname]);
  
  return <>{children}</>;
};
```

### Guide Activation Hierarchy

To prevent conflicts between multiple guide triggers:

1. **Priority Levels**:
   - P0: User-initiated (manual trigger)
   - P1: Error recovery guides
   - P2: Component-specific onMount guides
   - P3: Route-based page tours
   - P4: Proactive suggestions

2. **Conflict Resolution**:
   ```typescript
   const startGuide = (guideId: string, priority: number = 3) => {
     const state = get();
     
     // Don't interrupt active guides unless higher priority
     if (state.status === 'playing') {
       if (priority <= state.activeGuide?.priority) {
         state.guideQueue.push(guideId);
         return false;
       }
       // Higher priority - pause current and start new
       pauseGuide();
     }
     
     set({ 
       status: 'playing',
       activeGuide: guides[guideId]
     });
     return true;
   };
   ```

### Demo Mode Architecture

#### Demo Scenario Runner

```typescript
// demo/scenarios.ts
export interface DemoStep {
  action: 'navigate' | 'click' | 'input' | 'wait' | 'guide' | 'highlight'
  target?: string // selector or route
  value?: any
  duration?: number
  narration?: string
}

export const retailMediaDemo: DemoScenario = {
  name: "Retail Media Campaign Setup",
  persona: "Marketing Manager",
  duration: "3 minutes",
  steps: [
    { 
      action: 'navigate', 
      target: '/dashboard',
      narration: "Welcome to RMAP's dashboard"
    },
    { 
      action: 'wait', 
      duration: 1000 
    },
    { 
      action: 'guide', 
      value: 'dashboard-welcome' 
    },
    {
      action: 'highlight',
      target: '.workflow-retail-media',
      narration: "Select the Retail Media workflow"
    },
    {
      action: 'click',
      target: '.workflow-retail-media'
    },
    {
      action: 'input',
      target: '#campaign-name',
      value: 'Summer Sale 2024',
      narration: "Name your campaign"
    }
  ]
};

// Demo runner component
const DemoRunner: React.FC<{ scenario: DemoScenario }> = ({ scenario }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { startGuide, setDemoMode } = useAssistantStore();
  
  useEffect(() => {
    setDemoMode(true);
    runStep(scenario.steps[currentStep]);
  }, [currentStep]);
  
  const runStep = async (step: DemoStep) => {
    switch (step.action) {
      case 'navigate':
        navigate(step.target);
        break;
      case 'guide':
        startGuide(step.value);
        break;
      case 'click':
        const element = document.querySelector(step.target);
        element?.click();
        break;
      case 'input':
        const input = document.querySelector(step.target) as HTMLInputElement;
        if (input) {
          // Simulate typing
          for (let i = 0; i <= step.value.length; i++) {
            await sleep(50);
            input.value = step.value.substring(0, i);
          }
        }
        break;
    }
    
    // Auto-advance after step completes
    setTimeout(() => {
      if (currentStep < scenario.steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }, step.duration || 2000);
  };
  
  return null; // Runner is invisible
};
```

### Progressive Disclosure Levels

```typescript
interface ExpertiseAdaptation {
  beginner: {
    guideDetail: 'verbose',
    showTooltips: true,
    autoTriggerGuides: true,
    highlightNewFeatures: true,
    showBestPractices: true,
    terminology: 'simplified'
  },
  intermediate: {
    guideDetail: 'balanced',
    showTooltips: false,
    autoTriggerGuides: false,
    highlightNewFeatures: true,
    showBestPractices: false,
    terminology: 'standard'
  },
  expert: {
    guideDetail: 'minimal',
    showTooltips: false,
    autoTriggerGuides: false,
    highlightNewFeatures: false,
    showBestPractices: false,
    terminology: 'technical'
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Zustand store with React Context
- [ ] Implement basic Assistant UI component
- [ ] Create guide content registry structure
- [ ] Build useRegisterGuide hook
- [ ] Implement minimize/expand functionality

### Phase 2: Context Engine (Week 3-4)
- [ ] Build route-based context detection
- [ ] Implement guide triggering logic
- [ ] Add conflict resolution for multiple guides
- [ ] Create guide queue management
- [ ] Track completed guides per user

### Phase 3: Content & Guides (Week 5-6)
- [ ] Create guide content for key workflows
- [ ] Implement step-by-step navigation
- [ ] Add element highlighting (Floating UI)
- [ ] Build tooltip and popover variants
- [ ] Test guide flows end-to-end

### Phase 4: Demo Mode (Week 7-8)
- [ ] Build demo scenario runner
- [ ] Create sales demo scenarios
- [ ] Add sandbox data generation
- [ ] Implement reset functionality
- [ ] Add demo analytics

### Phase 5: Intelligence & Analytics (Week 9-10)
- [ ] Add user behavior tracking
- [ ] Implement expertise level detection
- [ ] Build personalization engine
- [ ] Create analytics dashboard
- [ ] A/B testing framework

## Success Metrics

### Quantitative
- **Activation Rate**: % of new users completing first workflow
- **Time to Value**: Minutes to first successful campaign
- **Feature Discovery**: Features used within first 7 days
- **Support Reduction**: % decrease in onboarding tickets
- **Guide Completion**: % of started guides completed

### Qualitative
- User satisfaction scores
- Ease of onboarding feedback
- Feature request patterns
- Demo conversion rates
- Team adoption metrics

## Security & Performance

### Security
- No sensitive data in guide content
- Respect tenant boundaries in demo mode
- Sanitize all user-provided content
- Audit log guide interactions

### Performance
- Lazy load guide content
- Virtual scrolling for long guides
- Debounce context detection (100ms)
- Cache completed guide states
- Maximum 50KB bundle size impact

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation (Tab, Arrow keys, Escape)
- Screen reader announcements
- Focus management
- Reduced motion support
- High contrast mode support

## Future Enhancements

1. **AI-Powered Suggestions**: Use ML to predict next best action
2. **Video Guides**: Embed video tutorials in guides
3. **Collaborative Onboarding**: Team members can guide each other
4. **Custom Branding**: White-label assistant for enterprise
5. **Multi-language Support**: Localized guide content
6. **Voice Assistant**: Audio guidance option
7. **Mobile App Integration**: Consistent experience across platforms

## Testing Strategy

### Unit Tests
- Guide registration logic
- Context detection accuracy
- State management actions
- Content loading

### Integration Tests
- Guide flow completion
- Multi-tab synchronization
- Demo scenario execution
- Route change handling

### E2E Tests
- Complete onboarding journey
- Demo mode full cycle
- Conflict resolution scenarios
- Performance benchmarks

## Conclusion

This onboarding assistant will significantly reduce time-to-value for new RMAP users while providing ongoing support for feature discovery and best practices. The decoupled content architecture ensures maintainability, while the progressive disclosure system adapts to user expertise levels. Demo mode enables powerful sales enablement, and the context-aware engine provides intelligent, timely guidance throughout the user journey.